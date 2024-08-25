const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('playerMove', (data) => {
    // 處理玩家移動邏輯
    io.emit('gameUpdate', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

io.on('connection', (socket) => {
  console.log('A user connected');

  let playerPosition = { x: 0, y: 0 };

  socket.on('movePlayer', (direction) => {
    switch (direction) {
      case 'up':
        playerPosition.y -= 5;
        break;
      case 'down':
        playerPosition.y += 5;
        break;
      case 'left':
        playerPosition.x -= 5;
        break;
      case 'right':
        playerPosition.x += 5;
        break;
    }
    io.emit('updatePlayerPosition', playerPosition);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});


server.listen(3001, () => {
  console.log('Server running on port 3001');
});

