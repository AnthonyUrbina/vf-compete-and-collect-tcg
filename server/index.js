require('dotenv/config');
const express = require('express');
const errorMiddleware = require('./error-middleware');
const authorizationMiddleware = require('./authorization-middleware');
const pg = require('pg');
const argon2 = require('argon2');
const ClientError = require('./client-error');
const app = express();
const path = require('node:path');
const publicPath = path.join(__dirname, 'public');
const jwt = require('jsonwebtoken');
const shuffle = require('lodash.shuffle');
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

if (process.env.NODE_ENV === 'development') {
  app.use(require('./dev-middleware')(publicPath));
}

app.use(express.static(publicPath));
app.use(express.json());

app.post('/api/auth/sign-up', (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password) {
    throw new ClientError(400, 'username and password are required fields');
  }
  argon2.hash(password)
    .then(hashedPassword => {

      const sql = `
        insert into "users" ("username", "hashedPassword")
             values ($1, $2)
          returning "userId", "username";
      `;

      const params = [username, hashedPassword];
      db.query(sql, params)
        .then(result => {
          res.status(201).json(result.rows[0]);
        })
        .catch(err => next(err));
    })
    .catch(err => next(err));
});

app.post('/api/auth/sign-in', (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password) {
    throw new ClientError(400, 'username and password are required fields');
  }

  const sql = `
    select "userId",
           "hashedPassword"
      from "users"
     where "username" = $1
  `;

  const params = [username];
  db.query(sql, params)
    .then(result => {
      const { userId, hashedPassword } = result.rows[0];
      if (!userId) {
        throw new ClientError(401, 'Invalid login');
      }

      argon2.verify(hashedPassword, password)
        .then(isMatching => {
          if (!isMatching) {
            throw new ClientError(401, 'Invalid login');
          }
          const payload = { username, userId };
          const token = jwt.sign(payload, process.env.TOKEN_SECRET);
          res.status(200).json({ token, user: payload });
        })
        .catch(err => next(err));
    })
    .catch(err => next(err));

});

app.patch('/api/games/:gameId', (req, res, next) => {
  const { gameId } = req.params;
  const state = req.body;

  const sql = `
    update "games"
       set "state" = $2
     where "gameId" = $1
 returning "state"
  `;

  const params = [gameId, state];
  db.query(sql, params)
    .then(result => {
      const { state } = result.rows[0];
      const { roomId, battlefield, battle } = state;
      const players = getUsernames(roomId);
      // const { player1, player2 } = players;
      // const player1FlipsRemaining = state[player1 + 'FlipsRemaining'];
      // const player2FlipsRemaining = state[player2 + 'FlipsRemaining'];
      const { stage } = battle;
      if (!result.rows[0]) {
        throw new ClientError(400, 'this gameId does not exist');
      }

      for (const username in players) {
        const playerDeck = state[players[username] + 'Deck'];
        const playerWinPile = state[players[username] + 'WinPile'];
        const player = players[username];
        if (!playerDeck.length && playerWinPile.length) {
          outOfCards(state, playerDeck, playerWinPile, player);
        } else if (!playerDeck.length && !playerWinPile.length && !stage) {
          const loser = players[username];
          outOfCards(state, playerDeck, playerWinPile, player, loser);
        }
      }
      io.to(roomId).emit('flip-card', state);
      res.status(200).json(state);
      if (Object.keys(battlefield).length === 2 || (stage && Object.keys(battlefield).length === 2)) {
        setTimeout(decideFaceoffWinner, 500, state);
      }

    })
    .catch(err => next(err));
});

app.use(authorizationMiddleware);

