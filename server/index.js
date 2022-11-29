require('dotenv/config');
const express = require('express');
const errorMiddleware = require('./error-middleware');
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
        throw new ClientError(401, 'invalid login');
      }

      argon2.verify(hashedPassword, password)
        .then(isMatching => {
          if (!isMatching) {
            throw new ClientError(401, 'invalid login');
          }
          const payload = { username, userId };
          const token = jwt.sign(payload, process.env.TOKEN_SECRET);
          res.status(200).json({ token, user: payload });
        })
        .catch(err => next(err));
    })
    .catch(err => next(err));

});

app.get('/api/games/retrieve/:userId', (req, res, next) => {
  const { userId } = req.params;
  if (!userId) {
    throw new ClientError(400, 'userId is required');
  }

  const sql = `
    select "users"."username",
           "games"."state",
           "games"."gameId"
      from "games"
inner join "users"
        on "challenger" = "userId"
        or "opponent" = "userId"
        where "challenger" = $1
        or "opponent" = $1
        limit 1;
  `;

  const params = [userId];
  db.query(sql, params)
    .then(result => {
      if (!result.rows[0]) {
        throw new ClientError(400, 'this user is not in any active games');
      }
      res.status(200).json(result.rows);
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
      const { roomId } = state;
      if (!result.rows[0]) {
        throw new ClientError(400, 'this gameId does not exist');
      }
      io.to(roomId).emit('flip-card', state);
      res.status(200).json(state);

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
      [challengerUsername + 'CardShowing']: null,
      [socket.nickname + 'CardShowing']: null
    };

    const JSONstate = JSON.stringify(state);

    const sql = `
      insert into "games" ("challenger", "opponent", "state")
      values ($1, $2, $3)
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
  players[0].deck = shuffled.slice(0, 26);
  players[1].deck = shuffled.slice(26, 52);
}

server.listen(process.env.PORT, () => {
  process.stdout.write(`\n\napp listening on port ${process.env.PORT}\n\n`);
});

/*
- decide winner should only be called by once
- it should not be called by a client
- on server side
- how do i figure out when two cards are placed
- when patch is made after client flips card
- you make a query to get state
- if both players CardShowing property is present call decideWinner()
- doesn't seem clean to do that inside the returned promise of a db query
- i don't currently have the names of both players
- think i got it
- socket.on('flip-card')
- if both cards are sh
- both client's should not be telling the server that it's time to decideWinner()
- the server should see that both cards are placed and then decideWinner
*/
