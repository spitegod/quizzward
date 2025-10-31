import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getQuizzes } from '../../services/quizService';
import { getCurrentUser, getUserById } from '../../services/userService';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import s from './UserQuizzes.module.css';

const UserQuizzes = ({ userId, isCurrentUser }) => {
  const [quizzes, setQuizzes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profileUser, setProfileUser] = useState(null);

  useEffect(() => {
    const fetchUserQuizzes = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Требуется авторизация');
        }
        
        // Получаем данные профиля пользователя, чьи викторины мы хотим отобразить
        const profileUserResponse = await getUserById(userId, token);
        if (!profileUserResponse || !profileUserResponse.id) {
          throw new Error('Не удалось загрузить данные пользователя');
        }
        
        setProfileUser(profileUserResponse);
        
        // Получаем все викторины
        const response = await getQuizzes(token);
        
        // Обрабатываем ответ в формате { myQuizzes: [...], publicQuizzes: [...] }
        if (response && typeof response === 'object') {
          // Объединяем викторины из myQuizzes и publicQuizzes, если они существуют
          const allQuizzes = [
            ...(Array.isArray(response.myQuizzes) ? response.myQuizzes : []),
            ...(Array.isArray(response.publicQuizzes) ? response.publicQuizzes : [])
          ];
          
          // Фильтруем викторины, созданные пользователем, чей профиль мы смотрим
          const userQuizzes = allQuizzes.filter(quiz => {
            // Проверяем, совпадает ли имя автора викторины с именем пользователя профиля
            // или ID автора, если доступно
            return (
              quiz.author === profileUserResponse.username ||
              (quiz.author_id && quiz.author_id.toString() === profileUserResponse.id.toString()) ||
              (quiz.userId && quiz.userId.toString() === profileUserResponse.id.toString())
            );
          });
          
          setQuizzes(userQuizzes);
        } else {
          throw new Error('Некорректный формат данных викторин');
        }
        setError(null);
      } catch (error) {
        console.error('Ошибка при загрузке викторин пользователя:', error);
        setError('Не удалось загрузить викторины');
        toast.error('Ошибка при загрузке викторин');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserQuizzes();
  }, [userId]);

  if (isLoading) {
    return <div className={s.loading}>Загрузка викторин...</div>;
  }

  if (error) {
    return <div className={s.error}>{error}</div>;
  }

  return (
    <div className={s.quizzesSection}>
      <h3 className={s.sectionTitle}>
        {isCurrentUser ? 'Мои викторины' : 'Викторины пользователя'}
      </h3>
      
      {quizzes.length === 0 ? (
        <div className={s.emptyState}>
          {isCurrentUser 
            ? 'Вы еще не создали ни одной викторины' 
            : 'Пользователь еще не создал ни одной викторины'}
          {isCurrentUser && (
            <Link to="/create-quiz" className={s.createLink}>
              Создать викторину
            </Link>
          )}
        </div>
      ) : (
        <div className={s.quizzesGrid}>
          {quizzes.map(quiz => (
            <div key={quiz.id} className={s.quizCard}>
              <Link to={`/quiz/${quiz.id}`} className={s.quizLink}>
                <h4 className={s.quizTitle}>{quiz.title}</h4>
                {quiz.description && (
                  <p className={s.quizDescription}>
                    {quiz.description.length > 100 
                      ? `${quiz.description.substring(0, 100)}...` 
                      : quiz.description}
                  </p>
                )}
                <div className={s.quizMeta}>
                  <span className={s.quizQuestions}>
                    {quiz.questions_count || quiz.questions?.length || 0} вопросов
                  </span>
                  <span className={s.quizDate}>
                    Создано: {quiz.created_at || quiz.createdAt ? (
                      new Date(quiz.created_at || quiz.createdAt).toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    ) : 'Дата не указана'}
                  </span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserQuizzes;
