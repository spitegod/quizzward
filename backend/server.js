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

// Настройка CORS
const corsOptions = {
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Применяем CORS ко всем маршрутам
app.use(cors(corsOptions));

// Разрешаем pre-flight запросы для всех маршрутов
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', true);
    return res.status(200).end();
  }
  next();
});

app.use(bodyParser.json());

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

  // Добавляем поле points в таблицу users, если оно не существует
  db.all("PRAGMA table_info(users)", [], (err, columns) => {
    if (err) return console.error('Ошибка при проверке структуры таблицы users:', err);
    
    const hasPointsColumn = columns && Array.isArray(columns) && 
      columns.some(col => col.name === 'points');
      
    if (!hasPointsColumn) {
      db.run('ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0', (err) => {
        if (err) return console.error('Ошибка при добавлении поля points:', err);
        console.log('Добавлено поле points в таблицу users');
      });
    } else {
      console.log('Поле points уже существует в таблице users');
    }
  });
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
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Admin check middleware
function checkAdmin(req, res, next) {
  const userId = req.user.id;
  
  db.get('SELECT login FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      console.error('Ошибка при проверке прав администратора:', err);
      return res.status(500).json({ error: 'Ошибка сервера при проверке прав доступа' });
    }
    
    if (!user || user.login !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен. Недостаточно прав.' });
    }
    
    next();
  });
}

