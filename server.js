const express = require('express');
const http = require('http');
// const { v4: uuidv4 } = require('uuid');
const socketIo = require('socket.io');

const app = express();
const port = 3001
const server = http.createServer(app);
const io = socketIo(server);

let players = {}; // Store players info { id: { nickname, socketId } }

app.use(express.static('public'));

// Serve the homepage
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Handle room
app.get('/room/:roomId', (req, res) => {
  res.sendFile(__dirname + '/public/room.html');
});

// Handle socket connection
io.on('connection', (socket) => {
  console.log('A user connected', socket.id);

  socket.on('joinGame', ({ nickname, id, state = 0 }) => {
    players[id] = { nickname, socketId: socket.id, state };
    console.log(players)
    io.emit('updatePlayers', players);
  });

  socket.on('requestPair', (targetId, sponsorId) => {
    const target = players[targetId];
    if (target) {
      io.to(target.socketId).emit('pairRequest', { from: socket.id, sponsor: sponsorId });
    }
  });

  socket.on('acceptPair', ({ from, roomId, sponsor, me }) => {
    io.to(from).emit('pairAccepted', { roomId });
    socket.emit('pairAccepted', { roomId });
    players[sponsor].state = 1
    players[sponsor].room = roomId
    players[me].state = 1
    players[me].room = roomId
    io.emit('updatePlayers', players);

  });

  socket.on('movePlayer', ({ player, room }) => {
    console.log(player, room)
    io.emit('playerMoved', { player, roomId: room });
  });

  socket.on('confirmPlayer', (id) => {
    const target = players[id];
    if (!target) {
      return
    }
    target.socketId = socket.id
    target.state = 1
    console.log("查詢玩家", id, target)
    io.to(target.socketId).emit('playerConfirmation', target);
    io.emit('updatePlayers', players);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected', socket.id);
    for (let id in players) {
      if (players[id].socketId === socket.id) {
        players[id].state = -1
        // delete players[id];
        break;
      }
    }
    console.log(players)

    io.emit('updatePlayers', players);
  });
});

server.listen(port, () => {
  console.log('Server running on port ' + port);
});
