const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());
app.use(cookieParser());

// 創建 SQLite 數據庫連接
const db = new sqlite3.Database('./users.db', (err) => {
  if (err) {
    console.error('Error opening database', err);
  } else {
    console.log('Database connected');
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    )`);
  }
});

// JWT 密鑰
const JWT_SECRET = 'your_jwt_secret';

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], (err) => {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          res.status(400).json({ success: false, message: 'Username already exists' });
        } else {
          res.status(500).json({ success: false, message: 'Error registering user' });
        }
      } else {
        res.status(201).json({ success: true, message: 'User registered' });
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error registering user' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      res.status(500).json({ success: false, message: 'Error during login' });
    } else if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    } else {
      const match = await bcrypt.compare(password, user.password);
      if (match) {
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
        res.cookie('token', token, { httpOnly: true });
        res.json({ success: true, username });
      } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
    }
  });
});

app.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out' });
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

// 優雅地關閉數據庫連接
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Database connection closed');
    process.exit(0);
  });
});