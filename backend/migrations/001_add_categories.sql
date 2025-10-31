-- Создаем таблицу категорий, если она не существует
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL
);

-- Создаем связующую таблицу для связи многие-ко-многим между викторинами и категориями
CREATE TABLE IF NOT EXISTS quiz_categories (
  quiz_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  PRIMARY KEY (quiz_id, category_id),
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Вставляем стандартные категории, если их еще нет
INSERT OR IGNORE INTO categories (name) VALUES 
  ('Наука'), ('История'), ('Искусство'), ('Спорт'), ('Кино'), 
  ('Музыка'), ('Литература'), ('Технологии'), ('География'), ('Разное');

-- Обновляем схему, чтобы добавить поле is_public, если его нет
PRAGMA foreign_keys=off;

-- Создаем временную таблицу с новой структурой
CREATE TABLE IF NOT EXISTS quizzes_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  user_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_public BOOLEAN DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Копируем данные из старой таблицы в новую
INSERT INTO quizzes_new (id, title, description, user_id, created_at, is_public)
SELECT id, title, description, user_id, created_at, COALESCE(is_public, 1) FROM quizzes;

-- Удаляем старую таблицу и переименовываем новую
DROP TABLE quizzes;
ALTER TABLE quizzes_new RENAME TO quizzes;

PRAGMA foreign_keys=on;