app.get('/api/games/retrieve/:opponent', (req, res, next) => {
  const { opponent } = req.params;
  const token = req.headers['x-access-token'];

  const payload = jwt.verify(token, process.env.TOKEN_SECRET);
  const { userId } = payload;

  const sql = `
    select "userId"
      from "users"
     where "username" = $1
  `;
  const params = [opponent];

  db.query(sql, params)
    .then(result => {
      if (!result.rows[0]) {
        throw new ClientError(400, 'this user does not exist');
      }
      const opponentId = result.rows[0].userId;

      const sql = `
        select "users"."username",
              "games"."state",
              "games"."gameId"
          from "games"
    inner join "users"
            on "challenger" = "userId"
            or "opponent" = "userId"
        where "isActive" = 'true'
          and (
            ("challenger" = $1) and ("opponent" = $2) or
            ("challenger" = $2) and ("opponent" = $1)
            )
          limit 1;
      `;

      const params = [userId, opponentId];
      db.query(sql, params)
        .then(result => {
          if (!result.rows[0]) {
            throw new ClientError(400, 'this user is not in any active games');
          }
          res.status(200).json(result.rows);
        })
        .catch(err => next(err));

    })
    .catch(err => next(err));
});

app.use(errorMiddleware);

const onlinePlayers = {};

io.on('connection', socket => {
  const { roomId } = socket.handshake.query;
  const { token } = socket.handshake.auth;

  if (token) {
    const payload = jwt.verify(token, process.env.TOKEN_SECRET);
    const { username, userId } = payload;
    onlinePlayers[socket.id] = username;
    socket.userId = userId;
    socket.nickname = username;
  } else {
    throw new ClientError(401, 'authentication required');
  }

  if (roomId) {
    socket.join(roomId);
  }

  io.emit('online-players', onlinePlayers);

  socket.on('disconnect', () => {
    delete onlinePlayers[socket.id];
    io.emit('user disconnected', socket.id);
  });

  socket.on('invite-sent', opponentSocketId => {
    const challengerSocketId = socket.id;
    const challengerId = socket.userId;
    let challengerUsername;
    let opponentUsername;

    for (const key in onlinePlayers) {
      if (key === challengerSocketId) {
        challengerUsername = onlinePlayers[key];
      }
      if (key === opponentSocketId) {
        opponentUsername = onlinePlayers[key];
      }
    }

    const roomId = [challengerUsername, opponentUsername].sort().join('-');
    const inviteInfo = { roomId, challengerSocketId, challengerId, challengerUsername };
    socket.join(roomId);
    socket.to(opponentSocketId).emit('invite-received', inviteInfo);
  });

  socket.on('invite-canceled', opponentSocketId => {
    const challengerSocketId = socket.id;
    let challengerUsername;
    let opponentUsername;

    for (const key in onlinePlayers) {
      if (key === challengerSocketId) {
        challengerUsername = onlinePlayers[key];
      }
      if (key === opponentSocketId) {
        opponentUsername = onlinePlayers[key];
      }
    }

    const roomId = [challengerUsername, opponentUsername].sort().join('-');
    socket.leave(roomId);
    socket.to(opponentSocketId).emit('challenger-canceled', `invite from ${challengerUsername} has been canceled`);
  });

  socket.on('invite-accepted', inviteInfo => {
    const { challengerUsername, challengerSocketId, challengerId } = inviteInfo;
    const deck = getDeck(rank, suit);
    const shuffled = shuffle(deck);
    const players = [
      { name: socket.nickname, deck: [] },
      { name: challengerUsername, deck: [] }
    ];

    dealer(shuffled, players);

    const state = {
      [challengerUsername + 'Deck']: players[0].deck,
      [socket.nickname + 'Deck']: players[1].deck,
      [challengerUsername + 'WinPile']: [],
      [socket.nickname + 'WinPile']: [],
      [challengerUsername + 'FaceUp']: null,
      [socket.nickname + 'FaceUp']: null,
      [challengerUsername + 'FlipsRemaining']: 0,
      [socket.nickname + 'FlipsRemaining']: 0,
      [challengerUsername + 'BattlePile']: [],
      [socket.nickname + 'BattlePile']: [],
      battle: { stage: 0 },
      showBattleModal: false,
      battlefield: {},
      faceUpQueue: []

    };

    const JSONstate = JSON.stringify(state);

    const sql = `
      insert into "games" ("challenger", "opponent", "state", "isActive")
           values ($1, $2, $3, 'true')
        returning *;
    `;

    const params = [challengerId, socket.userId, JSONstate];
    db.query(sql, params)
      .then(result => {
        socket.to(challengerSocketId).emit('opponent-joined', inviteInfo);
      })
      .catch(err => console.error(err));
  });
  socket.on('invite-declined', roomId => {
    socket.to(roomId).emit('opponent-declined');
  });
});

