require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const dbPath = path.resolve(__dirname, 'users.db');
const db = new sqlite3.Database(dbPath);
const SECRET_KEY = process.env.SECRET_KEY || 'default_secret';

app.use(bodyParser.json());
app.use(cors());

// Инициализация таблицы пользователей
function initDB() {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    login TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )`);
}

initDB();

// Email validation function
function isValidEmail(email) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

// Регистрация
app.post('/register', (req, res) => {
  const { email, login, password, confirmPassword } = req.body;
  if (!email || !login || !password || !confirmPassword) {
    return res.status(400).json({ message: 'Заполните все поля' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Некорректный email' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Пароли не совпадают' });
  }
  // Проверка email и login на уникальность
  db.get('SELECT * FROM users WHERE email = ? OR login = ?', [email, login], (err, user) => {
    if (err) return res.status(500).json({ message: 'Ошибка сервера при проверке пользователя' });
    if (user) {
      if (user.email === email) {
        return res.status(400).json({ message: 'Почта уже используется' });
      }
      if (user.login === login) {
        return res.status(400).json({ message: 'Логин уже используется' });
      }
    }
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) return res.status(500).json({ message: 'Ошибка сервера при хешировании' });
      db.run('INSERT INTO users (email, login, password) VALUES (?, ?, ?)', [email, login, hash], function(err) {
        if (err) return res.status(500).json({ message: 'Ошибка регистрации' });
        res.json({ message: 'Регистрация успешна' });
      });
    });
  });
});

// Авторизация
app.post('/login', (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) {
    return res.status(400).json({ message: 'Введите логин и пароль' });
  }
  db.get('SELECT * FROM users WHERE login = ?', [login], (err, user) => {
    if (err) return res.status(500).json({ message: 'Ошибка сервера при поиске пользователя' });
    if (!user) {
      return res.status(400).json({ message: 'Неверный логин или пароль' });
    }
    bcrypt.compare(password, user.password, (err, result) => {
      if (err) return res.status(500).json({ message: 'Ошибка сервера при проверке пароля' });
      if (result) {
        const token = jwt.sign({ id: user.id, login: user.login }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ message: 'Успешный вход', token });
      } else {
        res.status(400).json({ message: 'Неверный логин или пароль' });
      }
    });
  });
});

// JWT middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Нет токена' });
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ message: 'Недействительный токен' });
    req.user = user;
    next();
  });
}

// Пример защищённого маршрута
app.get('/profile', authenticateToken, (req, res) => {
  db.get('SELECT id, email, login FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err || !user) return res.status(404).json({ message: 'Пользователь не найден' });
    res.json({ user });
  });
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
