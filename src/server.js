const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// const sqlite3 = require('sqlite3').verbose();
const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const orbitoHandler = require('./orbito/orbitoHandler');
app.use(express.json());
app.use(cookieParser());

app.use(express.static(__dirname));


let db;
try {
  db = new Database('./users.db', { verbose: console.log });
  console.log('Database connected');

  // Create users table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
      )
      `);

} catch (err) {
  console.error('Error opening database:', err.message);
}
db.pragma('journal_mode = WAL');


// JWT 密鑰
const JWT_SECRET = process.env.JWT_SECRET;
const InsertUser = db.prepare('INSERT INTO users (username, password, type, timestamp) VALUES (?, ?, ?, ?)');
const GetUserByUserName = db.prepare('SELECT * FROM users WHERE username = ?');

app.post('/guest', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      InsertUser.run(username, hashedPassword, "guest", Date.now());
      res.status(201).json({ success: true, message: 'Guest registered' });

    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res.status(400).json({ success: false, message: 'Username already exists' });

      } else {
        console.error('Database error:', error);
        res.status(500).json({ success: false, message: 'Error registering user' });

      }
    }
  } catch (error) {
    console.error('Hashing error:', error);
    res.status(500).json({ success: false, message: 'Error registering user' });
  }
});


app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = GetUserByUserName.get(username);
    if (user) {
      return res.status(401).json({ success: false, message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      InsertUser.run(username, hashedPassword, "generally", Date.now());
      res.status(201).json({ success: true, message: 'User registered' });

    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res.status(400).json({ success: false, message: 'Username already exists' });

      } else {
        console.error('Database error:', error);
        res.status(500).json({ success: false, message: 'Error registering user' });

      }
    }
  } catch (error) {
    console.error('Hashing error:', error);
    res.status(500).json({ success: false, message: 'Error registering user' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = GetUserByUserName.get(username);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (match) {
      const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
      res.cookie('token', token, { httpOnly: true });
      res.json({ success: true, username });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Error during login' });
  }
});

app.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out' });
});

app.get('/check-auth', (req, res) => {
  const token = req.cookies.token;
  console.log(token)
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

// io.use((socket, next) => {
//   const token = socket.handshake.headers.cookie?.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
//   if (token) {
//     jwt.verify(token, JWT_SECRET, (err, decoded) => {
//       if (err) return next(new Error('Authentication error'));
//       socket.decoded = decoded;
//       next();
//     });
//   } else {
//     console.error('No token found in cookie');
//     next(new Error('Authentication error'));
//   }
// });

// io.on('connection', (socket) => {
//   console.log('User connected:', socket.decoded.username);

//   socket.on('disconnect', () => {
//     console.log('User disconnected:', socket.decoded.username);
//   });
// });

orbitoHandler(io);

app.get('/start', (req, res) => {
  res.sendFile(path.join(__dirname, 'client.html'));
});

app.get('/orbito', (req, res) => {
  res.sendFile(path.join(__dirname, 'orbito/orbito.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'home.html'));
});

server.listen(5545, "127.0.0.1", () => {
  console.log('Server running on http://localhost:5545');
});

// 優雅地關閉數據庫連接
process.on('SIGINT', () => {
  if (db) {
    db.close();
    console.log('Database connection closed');
  }
  process.exit(0);
});