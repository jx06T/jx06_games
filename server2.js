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
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (user && await bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true });
    res.json({ success: true, username });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

app.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.send('Logged out');
});

app.get('/check-auth', (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json({ authenticated: false });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.json({ authenticated: false });
    }
    res.json({ authenticated: true, username: decoded.username });
  });
});

io.use((socket, next) => {
  const token = socket.handshake.headers.cookie?.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
  if (token) {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
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

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/client.html');
});

server.listen(3002, () => {
  console.log('Server running on http://localhost:3002');
});