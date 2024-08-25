const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());
app.use(cookieParser());

// 模擬數據庫
const users = [];

// JWT 密鑰
const JWT_SECRET = 'your_jwt_secret';

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  users.push({ username, password: hashedPassword });
  res.status(201).send('User registered');
  console.log("re", users)
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (user && await bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
    console.log('token', token)
    res.cookie('token', token, { httpOnly: true });
    res.send('Logged in');
  } else {
    res.status(401).send('Invalid credentials');
  }
  console.log("lo", users)

});

app.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.send('Logged out');
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/client.html');
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  console.log("D", token)
  if (token) {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      console.log("D", decoded, err)
      if (err) return next(new Error('Authentication error'));
      socket.decoded = decoded;
      next();
    });
  } else {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.decoded.username);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.decoded.username);
  });
});

server.listen(3002, () => {
  console.log('Server running on http://localhost:3002');
});