import { useNavigate } from "react-router-dom";
import s from "./Dashboard.module.css";
import Nav from "../../components/Nav/Nav";
import { useEffect, useState, useRef } from "react";
import Leaderboard from "../../components/Leaderboard/Leaderboard";
import { getQuizzes, deleteQuiz } from "../../services/quizService";
import { getCurrentUser } from "../../services/userService";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const QUESTION_COUNT_OPTIONS = [
  { value: '0', label: 'Любое количество' },
  { value: '5', label: 'До 5 вопросов' },
  { value: '10', label: 'До 10 вопросов' },
  { value: '15', label: 'До 15 вопросов' },
  { value: '20', label: 'Более 20 вопросов' }
];

function Dashboard() {
  const navigate = useNavigate();
  const [allQuizzes, setAllQuizzes] = useState({ myQuizzes: [], publicQuizzes: [] });
  const [filteredQuizzes, setFilteredQuizzes] = useState({ myQuizzes: [], publicQuizzes: [] });
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [questionCountFilter, setQuestionCountFilter] = useState('0');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryRef = useRef(null);
  const [availableCategories, setAvailableCategories] = useState([]);

  const token = localStorage.getItem('token');

  // Fetch quizzes and categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Load user data
        const userData = await getCurrentUser();
        setIsAdmin(userData.username === 'admin');

        // Load quizzes
        const data = await getQuizzes(token);
        
        // Extract all unique categories from quizzes
        const allCategories = new Set();
        const myQuizzes = data.myQuizzes || [];
        const publicQuizzes = data.publicQuizzes || [];
        
        [...myQuizzes, ...publicQuizzes].forEach(quiz => {
          if (quiz.categories && Array.isArray(quiz.categories)) {
            quiz.categories.forEach(cat => {
              if (typeof cat === 'object' && cat.name) {
                allCategories.add(cat.name);
              } else if (typeof cat === 'string') {
                allCategories.add(cat);
              }
            });
          }
        });

        setAvailableCategories(Array.from(allCategories).sort());
        setAllQuizzes({
          myQuizzes,
          publicQuizzes
        });
        setError(null);
      } catch (err) {
        console.error('Ошибка при загрузке данных:', err);
        setError('Не удалось загрузить данные. Пожалуйста, попробуйте снова.');
        toast.error('Ошибка при загрузке данных');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token]);

  // Apply filters when they change
  useEffect(() => {
    const filterQuizzes = (quizzes) => {
      return quizzes.filter(quiz => {
        // Filter by search term (title)
        const matchesSearch = quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (quiz.description && quiz.description.toLowerCase().includes(searchTerm.toLowerCase()));
        
        // Filter by categories
        const matchesCategories = selectedCategories.length === 0 || 
          (quiz.categories && quiz.categories.some(cat => {
            const catName = typeof cat === 'object' ? cat.name : cat;
            return selectedCategories.includes(catName);
          }));
        
        // Filter by question count
        const matchesQuestionCount = questionCountFilter === '0' || 
          (quiz.questions_count && (
            (questionCountFilter === '5' && quiz.questions_count <= 5) ||
            (questionCountFilter === '10' && quiz.questions_count <= 10) ||
            (questionCountFilter === '15' && quiz.questions_count <= 15) ||
            (questionCountFilter === '20' && quiz.questions_count > 20)
          ));
        
        return matchesSearch && matchesCategories && matchesQuestionCount;
      });
    };

    setFilteredQuizzes({
      myQuizzes: filterQuizzes(allQuizzes.myQuizzes),
      publicQuizzes: filterQuizzes(allQuizzes.publicQuizzes)
    });
  }, [allQuizzes, searchTerm, selectedCategories, questionCountFilter]);

  // Handle click outside category dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target)) {
        setIsCategoryDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleCategory = (category) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategories([]);
    setQuestionCountFilter('0');
  };

  const handleDeleteQuiz = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Вы уверены, что хотите удалить эту викторину?')) {
      try {
        await deleteQuiz(id, token);
        // Remove quiz from both lists
        setAllQuizzes(prev => ({
          myQuizzes: prev.myQuizzes.filter(quiz => quiz.id !== id),
          publicQuizzes: prev.publicQuizzes.filter(quiz => quiz.id !== id)
        }));
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
          <div className={s.searchContainer}>
            <input
              type="text"
              placeholder="Поиск по названию или описанию..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={s.searchInput}
            />
            
            <div className={s.filterGroup}>
              <label>Категории:</label>
              <div className={s.categorySelect} ref={categoryRef}>
                <div 
                  className={`${s.selectedCategories} ${isCategoryDropdownOpen ? s.active : ''}`}
                  onClick={() => !isLoading && setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                >
                  {selectedCategories.length > 0 ? (
                    <div className={s.categoryTags}>
                      {selectedCategories.slice(0, 2).map((cat, idx) => (
                        <span key={idx} className={s.categoryTag}>
                          {cat}
                        </span>
                      ))}
                      {selectedCategories.length > 2 && (
                        <span className={s.moreCategories}>+{selectedCategories.length - 2}</span>
                      )}
                    </div>
                  ) : (
                    <span className={s.placeholder}>Все категории</span>
                  )}
                  <span className={s.arrow}>▼</span>
                </div>
                
                {isCategoryDropdownOpen && (
                  <div className={s.categoryDropdown}>
                    {availableCategories.length > 0 ? (
                      availableCategories.map((category) => (
                        <label key={category} className={s.categoryOption}>
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(category)}
                            onChange={() => toggleCategory(category)}
                          />
                          <span className={s.checkmark}></span>
                          {category}
                        </label>
                      ))
                    ) : (
                      <div className={s.noCategories}>Нет доступных категорий</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className={s.filterGroup}>
              <label>Количество вопросов:</label>
              <select
                value={questionCountFilter}
                onChange={(e) => setQuestionCountFilter(e.target.value)}
                className={s.selectInput}
              >
                {QUESTION_COUNT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            {(searchTerm || selectedCategories.length > 0 || questionCountFilter !== '0') && (
              <button 
                onClick={resetFilters}
                className={s.resetButton}
                title="Сбросить фильтры"
              >
                Сбросить
              </button>
            )}
          </div>
          
          <div className={s.buttonsContainer}>
            {isAdmin && (
              <button
                onClick={() => navigate("/users-admin")}
                className={`${s.buttonCreate} ${s.adminButton}`}
              >
                Панель администратора
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
          <h3 className={s.sectionTitle}>
            Мои викторины
            {filteredQuizzes.myQuizzes.length > 0 && (
              <span className={s.quizCount}>({filteredQuizzes.myQuizzes.length})</span>
            )}
          </h3>
          {isLoading ? (
            <div className={s.quizGrid}>
              <p className={s.loading}>Загрузка викторин...</p>
            </div>
          ) : error ? (
            <div className={s.quizGrid}>
              <p className={s.error}>{error}</p>
            </div>
          ) : filteredQuizzes.myQuizzes.length === 0 ? (
            <div className={s.quizGrid}>
              <p className={s.emptyState}>
                {allQuizzes.myQuizzes.length === 0 
                  ? 'У вас пока нет созданных викторин'
                  : 'Нет викторин, соответствующих выбранным фильтрам'}
              </p>
            </div>
          ) : (
            <div className={s.quizGrid}>
              {filteredQuizzes.myQuizzes.map((quiz) => {
                console.log('Quiz data:', quiz);
                return (
                  <div key={quiz.id} className={s.quizItem}>
                    <div className={s.quizInfo}>
                      <h3 className={s.quizTitle}>{quiz.title}</h3>
                      {quiz.description && <p className={s.quizDescription}>{quiz.description}</p>}
                      <div className={s.quizMetaContainer}>
                        <p className={s.quizMeta}>
                          Вопросов: {quiz.questions_count || 0} • 
                          Автор: {quiz.author}
                        </p>
                        <div className={s.quizCategories}>
                          {quiz.categories && quiz.categories.length > 0 ? (
                            <>
                              {quiz.categories.slice(0, 3).map((category, idx) => {
                                // Handle both string and object formats for backward compatibility
                                const categoryName = typeof category === 'string' 
                                  ? category 
                                  : (category.name || 'Категория');
                                return (
                                  <span key={idx} className={s.categoryTag}>
                                    {categoryName}
                                  </span>
                                );
                              })}
                              {quiz.categories.length > 3 && (
                                <span className={s.moreCategories}>+{quiz.categories.length - 3}</span>
                              )}
                            </>
                          ) : (
                            <span className={s.noCategories}>Категории не указаны</span>
                          )}
                        </div>
                      </div>
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
                );
              })}
            </div>
          )}

          {/* Викторины других игроков */}
          <div>
            <h3 className={s.sectionTitle}>
              Викторины от других игроков
              {filteredQuizzes.publicQuizzes.length > 0 && (
                <span className={s.quizCount}>({filteredQuizzes.publicQuizzes.length})</span>
              )}
            </h3>
            {isLoading ? (
              <div className={s.quizGrid}>
                <p className={s.loading}>Загрузка викторин...</p>
              </div>
            ) : filteredQuizzes.publicQuizzes.length === 0 ? (
              <div className={s.quizGrid}>
                <p className={s.emptyState}>
                  {allQuizzes.publicQuizzes.length === 0 
                    ? 'Пока нет викторин от других игроков'
                    : 'Нет викторин, соответствующих выбранным фильтрам'}
                </p>
              </div>
            ) : (
              <div className={s.quizGrid}>
                {filteredQuizzes.publicQuizzes.map((quiz) => (
                  <div key={quiz.id} className={s.quizItem}>
                    <div className={s.quizInfo}>
                      <h3 className={s.quizTitle}>{quiz.title}</h3>
                      {quiz.description && <p className={s.quizDescription}>{quiz.description}</p>}
                      <div className={s.quizMetaContainer}>
                        <p className={s.quizMeta}>
                          Вопросов: {quiz.questions_count || 0} • 
                          Автор: {quiz.author}
                        </p>
                        <div className={s.quizCategories}>
                          {quiz.categories && quiz.categories.length > 0 ? (
                            <>
                              {quiz.categories.slice(0, 3).map((category, idx) => {
                                // Handle both string and object formats for backward compatibility
                                const categoryName = typeof category === 'string' 
                                  ? category 
                                  : (category.name || 'Категория');
                                return (
                                  <span key={idx} className={s.categoryTag}>
                                    {categoryName}
                                  </span>
                                );
                              })}
                              {quiz.categories.length > 3 && (
                                <span className={s.moreCategories}>+{quiz.categories.length - 3}</span>
                              )}
                            </>
                          ) : (
                            <span className={s.noCategories}>Категории не указаны</span>
                          )}
                        </div>
                      </div>
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
              )}
            </div>
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
