const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Путь к базе данных
const dbPath = path.resolve(__dirname, 'users.db');
const db = new sqlite3.Database(dbPath);

// Добавляем поле created_at, если его нет
db.serialize(() => {
    // Проверяем существование поля created_at
    db.all("PRAGMA table_info(users)", [], (err, columns) => {
        if (err) {
            console.error('Ошибка при проверке структуры таблицы users:', err);
            process.exit(1);
        }

        const hasCreatedAt = columns && Array.isArray(columns) && 
            columns.some(col => col.name === 'created_at');
        
        if (!hasCreatedAt) {
            console.log('Добавляем поле created_at в таблицу users...');
            
            // Создаем временную таблицу с нужной структурой
            const currentDate = new Date().toISOString();
            
            db.serialize(() => {
                // 1. Создаем новую таблицу с нужной структурой
                db.run(`
                    CREATE TABLE users_new (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        email TEXT UNIQUE NOT NULL,
                        login TEXT UNIQUE NOT NULL,
                        password TEXT NOT NULL,
                        points INTEGER DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(email, login)
                    )
                `, function(err) {
                    if (err) {
                        console.error('Ошибка при создании новой таблицы:', err);
                        process.exit(1);
                    }
                    
                    console.log('Новая таблица users_new создана');
                    
                    // 2. Копируем данные из старой таблицы в новую
                    db.run(`
                        INSERT INTO users_new (id, email, login, password, points, created_at)
                        SELECT id, email, login, password, COALESCE(points, 0), '${currentDate}'
                        FROM users
                    `, function(err) {
                        if (err) {
                            console.error('Ошибка при копировании данных:', err);
                            process.exit(1);
                        }
                        
                        console.log(`Скопировано ${this.changes} записей в новую таблицу`);
                        
                        // 3. Переименовываем таблицы
                        db.run('DROP TABLE users', (err) => {
                            if (err) {
                                console.error('Ошибка при удалении старой таблицы:', err);
                                process.exit(1);
                            }
                            
                            db.run('ALTER TABLE users_new RENAME TO users', (err) => {
                                if (err) {
                                    console.error('Ошибка при переименовании таблицы:', err);
                                    process.exit(1);
                                }
                                
                                console.log('Таблица users успешно обновлена');
                                console.log('Обновление базы данных завершено успешно!');
                                process.exit(0);
                            });
                        });
                    });
                });
            });
        } else {
            console.log('Поле created_at уже существует в таблице users');
            process.exit(0);
        }
    });
});
