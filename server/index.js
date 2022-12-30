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
      const { stage } = battle;
      if (!result.rows[0]) {
        throw new ClientError(400, 'this gameId does not exist');
      }

      for (const username in players) {
        const player = players[username];
        const playerDeck = state[player + 'Deck'];
        const playerWinPile = state[player + 'WinPile'];
        const playerFlipsRemaining = state[player + 'FlipsRemaining'];
        const loser = player;

        if (!playerDeck.length && playerWinPile.length) {
          outOfCards(state, playerDeck, playerWinPile, player);
        } else if (!playerDeck.length && !playerWinPile.length && playerFlipsRemaining && !Object.keys(battlefield).length) {
          outOfCards(state, playerDeck, playerWinPile, player, loser);
        }
      }
      io.to(roomId).emit('flip-card', state);
      res.status(200).json(state);
      if (Object.keys(battlefield).length === 2 || (stage && Object.keys(battlefield).length === 2)) {
        setTimeout(decideWinner, 850, state);
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

  socket.on('connect_error', err => console.error(err));

  socket.on('invite-accepted', inviteInfo => {
    const { challengerUsername, challengerSocketId, challengerId } = inviteInfo;
    const deck = getDeck();
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

  socket.on('invite-accepted-retry', opponent => {
    const challengerUsername = opponent;
    const challengerSocketId = getSocketId(challengerUsername);
    let challengerId;

    const sql = `
    select "userId"
      from "users"
     where "username" = $1
  `;

    const params = [challengerUsername];
    db.query(sql, params)
      .then(result => {
        if (!result.rows[0]) {
          throw new ClientError(400, 'this user does not exist');
        }
        challengerId = result.rows[0].userId;
        const roomId = [challengerUsername, socket.nickname].sort().join('-');
        const inviteInfo = { challengerUsername, challengerSocketId, challengerId, roomId };
        const deck = getDeck();
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
      })
      .catch(err => console.error(err));
  });

  socket.on('invite-declined', roomId => {
    socket.to(roomId).emit('opponent-declined');
  });
});

function dealer(shuffled, players) {
  players[0].deck = shuffled.slice(0, 26);
  players[1].deck = shuffled.slice(26, 52);
}

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

function decideWinner(state) {
  const { roomId, battlefield } = state;
  const players = getUsernames(roomId);
  let bestScore = 0;
  let winner;
  let tie = false;
  for (const key in battlefield) {
    if (battlefield[key].score === 'jack') {
      battlefield[key].score = 11;
    } else if (battlefield[key].score === 'queen') {
      battlefield[key].score = 12;
    } else if (battlefield[key].score === 'king') {
      battlefield[key].score = 13;
    } else if (battlefield[key].score === 'ace') {
      battlefield[key].score = 14;
    }
    if (battlefield[key].score > bestScore) {
      bestScore = battlefield[key].score;
      winner = key;
    } else if (battlefield[key].score === bestScore) {
      tie = true;
    }
  }

  tie ? handleTie(state, players) : handleWin(winner, state, players);

}

function handleTie(state, players) {

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

function handleWin(winner, state, players) {
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
  state.faceUpQueue = [];
  state.battlefield = {};

  const sortedWinings = activeCards.sort((card1, card2) => card1.score - card2.score);
  let newWinnerDeck = [];
  if (player1BattlePile && player2BattlePile) {
    const battleCards = [];

    player2BattlePile.map(card => battleCards.push(card)
    );
    player1BattlePile.map(card => battleCards.push(card)
    );
    const sortedBattleCards = battleCards.sort((card1, card2) => card1.score - card2.score);
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

function getDeck() {
  const deck = [
    { name: 'accountable-anteater', score: 65, aura: 20, skill: 24, stamina: 21 },
    { name: 'ambitious-angel', score: 68, aura: 23, skill: 21, stamina: 24 },
    { name: 'amiable-anchovy', score: 52, aura: 20, skill: 19, stamina: 13 },
    { name: 'arbitraging-admiral', score: 73, aura: 24, skill: 25, stamina: 24 },
    { name: 'bad-ass-bulldog', score: 53, aura: 17, skill: 15, stamina: 21 },
    { name: 'bad-intentions', score: 58, aura: 17, skill: 22, stamina: 19 },
    { name: 'balanced-beatle', score: 60, aura: 20, skill: 20, stamina: 20 },
    { name: 'be-the-bigger-person', score: 67, aura: 24, skill: 21, stamina: 22 },
    { name: 'befuddled-burglar', score: 73, aura: 25, skill: 25, stamina: 24 },
    { name: 'boisterous-beaver', score: 57, aura: 20, skill: 16, stamina: 21 },
    { name: 'bold-as-fuck-bat', score: 59, aura: 21, skill: 20, stamina: 18 },
    { name: 'boss-bobcat', score: 68, aura: 22, skill: 24, stamina: 22 },
    { name: 'bubbly-buzzard', score: 51, aura: 18, skill: 16, stamina: 17 },
    { name: 'bullish-bull', score: 69, aura: 24, skill: 21, stamina: 24 },
    { name: 'capable-caterpillar', score: 55, aura: 18, skill: 18, stamina: 19 },
    { name: 'caring-camel', score: 56, aura: 19, skill: 16, stamina: 21 },
    { name: 'chill-chinchilla', score: 60, aura: 19, skill: 20, stamina: 21 },
    { name: 'common-sense-cow', score: 62, aura: 20, skill: 22, stamina: 20 },
    { name: 'compassionate-catfish', score: 63, aura: 20, skill: 22, stamina: 21 },
    { name: 'competitive-clown', score: 65, aura: 19, skill: 23, stamina: 23 },
    { name: 'considerate-cowboy', score: 69, aura: 23, skill: 23, stamina: 23 },
    { name: 'consistent-cougar', score: 58, aura: 17, skill: 17, stamina: 24 },
    { name: 'content-condor', score: 64, aura: 20, skill: 22, stamina: 22 },
    { name: 'courageous-cockatoo', score: 53, aura: 17, skill: 20, stamina: 16 },
    { name: 'curious-crane', score: 66, aura: 23, skill: 21, stamina: 22 },
    { name: 'daring-dragonfly', score: 55, aura: 20, skill: 15, stamina: 20 },
    { name: 'determined-dolphin', score: 69, aura: 21, skill: 24, stamina: 24 },
    { name: 'dialed-in-dog', score: 63, aura: 20, skill: 23, stamina: 20 },
    { name: 'diamond-hands-hen', score: 64, aura: 20, skill: 24, stamina: 20 },
    { name: 'dope-dodo', score: 50, aura: 20, skill: 17, stamina: 13 },
    { name: 'driven-dragon', score: 65, aura: 21, skill: 23, stamina: 21 },
    { name: 'eager-eagle', score: 62, aura: 21, skill: 19, stamina: 22 },
    { name: 'earnest-ermine', score: 52, aura: 16, skill: 20, stamina: 16 },
    { name: 'empathy-elephant', score: 73, aura: 24, skill: 25, stamina: 24 },
    { name: 'enamoured-emu', score: 54, aura: 17, skill: 17, stamina: 20 },
    { name: 'energetic-electric-eel', score: 63, aura: 18, skill: 20, stamina: 25 },
    { name: 'entrepreneur-elf', score: 71, aura: 24, skill: 24, stamina: 23 },
    { name: 'fearless-fairy', score: 67, aura: 24, skill: 22, stamina: 21 },
    { name: 'fuck-you-monday-mole', score: 62, aura: 20, skill: 20, stamina: 22 },
    { name: 'gary-bee', score: 66, aura: 23, skill: 22, stamina: 21 },
    { name: 'generous-gerbil', score: 60, aura: 19, skill: 20, stamina: 21 },
    { name: 'gentle-giant', score: 61, aura: 20, skill: 20, stamina: 21 },
    { name: 'genuine-giraffe', score: 69, aura: 24, skill: 22, stamina: 23 },
    { name: 'graceful-goldfish', score: 55, aura: 20, skill: 19, stamina: 16 },
    { name: 'gracious-goose', score: 55, aura: 17, skill: 18, stamina: 20 },
    { name: 'gracious-grizzly-bear', score: 64, aura: 23, skill: 19, stamina: 22 },
    { name: 'gutsy-gecko', score: 55, aura: 20, skill: 18, stamina: 17 },
    { name: 'happy-hermit-crab', score: 57, aura: 20, skill: 17, stamina: 20 },
    { name: 'hard-working-wombat', score: 66, aura: 20, skill: 22, stamina: 24 },
    { name: 'helpful-hippo', score: 62, aura: 22, skill: 22, stamina: 20 },
    { name: 'honest-honey-bee', score: 52, aura: 17, skill: 14, stamina: 21 },
    { name: 'honorable-olm', score: 52, aura: 17, skill: 15, stamina: 20 },
    { name: 'hot-shit-hornet', score: 57, aura: 19, skill: 19, stamina: 19 },
    { name: 'hustling-hamster', score: 62, aura: 20, skill: 19, stamina: 23 },
    { name: 'impeccable-inostranet', score: 70, aura: 23, skill: 23, stamina: 24 },
    { name: 'independent-inch-worm', score: 56, aura: 20, skill: 20, stamina: 16 },
    { name: 'innovative-impala', score: 65, aura: 21, skill: 22, stamina: 22 },
    { name: 'jolly-jack-o', score: 50, aura: 18, skill: 16, stamina: 16 },
    { name: 'joyous-jellyfish', score: 58, aura: 21, skill: 19, stamina: 18 },
    { name: 'juicy-jaguar', score: 58, aura: 19, skill: 20, stamina: 21 },
    { name: 'just-jackal', score: 50, aura: 15, skill: 18, stamina: 17 },
    { name: 'karma-kiwi', score: 68, aura: 22, skill: 22, stamina: 24 },
    { name: 'kind-kudu', score: 67, aura: 22, skill: 23, stamina: 22 },
    { name: 'kind-warrior', score: 71, aura: 24, skill: 24, stamina: 23 },
    { name: 'last-glass-standing', score: 57, aura: 16, skill: 18, stamina: 23 },
    { name: 'level-headed-lizard', score: 57, aura: 18, skill: 19, stamina: 20 },
    { name: 'like-a-sponge', score: 53, aura: 20, skill: 17, stamina: 16 },
    { name: 'likeable-leopard', score: 59, aura: 17, skill: 22, stamina: 20 },
    { name: 'lit-lamb', score: 65, aura: 24, skill: 20, stamina: 21 },
    { name: 'logical-lion', score: 69, aura: 23, skill: 23, stamina: 23 },
    { name: 'loyal-lobster', score: 64, aura: 22, skill: 19, stamina: 23 },
    { name: 'macho-manta-ray', score: 65, aura: 22, skill: 22, stamina: 21 },
    { name: 'magnanimous-maltese', score: 50, aura: 18, skill: 14, stamina: 18 },
    { name: 'methodical-mammoth', score: 67, aura: 21, skill: 22, stamina: 24 },
    { name: 'meticulous-magpie', score: 59, aura: 19, skill: 19, stamina: 21 },
    { name: 'modest-moose', score: 59, aura: 17, skill: 19, stamina: 23 },
    { name: 'mojo-mouse', score: 50, aura: 16, skill: 21, stamina: 13 },
    { name: 'moral-monkey', score: 68, aura: 23, skill: 21, stamina: 24 },
    { name: 'nifty-narwhal', score: 72, aura: 24, skill: 24, stamina: 24 },
    { name: 'offense-oriented-orangutan', score: 65, aura: 21, skill: 21, stamina: 23 },
    { name: 'og-ox', score: 59, aura: 19, skill: 18, stamina: 22 },
    { name: 'organized-ostrich', score: 60, aura: 17, skill: 20, stamina: 23 },
    { name: 'passionate-parot', score: 68, aura: 23, skill: 22, stamina: 23 },
    { name: 'patient-panda', score: 74, aura: 24, skill: 25, stamina: 25 },
    { name: 'pea-salad', score: 51, aura: 17, skill: 17, stamina: 17 },
    { name: 'peaceful-pelican', score: 58, aura: 20, skill: 17, stamina: 21 },
    { name: 'perceptive-puma', score: 51, aura: 16, skill: 20, stamina: 15 },
    { name: 'persistent-penguin', score: 67, aura: 22, skill: 21, stamina: 24 },
    { name: 'perspective-pigeon', score: 69, aura: 23, skill: 23, stamina: 23 },
    { name: 'polished-poodle', score: 55, aura: 18, skill: 20, stamina: 17 },
    { name: 'ponder-it-from-all-angles', score: 60, aura: 20, skill: 20, stamina: 20 },
    { name: 'your-poor-relationship-with-time', score: 57, aura: 16, skill: 17, stamina: 24 },
    { name: 'principled-praying-mantis', score: 61, aura: 20, skill: 19, stamina: 22 },
    { name: 'proactive-piranha', score: 59, aura: 19, skill: 18, stamina: 22 },
    { name: 'productive-puffin', score: 56, aura: 18, skill: 20, stamina: 18 },
    { name: 'protective-panther', score: 66, aura: 23, skill: 20, stamina: 23 },
    { name: 'radical-rabbit', score: 55, aura: 18, skill: 18, stamina: 19 },
    { name: 'rational-rattlesnake', score: 52, aura: 15, skill: 17, stamina: 20 },
    { name: 'reflective-rhinoceros', score: 64, aura: 19, skill: 22, stamina: 23 },
    { name: 'respectful-racoon', score: 58, aura: 17, skill: 19, stamina: 22 },
    { name: 'responsive-ram', score: 61, aura: 19, skill: 20, stamina: 22 },
    { name: 'selfless-sloth', score: 59, aura: 20, skill: 21, stamina: 18 },
    { name: 'sensible-sommelier', score: 62, aura: 21, skill: 21, stamina: 20 },
    { name: 'sensitive-centipede', score: 57, aura: 18, skill: 18, stamina: 21 },
    { name: 'sentimental-salamander', score: 53, aura: 18, skill: 18, stamina: 17 },
    { name: 'shrewd-shark', score: 61, aura: 20, skill: 21, stamina: 20 },
    { name: 'sincere-skunk', score: 55, aura: 19, skill: 16, stamina: 20 },
    { name: 'sophisticated-stingray', score: 51, aura: 15, skill: 17, stamina: 19 },
    { name: 'spiffy-salmon', score: 62, aura: 19, skill: 20, stamina: 23 },
    { name: 'spontaneous-seahorse', score: 50, aura: 20, skill: 15, stamina: 15 },
    { name: 'swaggy-sea-lion', score: 66, aura: 22, skill: 21, stamina: 23 },
    { name: 'sweet-swan', score: 70, aura: 23, skill: 23, stamina: 24 },
    { name: 'tenacious-turkey', score: 53, aura: 15, skill: 20, stamina: 18 },
    { name: 'tolerant-tuna', score: 58, aura: 19, skill: 17, stamina: 22 },
    { name: 'toronto-&-st-louis', score: 50, aura: 15, skill: 14, stamina: 21 },
    { name: 'versatile-viking', score: 73, aura: 25, skill: 24, stamina: 24 },
    { name: 'warm-wolverine', score: 55, aura: 18, skill: 20, stamina: 17 },
    { name: 'well-connected-werewolf', score: 63, aura: 22, skill: 21, stamina: 20 },
    { name: 'who-was-born-in-1997', score: 57, aura: 19, skill: 19, stamina: 19 },
    { name: 'wild-wallaby', score: 52, aura: 19, skill: 18, stamina: 15 },
    { name: 'yolo-yak', score: 62, aura: 24, skill: 21, stamina: 22 },
    { name: 'zealous-zombie', score: 69, aura: 22, skill: 23, stamina: 24 }
  ];
  return deck;
}

function getSocketId(username) {
  for (const key in onlinePlayers) {

    if (onlinePlayers[key] === username) return key;
  }
}