// Получение данных пользователя по ID
app.get('/api/user/:userId', authenticateToken, (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Проверяем, что пользователь существует
    db.get(
      'SELECT id, login, email, points, created_at FROM users WHERE id = ?',
      [userId],
      (err, user) => {
        if (err) {
          console.error('Ошибка при получении данных пользователя:', err);
          return res.status(500).json({ error: 'Ошибка при загрузке данных пользователя' });
        }
        
        if (!user) {
          return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        // Форматируем дату регистрации
        let formattedDate = 'Неизвестно';
        try {
          const regDate = new Date(user.created_at);
          formattedDate = regDate.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
        } catch (dateError) {
          console.error('Ошибка при форматировании даты:', dateError);
        }
        
        // Получаем количество пройденных викторин
        db.get(
          'SELECT COUNT(DISTINCT quiz_id) as completed_count FROM quiz_results WHERE user_id = ?',
          [user.id],
          (err, result) => {
            if (err) {
              console.error('Ошибка при получении количества пройденных викторин:', err);
              // В случае ошибки возвращаем 0
              return res.json({
                id: user.id,
                username: user.login || 'Пользователь',
                email: user.email || '',
                points: user.points || 0,
                registrationDate: formattedDate,
                completedQuizzes: 0
              });
            }
            
            // Возвращаем данные пользователя с количеством пройденных викторин
            res.json({
              id: user.id,
              username: user.login || 'Пользователь',
              email: user.email || '',
              points: user.points || 0,
              registrationDate: formattedDate,
              completedQuizzes: result ? result.completed_count : 0
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Непредвиденная ошибка в /api/user/:userId:', error);
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера',
      details: error.message 
    });
  }
});

// Получение данных текущего пользователя (упрощенная версия для отладки)
app.get('/api/user', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    
    // Простой запрос для проверки работы
    db.get(
      'SELECT id, login, email, points, created_at FROM users WHERE id = ?',
      [userId],
      (err, user) => {
        if (err) {
          console.error('Ошибка при получении данных пользователя:', err);
          return res.status(500).json({ error: 'Ошибка при загрузке данных пользователя' });
        }
        
        if (!user) {
          return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        // Форматируем дату регистрации
        let formattedDate = 'Неизвестно';
        try {
          const regDate = new Date(user.created_at);
          formattedDate = regDate.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
        } catch (dateError) {
          console.error('Ошибка при форматировании даты:', dateError);
        }
        
        // Получаем количество пройденных викторин
        db.get(
          'SELECT COUNT(DISTINCT quiz_id) as completed_count FROM quiz_results WHERE user_id = ?',
          [user.id],
          (err, result) => {
            if (err) {
              console.error('Ошибка при получении количества пройденных викторин:', err);
              // В случае ошибки возвращаем 0
              return res.json({
                id: user.id,
                username: user.login || 'Пользователь',
                email: user.email || '',
                points: user.points || 0,
                registrationDate: formattedDate,
                completedQuizzes: 0
              });
            }
            
            // Возвращаем данные пользователя с количеством пройденных викторин
            res.json({
              id: user.id,
              username: user.login || 'Пользователь',
              email: user.email || '',
              points: user.points || 0,
              registrationDate: formattedDate,
              completedQuizzes: result ? result.completed_count : 0
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Непредвиденная ошибка в /api/user:', error);
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера',
      details: error.message 
    });
  }
});

// Получение таблицы лидеров
app.get('/leaderboard', authenticateToken, (req, res) => {
  // Получаем топ-5 пользователей по очкам
  db.all(
    `SELECT id, login, points 
     FROM users 
     ORDER BY points DESC 
     LIMIT 5`,
    [],
    (err, topUsers) => {
      if (err) {
        console.error('Ошибка при получении топ-5 пользователей:', err);
        return res.status(500).json({ message: 'Ошибка сервера' });
      }

      // Получаем данные текущего пользователя
      db.get(
        'SELECT id, login, points FROM users WHERE id = ?',
        [req.user.id],
        (err, currentUser) => {
          if (err) {
            console.error('Ошибка при получении данных текущего пользователя:', err);
            return res.status(500).json({ message: 'Ошибка сервера' });
          }

          // Проверяем, находится ли текущий пользователь в топ-5
          const isInTop = topUsers.some(user => user.id === currentUser.id);
          
          // Если пользователь не в топ-5, получаем его позицию в общем рейтинге
          let userRank = null;
          if (!isInTop && currentUser) {
            db.get(
              `SELECT COUNT(*) + 1 as rank 
               FROM users 
               WHERE points > ?`,
              [currentUser.points],
              (err, result) => {
                if (err) {
                  console.error('Ошибка при получении ранга пользователя:', err);
                  return res.status(500).json({ message: 'Ошибка сервера' });
                }
                userRank = result.rank;
                
                // Отправляем ответ с топ-5 и данными текущего пользователя
                res.json({
                  topUsers,
                  currentUser: {
                    ...currentUser,
                    rank: userRank
                  }
                });
              }
            );
          } else {
            // Если пользователь в топ-5, просто отправляем данные
            const currentUserInTop = topUsers.find(user => user.id === currentUser.id);
            res.json({
              topUsers,
              currentUser: {
                ...currentUser,
                rank: topUsers.indexOf(currentUserInTop) + 1
              }
            });
          }
        }
      );
    }
  );
});

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
// Получение всех викторин (своих и публичных от других пользователей)
app.get('/api/quizzes', authenticateToken, (req, res) => {
  const userId = req.user.id;
  
  // Получаем свои викторины
  db.all(
    `SELECT q.id, q.title, q.description, q.created_at, 
      COUNT(qu.id) as questions_count,
      u.login as author,
      1 as is_owner
     FROM quizzes q
     LEFT JOIN questions qu ON q.id = qu.quiz_id
     LEFT JOIN users u ON q.user_id = u.id
     WHERE q.user_id = ?
     GROUP BY q.id
     ORDER BY q.created_at DESC`,
    [userId],
    (err, myQuizzes) => {
      if (err) {
        console.error('Ошибка при получении викторин:', err);
        return res.status(500).json({ error: 'Ошибка сервера' });
      }
      
      // Получаем публичные викторины других пользователей
      db.all(
        `SELECT q.id, q.title, q.description, q.created_at, 
          COUNT(qu.id) as questions_count,
          u.login as author,
          0 as is_owner
         FROM quizzes q
         LEFT JOIN questions qu ON q.id = qu.quiz_id
         LEFT JOIN users u ON q.user_id = u.id
         WHERE q.user_id != ? AND q.is_public = 1
         GROUP BY q.id
         ORDER BY q.created_at DESC`,
        [userId],
        (err, publicQuizzes) => {
          if (err) {
            console.error('Ошибка при получении публичных викторин:', err);
            return res.status(500).json({ error: 'Ошибка сервера' });
          }
          
          // Возвращаем обе группы викторин
          res.json({
            myQuizzes: myQuizzes || [],
            publicQuizzes: publicQuizzes || []
          });
        }
      );
    }
  );
});

// Создание новой викторины
app.post('/api/quizzes', authenticateToken, (req, res) => {
  const { title, description, questions } = req.body;
  const userId = req.user.id;

  if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'Название викторины и вопросы обязательны' });
  }

  db.serialize(() => {
    db.run(
      'INSERT INTO quizzes (title, description, user_id) VALUES (?, ?, ?)',
      [title, description || '', userId],
      function(err) {
        if (err) {
          console.error('Ошибка при создании викторины:', err);
          return res.status(500).json({ error: 'Ошибка при создании викторины' });
        }

        const quizId = this.lastID;
        const stmt = db.prepare(
          'INSERT INTO questions (quiz_id, question_text, options, correct_answer, points) VALUES (?, ?, ?, ?, ?)'
        );

        questions.forEach(q => {
          stmt.run(
            quizId,
            q.question,
            JSON.stringify([q.answer]), // Сохраняем ответ как массив с одним элементом
            0, // Индекс правильного ответа (у нас всегда 0, так как один ответ)
            1  // Баллы за вопрос
          );
        });

        stmt.finalize(err => {
          if (err) {
            console.error('Ошибка при сохранении вопросов:', err);
            return res.status(500).json({ error: 'Ошибка при сохранении вопросов' });
          }
          res.status(201).json({ id: quizId, message: 'Викторина успешно создана' });
        });
      }
    );
  });
});

// Получение викторины по ID
app.get('/api/quizzes/:id', authenticateToken, (req, res) => {
  const quizId = req.params.id;
  const userId = req.user.id;
  
  // Сначала получаем данные викторины
  db.get(
    `SELECT q.*, u.login as author 
     FROM quizzes q 
     JOIN users u ON q.user_id = u.id 
     WHERE q.id = ? AND (q.user_id = ? OR q.is_public = 1)`,
    [quizId, userId],
    (err, quiz) => {
      if (err) {
        console.error('Ошибка при получении викторины:', err);
        return res.status(500).json({ error: 'Ошибка сервера' });
      }
      
      if (!quiz) {
        return res.status(404).json({ error: 'Викторина не найдена' });
      }
      
      // Затем получаем вопросы для этой викторины
      db.all(
        'SELECT * FROM questions WHERE quiz_id = ?',
        [quizId],
        (err, questions) => {
          if (err) {
            console.error('Ошибка при получении вопросов:', err);
            return res.status(500).json({ error: 'Ошибка сервера' });
          }
          
          // Форматируем вопросы для фронтенда
          const formattedQuestions = questions.map(q => ({
            question: q.question_text,
            answer: JSON.parse(q.options)[q.correct_answer] // Получаем правильный ответ
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

// Обновление викторины
app.put('/api/quizzes/:id', authenticateToken, (req, res) => {
  const quizId = req.params.id;
  const userId = req.user.id;
  const { title, description, questions } = req.body;

  if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'Название викторины и вопросы обязательны' });
  }

  // Сначала проверяем, существует ли викторина и принадлежит ли она пользователю
  db.get(
    'SELECT id FROM quizzes WHERE id = ? AND user_id = ?',
    [quizId, userId],
    (err, quiz) => {
      if (err) {
        console.error('Ошибка при проверке викторины:', err);
        return res.status(500).json({ error: 'Ошибка сервера' });
      }
      
      if (!quiz) {
        return res.status(404).json({ error: 'Викторина не найдена или у вас нет прав на её изменение' });
      }

      // Обновляем данные викторины
      db.serialize(() => {
        // Обновляем основную информацию о викторине
        db.run(
          'UPDATE quizzes SET title = ?, description = ? WHERE id = ?',
          [title, description || '', quizId],
          function(err) {
            if (err) {
              console.error('Ошибка при обновлении викторины:', err);
              return res.status(500).json({ error: 'Ошибка при обновлении викторины' });
            }

            // Удаляем старые вопросы
            db.run('DELETE FROM questions WHERE quiz_id = ?', [quizId], function(err) {
              if (err) {
                console.error('Ошибка при удалении старых вопросов:', err);
                return res.status(500).json({ error: 'Ошибка при обновлении вопросов' });
              }

              // Добавляем новые вопросы
              const stmt = db.prepare(
                'INSERT INTO questions (quiz_id, question_text, options, correct_answer, points) VALUES (?, ?, ?, ?, ?)'
              );

              questions.forEach(q => {
                stmt.run(
                  quizId,
                  q.question,
                  JSON.stringify([q.answer]),
                  0, // Индекс правильного ответа
                  1  // Баллы за вопрос
                );
              });

              stmt.finalize(err => {
                if (err) {
                  console.error('Ошибка при сохранении вопросов:', err);
                  return res.status(500).json({ error: 'Ошибка при сохранении вопросов' });
                }
                res.json({ message: 'Викторина успешно обновлена' });
              });
            });
          }
        );
      });
    }
  );
});

// Удаление викторины
app.delete('/api/quizzes/:id', authenticateToken, (req, res) => {
  const quizId = req.params.id;
  const userId = req.user.id;

  // Проверяем, существует ли викторина и принадлежит ли она пользователю
  db.get(
    'SELECT id FROM quizzes WHERE id = ? AND user_id = ?',
    [quizId, userId],
    (err, quiz) => {
      if (err) {
        console.error('Ошибка при проверке викторины:', err);
        return res.status(500).json({ error: 'Ошибка сервера' });
      }
      
      if (!quiz) {
        return res.status(404).json({ error: 'Викторина не найдена или у вас нет прав на её удаление' });
      }

      // Удаляем викторину (внешний ключ CASCADE удалит связанные вопросы)
      db.run('DELETE FROM quizzes WHERE id = ?', [quizId], function(err) {
        if (err) {
          console.error('Ошибка при удалении викторины:', err);
          return res.status(500).json({ error: 'Ошибка при удалении викторины' });
        }
        
        res.json({ message: 'Викторина успешно удалена' });
      });
    }
  );
});

// Добавление вопроса к викторине
// Создаем таблицу для хранения результатов, если её нет
db.run(`CREATE TABLE IF NOT EXISTS quiz_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  quiz_id INTEGER NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
  UNIQUE(user_id, quiz_id) ON CONFLICT REPLACE
)`);

// Сохранение результатов прохождения викторины
app.post('/api/quizzes/:id/results', authenticateToken, async (req, res) => {
  const quizId = req.params.id;
  const userId = req.user.id;
  const { score, totalQuestions, answers } = req.body;

  // Валидация
  if (typeof score !== 'number' || typeof totalQuestions !== 'number' || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'Некорректные данные результатов' });
  }

  try {
    // Проверяем, является ли пользователь автором викторины
    const quiz = await new Promise((resolve, reject) => {
      db.get('SELECT user_id FROM quizzes WHERE id = ?', [quizId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Викторина не найдена' });
    }

    // Если пользователь - автор викторины, не начисляем очки
    if (quiz.user_id === userId) {
      return res.json({
        success: true,
        message: 'За прохождение своей викторины очки не начисляются',
        score,
        totalQuestions,
        percentage: Math.round((score / totalQuestions) * 100),
        pointsAdded: 0
      });
    }

    // Проверяем, проходил ли пользователь эту викторину ранее
    const existingResult = await new Promise((resolve, reject) => {
      db.get('SELECT score FROM quiz_results WHERE user_id = ? AND quiz_id = ?', 
        [userId, quizId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
      });
    });

    // Если пользователь уже проходил викторину и новый результат не лучше, не обновляем
    if (existingResult && existingResult.score >= score) {
      return res.json({
        success: true,
        message: 'Вы уже проходили эту викторину. Новый результат не лучше предыдущего',
        score,
        totalQuestions,
        percentage: Math.round((score / totalQuestions) * 100),
        pointsAdded: 0
      });
    }

    // Вычисляем разницу в очках для обновления (если это новый лучший результат)
    const pointsToAdd = existingResult ? Math.max(0, score - existingResult.score) : score;
    
    // Обновляем очки пользователя, если есть что добавлять
    if (pointsToAdd > 0) {
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE users SET points = COALESCE(points, 0) + ? WHERE id = ?',
          [Math.round(pointsToAdd), userId],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    // Сохраняем/обновляем результат прохождения
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT OR REPLACE INTO quiz_results (user_id, quiz_id, score, total_questions) VALUES (?, ?, ?, ?)',
        [userId, quizId, score, totalQuestions],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({
      success: true,
      message: pointsToAdd > 0 ? 'Результаты успешно сохранены' : 'Результат сохранен, но очки не изменились',
      score,
      totalQuestions,
      percentage: Math.round((score / totalQuestions) * 100),
      pointsAdded: pointsToAdd > 0 ? Math.round(pointsToAdd) : 0,
      isNewBest: pointsToAdd > 0
    });

  } catch (error) {
    console.error('Ошибка при сохранении результатов:', error);
    res.status(500).json({ 
      error: 'Ошибка при сохранении результатов',
      details: error.message 
    });
  }
});

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

// Admin panel route
app.get('/admin', authenticateToken, checkAdmin, (req, res) => {
  // This route is protected and only accessible by admin
  // The actual admin panel logic will be handled by the frontend
  res.json({ message: 'Добро пожаловать в панель администратора' });
});

// Запуск сервера
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