const rank = ['ace', 2, 3, 4, 5, 6, 7, 8, 9, 10, 'jack', 'queen', 'king'];
const suit = ['clubs', 'diamonds', 'hearts', 'spades'];

function getDeck(rank, suit) {
  const deck = [];
  let card = {};
  for (let i = 0; i < suit.length; i++) {
    for (let j = 0; j < rank.length; j++) {
      card.suit = suit[i];
      card.rank = rank[j];
      deck.push(card);
      card = {};
    }
  }
  return deck;
}

function dealer(shuffled, players) {
  // players[0].deck = shuffled.slice(0, 26);
  // players[1].deck = shuffled.slice(26, 52);
  players[0].deck = [
    { suit: 'clubs', rank: 9 },
    { suit: 'clubs', rank: 8 },
    { suit: 'clubs', rank: 7 },
    { suit: 'clubs', rank: 6 },
    { suit: 'clubs', rank: 5 },
    { suit: 'hearts', rank: 9 },
    { suit: 'clubs', rank: 9 },
    { suit: 'clubs', rank: 'ace' },
    { suit: 'clubs', rank: 2 },
    { suit: 'clubs', rank: 3 },
    { suit: 'clubs', rank: 4 },
    { suit: 'clubs', rank: 8 },
    { suit: 'clubs', rank: 'jack' }

  ];
  players[1].deck = [
    { suit: 'spades', rank: 9 },
    { suit: 'spades', rank: 8 },
    { suit: 'spades', rank: 7 },
    { suit: 'spades', rank: 6 },
    { suit: 'spades', rank: 5 },
    { suit: 'hearts', rank: 9 },
    { suit: 'diamonds', rank: 9 },
    { suit: 'spades', rank: 'ace' },
    { suit: 'spades', rank: 2 },
    { suit: 'spades', rank: 3 },
    { suit: 'spades', rank: 4 },
    { suit: 'spades', rank: 8 },
    { suit: 'hearts', rank: 'queen' }
  ];
}

// function genRandomNumber() {
//   const randomNumber = Math.floor(Math.random() * 10);
//   return randomNumber;
// }

function getUsernames(roomId) {
  const players = {
    player1: null,
    player2: null
  };
  const splitUsernames = roomId.split('-');
  players.player1 = splitUsernames[0];
  players.player2 = splitUsernames[1];
  return players;
}

function decideFaceoffWinner(state) {
  const { roomId, battlefield } = state;
  const players = getUsernames(roomId);
  let bestRank = 0;
  let winner;
  let tie = false;
  for (const key in battlefield) {
    if (battlefield[key].rank === 'jack') {
      battlefield[key].rank = 11;
    } else if (battlefield[key].rank === 'queen') {
      battlefield[key].rank = 12;
    } else if (battlefield[key].rank === 'king') {
      battlefield[key].rank = 13;
    } else if (battlefield[key].rank === 'ace') {
      battlefield[key].rank = 14;
    }
    if (battlefield[key].rank > bestRank) {
      bestRank = battlefield[key].rank;
      winner = key;
    } else if (battlefield[key].rank === bestRank) {
      tie = true;
    }
  }

  // console.assert(!winner, 'there is a winner!');
  // console.log(winner);
  tie ? handleFaceoffTie(state, players) : handleFaceoffWin(winner, state, players);

}

