import { useNavigate } from "react-router-dom";
import s from "./Dashboard.module.css";
import Nav from "../../components/Nav/Nav";
import { useEffect, useState } from "react";
import Leaderboard from "../../components/Leaderboard/Leaderboard";
import { getQuizzes, deleteQuiz } from "../../services/quizService";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function Dashboard() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const data = await getQuizzes(token);
        setQuizzes(data);
        setError(null);
      } catch (err) {
        console.error('Ошибка при загрузке викторин:', err);
        setError('Не удалось загрузить викторины. Пожалуйста, попробуйте снова.');
        toast.error('Ошибка при загрузке викторин');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuizzes();
  }, [token]);

  const handleDeleteQuiz = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Вы уверены, что хотите удалить эту викторину?')) {
      try {
        await deleteQuiz(id, token);
        setQuizzes(quizzes.filter(quiz => quiz.id !== id));
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
          <button
            onClick={() => navigate("/create-quiz")}
            className={s.buttonCreate}
          >
            Создать викторину
          </button>
        </div>

        <h3 className={s.myQuizzes}>Мои викторины</h3>

        <div className={s.quizGrid}>
          {isLoading ? (
            <p className={s.emptyState}>Загрузка викторин...</p>
          ) : error ? (
            <p className={s.error}>{error}</p>
          ) : quizzes.length === 0 ? (
            <p className={s.emptyState}>Викторины пока не созданы</p>
          ) : (
            quizzes.map((quiz) => (
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
            ))
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
