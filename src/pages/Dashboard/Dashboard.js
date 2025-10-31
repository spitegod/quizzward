import { useNavigate } from "react-router-dom";
import s from "./Dashboard.module.css";
import Nav from "../../components/Nav/Nav";
import { useEffect, useState } from "react";
import Leaderboard from "../../components/Leaderboard/Leaderboard";
import { getQuizzes, deleteQuiz } from "../../services/quizService";
import { getCurrentUser } from "../../services/userService";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function Dashboard() {
  const navigate = useNavigate();
  const [myQuizzes, setMyQuizzes] = useState([]);
  const [publicQuizzes, setPublicQuizzes] = useState([]);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Загружаем данные пользователя
        const userData = await getCurrentUser();
        setIsAdmin(userData.username === 'admin');

        // Загружаем викторины
        const data = await getQuizzes(token);
        setMyQuizzes(data.myQuizzes || []);
        setPublicQuizzes(data.publicQuizzes || []);
        setError(null);
      } catch (err) {
        console.error('Ошибка при загрузке данных:', err);
        setError('Не удалось загрузить данные. Пожалуйста, попробуйте снова.');
        toast.error('Ошибка при загрузке данных');
      }
    };

    fetchData();
  }, [token]);

  const handleDeleteQuiz = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Вы уверены, что хотите удалить эту викторину?')) {
      try {
        await deleteQuiz(id, token);
        // Удаляем викторину из обоих списков
        setMyQuizzes(prev => prev.filter(quiz => quiz.id !== id));
        setPublicQuizzes(prev => prev.filter(quiz => quiz.id !== id));
        toast.success('Викторина успешно удалена');
      } catch (err) {
        console.error('Ошибка при удалении викторины:', err);
        toast.error('Не удалось удалить викторину');
      }
    }
  };

  return (
    <div className={s.dashboardContainer}>
      <Nav />
      <div className={s.dashboardContent}>
        <h2 className={s.dashboardMainText}>Главная страница</h2>

        <div className={s.toolbar}>
          <div className={s.buttonsContainer}>
            {isAdmin && (
              <button
                onClick={() => navigate("/admin")}
                className={`${s.buttonCreate} ${s.adminButton}`}
              >
                Перейти в панель администратора
              </button>
            )}
            <button
              onClick={() => navigate("/create-quiz")}
              className={s.buttonCreate}
            >
              Создать викторину
            </button>
          </div>
        </div>

        <div className={s.contentArea}>
          {/* Мои викторины */}
          <h3 className={s.sectionTitle}>Мои викторины</h3>
          {error ? (
            <div className={s.quizGrid}>
              <p className={s.error}>{error}</p>
            </div>
          ) : myQuizzes.length === 0 ? (
            <div className={s.quizGrid}>
              <p className={s.emptyState}>У вас пока нет созданных викторин</p>
            </div>
          ) : (
            <div className={s.quizGrid}>
              {myQuizzes.map((quiz) => (
                <div key={quiz.id} className={s.quizItem}>
                  <div className={s.quizInfo}>
                    <h3 className={s.quizTitle}>{quiz.title}</h3>
                    {quiz.description && <p className={s.quizDescription}>{quiz.description}</p>}
                    <p className={s.quizMeta}>
                      Вопросов: {quiz.questions_count || 0} • 
                      Автор: {quiz.author}
                    </p>
                  </div>
                  <div className={s.quizActions}>
                    <button
                      onClick={() => navigate(`/play-quiz/${quiz.id}`)}
                      className={s.buttonPlay}
                    >
                      Играть
                    </button>
                    <button
                      onClick={() => navigate(`/edit-quiz/${quiz.id}`)}
                      className={s.buttonEdit}
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={(e) => handleDeleteQuiz(quiz.id, e)}
                      className={s.buttonDelete}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Викторины других игроков */}
          {publicQuizzes.length > 0 && (
            <div>
              <h3 className={s.sectionTitle}>Викторины от других игроков</h3>
              <div className={s.quizGrid}>
                {publicQuizzes.map((quiz) => (
                  <div key={quiz.id} className={s.quizItem}>
                    <div className={s.quizInfo}>
                      <h3 className={s.quizTitle}>{quiz.title}</h3>
                      {quiz.description && <p className={s.quizDescription}>{quiz.description}</p>}
                      <p className={s.quizMeta}>
                        Вопросов: {quiz.questions_count || 0} • 
                        Автор: {quiz.author}
                      </p>
                    </div>
                    <div className={s.quizActions}>
                      <button
                        onClick={() => navigate(`/play-quiz/${quiz.id}`)}
                        className={s.buttonPlay}
                      >
                        Играть
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className={s.sidebar}>
          <div className={s.leaderboardCard}>
            <Leaderboard />
          </div>
        </aside>
      </div>
    </div>
  );
}

export default Dashboard;