function handleFaceoffTie(state, players) {
  // console.log('handleFacoffTie is being called');
  // const { stage } = state.battle;
  const { gameId } = state;
  const { player1, player2 } = players;

  state.battlefield = {};
  state.battle.stage++;
  state.showBattleModal = true;
  state[player1 + 'FlipsRemaining'] = 4;
  state[player2 + 'FlipsRemaining'] = 4;

  const sql = `
    update "games"
       set "state" = $2
     where "gameId" = $1
 returning "state"
    `;

  const params = [gameId, state];
  db.query(sql, params)
    .then(result => {
      const { state } = result.rows[0];
      const { roomId } = state;
      if (!result.rows[0]) {
        throw new ClientError(400, 'this gameId does not exist');
      }
      io.to(roomId).emit('battle-staged', state);
    });

}

function handleFaceoffWin(winner, state, players) {
  // winpiles should be created upon initial state creation
  // if (!state[winner + 'WinPile']) {
  //   state[winner + 'WinPile'] = [];
  // }
  const winnerWinPile = state[winner + 'WinPile'];
  const { player1, player2 } = players;
  const { gameId } = state;
  const player1FaceUp = state[player1 + 'FaceUp'];
  const player2FaceUp = state[player2 + 'FaceUp'];
  const player1BattlePile = state[player1 + 'BattlePile'];
  const player2BattlePile = state[player2 + 'BattlePile'];
  const activeCards = [];

  player2FaceUp.map(card => activeCards.push(card)
  );
  player1FaceUp.map(card => activeCards.push(card)
  );

  state[player2 + 'FaceUp'] = null;
  state[player1 + 'FaceUp'] = null;
  state[player1 + 'BattlePile'] = [];
  state[player2 + 'BattlePile'] = [];
  state.battlefield = {};

  const sortedWinings = activeCards.sort((card1, card2) => card1.rank - card2.rank);
  let newWinnerDeck = [];
  if (player1BattlePile && player2BattlePile) {
    const battleCards = [];

    player2BattlePile.map(card => battleCards.push(card)
    );
    player1BattlePile.map(card => battleCards.push(card)
    );
    const sortedBattleCards = battleCards.sort((card1, card2) => card1.rank - card2.rank);
    newWinnerDeck = winnerWinPile.concat(sortedWinings.concat(sortedBattleCards));
    state.battle.stage = 0;
  } else {
    newWinnerDeck = winnerWinPile.concat(sortedWinings);
  }

  state[winner + 'WinPile'] = newWinnerDeck;

  const sql = `
    update "games"
       set "state" = $2
     where "gameId" = $1
 returning "state"
    `;

  const params = [gameId, state];
  db.query(sql, params)
    .then(result => {
      const { state } = result.rows[0];
      const { roomId } = state;
      if (!result.rows[0]) {
        throw new ClientError(400, 'this gameId does not exist');
      }
      io.to(roomId).emit('winner-decided', state);
      for (const username in players) {
        const playerDeck = state[players[username] + 'Deck'];
        const playerWinPile = state[players[username] + 'WinPile'];
        const player = players[username];

        if (!playerDeck.length && playerWinPile.length) {
          outOfCards(state, playerDeck, playerWinPile, player);
        } else if (!playerDeck.length && !playerWinPile.length) {
          const loser = players[username];
          outOfCards(state, playerDeck, playerWinPile, player, loser);
        }
      }
    });
}

function outOfCards(state, playerDeck, playerWinPile, player, loser) {
  const { gameId, roomId } = state;
  if (!playerDeck.length && playerWinPile.length) {
    state[player + 'Deck'] = playerWinPile;
    state[player + 'WinPile'] = [];

    const sql = `
        update "games"
           set "state" = $2
         where "gameId" = $1
     returning "state"
    `;

    const params = [gameId, state];
    db.query(sql, params)
      .then(result => {
        io.to(roomId).emit('deck-replaced', state);
      });
  } else if (loser) {
    state.loser = loser;
    const sql = `
        update "games"
           set "state" = $2,
               "isActive" = 'false'
         where "gameId" = $1
     returning "state"
    `;

    const params = [gameId, state];
    db.query(sql, params)
      .then(result => {
        io.to(roomId).emit('game-over', state);
      });
  }
}

server.listen(process.env.PORT, () => {
  process.stdout.write(`\n\napp listening on port ${process.env.PORT}\n\n`);
});
