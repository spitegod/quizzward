-- Добавляем поле points в таблицу users, если оно ещё не существует
ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0;
