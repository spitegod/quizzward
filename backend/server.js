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

// Инициализация таблиц
function initDB() {
  // Таблица пользователей
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    login TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  // Таблица викторин
  db.run(`CREATE TABLE IF NOT EXISTS quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_public BOOLEAN DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  // Таблица вопросов
  db.run(`CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    options TEXT NOT NULL, -- JSON массив вариантов ответов
    correct_answer INTEGER NOT NULL, -- индекс правильного ответа
    points INTEGER DEFAULT 1,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
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
  db.get('SELECT id, email, login, created_at FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err || !user) return res.status(404).json({ message: 'Пользователь не найден' });
    res.json({ user });
  });
});

// Создание новой викторины
app.post('/quizzes', authenticateToken, (req, res) => {
  const { title, description, isPublic = true } = req.body;
  
  if (!title) {
    return res.status(400).json({ message: 'Название викторины обязательно' });
  }

  db.run(
    'INSERT INTO quizzes (title, description, user_id, is_public) VALUES (?, ?, ?, ?)',
    [title, description, req.user.id, isPublic],
    function(err) {
      if (err) {
        console.error('Ошибка при создании викторины:', err);
        return res.status(500).json({ message: 'Ошибка при создании викторины' });
      }
      res.status(201).json({
        id: this.lastID,
        title,
        description,
        user_id: req.user.id,
        is_public: isPublic
      });
    }
  );
});

// Получение списка викторин пользователя
app.get('/quizzes/my', authenticateToken, (req, res) => {
  db.all(
    'SELECT id, title, description, created_at, is_public FROM quizzes WHERE user_id = ? ORDER BY created_at DESC',
    [req.user.id],
    (err, quizzes) => {
      if (err) {
        console.error('Ошибка при получении викторин:', err);
        return res.status(500).json({ message: 'Ошибка при получении викторин' });
      }
      res.json(quizzes);
    }
  );
});

// Получение викторины по ID с вопросами
app.get('/quizzes/:id', authenticateToken, (req, res) => {
  const quizId = req.params.id;
  
  // Сначала получаем данные викторины
  db.get(
    'SELECT qz.*, u.login as author FROM quizzes qz LEFT JOIN users u ON qz.user_id = u.id WHERE qz.id = ?',
    [quizId],
    (err, quiz) => {
      if (err) {
        console.error('Ошибка при получении викторины:', err);
        return res.status(500).json({ message: 'Ошибка при получении викторины' });
      }
      
      if (!quiz) {
        return res.status(404).json({ message: 'Викторина не найдена' });
      }

      // Затем получаем вопросы для этой викторины
      db.all(
        'SELECT id, question_text, options, points FROM questions WHERE quiz_id = ?',
        [quizId],
        (err, questions) => {
          if (err) {
            console.error('Ошибка при получении вопросов:', err);
            return res.status(500).json({ message: 'Ошибка при получении вопросов' });
          }

          // Парсим JSON с вариантами ответов
          const formattedQuestions = questions.map(q => ({
            ...q,
            options: JSON.parse(q.options)
          }));

          res.json({
            ...quiz,
            questions: formattedQuestions
          });
        }
      );
    }
  );
});

// Добавление вопроса к викторине
app.post('/quizzes/:id/questions', authenticateToken, (req, res) => {
  const quizId = req.params.id;
  const { questionText, options, correctAnswer, points = 1 } = req.body;

  // Валидация
  if (!questionText || !options || !Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ message: 'Некорректные данные вопроса' });
  }

  if (correctAnswer === undefined || correctAnswer < 0 || correctAnswer >= options.length) {
    return res.status(400).json({ message: 'Некорректный индекс правильного ответа' });
  }

  // Проверяем, существует ли викторина и принадлежит ли она пользователю
  db.get(
    'SELECT id FROM quizzes WHERE id = ? AND user_id = ?',
    [quizId, req.user.id],
    (err, quiz) => {
      if (err) {
        console.error('Ошибка при проверке викторины:', err);
        return res.status(500).json({ message: 'Ошибка сервера' });
      }

      if (!quiz) {
        return res.status(404).json({ message: 'Викторина не найдена или у вас нет прав на её изменение' });
      }

      // Добавляем вопрос
      db.run(
        'INSERT INTO questions (quiz_id, question_text, options, correct_answer, points) VALUES (?, ?, ?, ?, ?)',
        [quizId, questionText, JSON.stringify(options), correctAnswer, points],
        function(err) {
          if (err) {
            console.error('Ошибка при добавлении вопроса:', err);
            return res.status(500).json({ message: 'Ошибка при добавлении вопроса' });
          }
          
          res.status(201).json({
            id: this.lastID,
            quiz_id: quizId,
            question_text: questionText,
            options,
            correct_answer: correctAnswer,
            points
          });
        }
      );
    }
  );
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
