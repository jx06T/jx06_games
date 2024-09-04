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
// const session = require('express-session');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const orbitoServer = require('./orbito/orbitoServer');
app.use(express.json());
app.use(cookieParser());

// app.use(session({
//   secret: process.env.SECRET_KEY,
//   resave: false,
//   saveUninitialized: true
// }));

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
      password TEXT,
      timestamp TEXT,
      type TEXT
      )
      `);

} catch (err) {
  console.error('Error opening database:', err.message);
}
db.pragma('journal_mode = WAL');


// JWT 密鑰
const JWT_SECRET = 'whatafunnyapple'
const InsertUser = db.prepare('INSERT INTO users (username, password, type, timestamp) VALUES (?, ?, ?, ?)');
const GetUserByUserName = db.prepare('SELECT * FROM users WHERE username = ?');

app.post('/guest', async (req, res) => {
  const { username, password } = req.body;

  if (username.length < 3 || username.length > 21) {
    return res.status(400).json({ error: 'Username must be between 3 and 21 characters long.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      InsertUser.run(username, hashedPassword, "guest", Date.now());
      res.status(201).json({ success: true, message: 'Guest registered' });

    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        console.error('Username already existsE');
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
        console.error('Username already exists');
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
  // const returnUrl = req.query.returnUrl || '/';
  // req.session.returnUrl = returnUrl;

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
      deleteInactiveGuestAccounts()
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Error during login' });
  }
});

app.get('/logout', (req, res) => {
  console.log('logout')
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out' });
});

app.get('/check-auth', (req, res) => {
  const token = req.cookies.token;
  console.log("check-auth", token)

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

orbitoServer(io);

app.get('/start', (req, res) => {
  res.sendFile(path.join(__dirname, 'client.html'));
});

app.get('/orbito', (req, res) => {
  res.sendFile(path.join(__dirname, 'orbito/orbito.html'));
});

app.get('/orbito/:roomCode', (req, res) => {
  res.sendFile(path.join(__dirname, 'orbito/orbito.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages/contact.html'));
});

app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages/privacyPolicy.html'));
});

app.get('/collaboration', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages/collaborationInvitation.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'home.html'));
});

server.listen(5545, () => {
  console.log('Server running on http://localhost:5545');
});

process.on('SIGINT', () => {
  if (db) {
    db.close();
    console.log('Database connection closed');
  }
  process.exit(0);
});

function deleteInactiveGuestAccounts() {
  const inactivityDays = 1; // 設置不活躍天數
  const inactiveTimestamp = Date.now() - (inactivityDays * 24 * 60 * 60 * 1000);

  try {
    const stmt = db.prepare("DELETE FROM users WHERE type = 'guest' AND timestamp < ?");
    const deletedRows = stmt.run(inactiveTimestamp).changes;
    console.log(`Deleted ${deletedRows} inactive guest accounts.`);
  } catch (err) {
    console.error('Error deleting inactive guest accounts:', err);
  }
}
