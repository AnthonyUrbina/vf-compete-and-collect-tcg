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
      if (!result.rows[0].username) {
        throw new ClientError(400, 'this user is not in any active games');
      }
      res.status(200).json(result.rows);
    })
    .catch(err => next(err));
});

app.patch('/api/games/:gameId', (req, res, next) => {
  const { gameId } = req.params;
  const { state } = req.body;
  const sql = `
    update "games"
       set "state" = $2
       where "gameId" = $1
  `;
  const params = [gameId, state];

  db.query(sql, params)
    .then(result => {
      if (!result.rows[0]) {
        throw new ClientError(400, 'this gameId does not exist');
      }
      res.status(204).json();
    });
});

app.use(errorMiddleware);

const onlinePlayers = {};

io.on('connection', socket => {

  if (socket.handshake.query) {
    const { roomId } = socket.handshake.query;
    socket.join(roomId);
  }

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

  io.emit('onlinePlayers', onlinePlayers);

  socket.on('disconnect', () => {
    delete onlinePlayers[socket.id];
    io.emit('user disconnected', socket.id);
  });

  socket.on('invite-sent', opponentSocketId => {
    const challengerSocketId = socket.id;
    const challengerId = socket.userId;
    let challengerUsername = null;
    let opponentUsername = null;

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
    let challengerUsername = null;
    let opponentUsername = null;

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
    const players = [
      { name: socket.nickname, type: 'challenger', deck: [] },
      { name: inviteInfo.challengerUsername, type: 'opponent', deck: [] }
    ];

    function dealer(shuffled) {
      players[0].deck = shuffled.slice(0, 26);
      players[1].deck = shuffled.slice(26, 52);
    }

    const deck = getDeck(rank, suit);
    const shuffled = shuffle(deck);

    dealer(shuffled);

    const state = { players };

    const JSONstate = JSON.stringify(state);

    const sql = `
      insert into "games" ("challenger", "opponent", "state")
      values ($1, $2, $3)
      returning *;
    `;
    const params = [inviteInfo.challengerId, socket.userId, JSONstate];

    db.query(sql, params)
      .then(result => {
        socket.to(inviteInfo.challengerSocketId).emit('opponent-joined', inviteInfo);
        socket.to(inviteInfo.roomId).emit('decks-created', players);
      })
      .catch(err => console.error(err));

    // console.log(inviteInfo);
  });
  socket.on('invite-declined', roomId => {
    socket.to(roomId).emit('opponent-declined');
  });
});

server.listen(process.env.PORT, () => {
  process.stdout.write(`\n\napp listening on port ${process.env.PORT}\n\n`);
});

const rank = ['Ace', 2, 3, 4, 5, 6, 7, 8, 9, 10, 'jack', 'queen', 'king'];
const suit = ['clubs', 'diamonds', 'hearts', 'spades'];

function getDeck(rank, suit) {
  const container = [];
  let card = {};
  for (let i = 0; i < suit.length; i++) {
    for (let j = 0; j < rank.length; j++) {
      card.suit = suit[i];
      card.rank = rank[j];
      container.push(card);
      card = {};
    }
  }
  return container;
}

// thoughts before going hone
/*
genrating 50 cards at once and absolute positioning all of them on top of eachother might be a little too much
i feel like waiting for a card to flip, which then triggers set state, which calls for a rerender
then generates the card that was flipped via createCard className client-flipped-card
*/
