import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FiSearch } from 'react-icons/fi';
import NavAdmin from '../../components/NavAdmin/NavAdmin';
import { getQuizzes, deleteQuiz } from '../../services/quizService';
import s from './QuizzesAdmin.module.css';

const QuizzesAdmin = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  // Filter quizzes based on search term
  const filteredQuizzes = useMemo(() => {
    if (!searchTerm) return quizzes;
    
    const term = searchTerm.toLowerCase();
    return quizzes.filter(quiz => 
      quiz.title.toLowerCase().includes(term) ||
      (quiz.description && quiz.description.toLowerCase().includes(term)) ||
      (quiz.author && quiz.author.toLowerCase().includes(term))
    );
  }, [quizzes, searchTerm]);

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const token = localStorage.getItem('token');
        const data = await getQuizzes(token);
        // Combine both user's and public quizzes
        const allQuizzes = [...(data.myQuizzes || []), ...(data.publicQuizzes || [])];
        setQuizzes(allQuizzes);
        setError(null);
      } catch (err) {
        console.error('Ошибка при загрузке викторин:', err);
        setError('Не удалось загрузить викторины');
        toast.error('Ошибка при загрузке викторин');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuizzes();
  }, []);

  const handleDeleteQuiz = async (quizId, e) => {
    e.stopPropagation();
    if (window.confirm('Вы уверены, что хотите удалить эту викторину? Это действие нельзя отменить.')) {
      try {
        const token = localStorage.getItem('token');
        await deleteQuiz(quizId, token);
        setQuizzes(prevQuizzes => prevQuizzes.filter(quiz => quiz.id !== quizId));
        toast.success('Викторина успешно удалена');
      } catch (err) {
        console.error('Ошибка при удалении викторины:', err);
        toast.error('Не удалось удалить викторину');
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Неизвестно';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className={s.page}>
        <NavAdmin />
        <div className={s.content}>
          <h2 className={s.h2}>Управление викторинами</h2>
          <div className={s.loading}>Загрузка викторин...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={s.page}>
      <NavAdmin />
      <div className={s.content}>
        <div className={s.header}>
          <h2 className={s.h2}>Управление викторинами</h2>
          <div className={s.searchContainer}>
            <FiSearch className={s.searchIcon} />
            <input
              type="text"
              placeholder="Поиск по названию, описанию или автору..."
              className={s.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {error ? (
          <div className={s.error}>{error}</div>
        ) : filteredQuizzes.length === 0 ? (
          <div className={s.emptyState}>
            {searchTerm ? 'Ничего не найдено. Попробуйте изменить параметры поиска.' : 'Нет доступных викторин'}
          </div>
        ) : (
          <div className={s.quizzesTable}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th className={s.colIndex}>№</th>
                  <th>Название</th>
                  <th>Описание</th>
                  <th>Автор</th>
                  <th>Вопросов</th>
                  <th>Дата создания</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuizzes.map((quiz, index) => (
                  <tr key={quiz.id} className={s.quizRow}>
                    <td className={s.colIndex}>{index + 1}</td>
                    <td className={s.quizTitle} title={quiz.title}>
                      {quiz.title}
                    </td>
                    <td className={s.quizDescription} title={quiz.description}>
                      {quiz.description || '—'}
                    </td>
                    <td className={s.quizAuthor}>
                      {quiz.author || 'Неизвестно'}
                    </td>
                    <td className={s.questionsCount}>
                      {quiz.questions_count || 0}
                    </td>
                    <td className={s.quizDate}>
                      {formatDate(quiz.created_at)}
                    </td>
                    <td className={s.actions}>
                      <div className={s.actionsContainer}>
                        <button
                          onClick={() => navigate(`/edit-quiz/${quiz.id}`)}
                          className={s.editButton}
                        >
                          Редактировать
                        </button>
                        <button
                          onClick={(e) => handleDeleteQuiz(quiz.id, e)}
                          className={s.deleteButton}
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizzesAdmin;