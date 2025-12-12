import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Nav from "../../components/Nav/Nav";
import s from "./CreateQuiz.module.css";
import { createQuiz, getQuizById, updateQuiz } from "../../services/quizService";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// Remove the import of QUIZ_CATEGORIES since we'll fetch them from the backend

function CreateQuiz({ isEdit = false }) {
    const navigate = useNavigate();
    const { id } = useParams();
    const [quizName, setQuizName] = useState("");
    const [description, setDescription] = useState("");
    const [categories, setCategories] = useState([]);
    const [availableCategories, setAvailableCategories] = useState([]);
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const createEmptyQuestion = () => ({
        question: "",
        options: ["", "", "", ""],
        correctAnswer: 0
    });
    const [questions, setQuestions] = useState([createEmptyQuestion()]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingCategories, setIsLoadingCategories] = useState(true);
    const categoryRef = useRef(null);

    // Handle click outside to close category dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (categoryRef.current && !categoryRef.current.contains(event.target)) {
                setIsCategoryOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Fetch available categories from the backend
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('http://localhost:4000/api/categories', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error('Failed to fetch categories');
                }
                
                const data = await response.json();
                setAvailableCategories(data);
                
                // If editing, load the quiz after categories are loaded
                if (isEdit && id) {
                    await loadQuiz();
                }
            } catch (error) {
                console.error('Error fetching categories:', error);
                toast.error('Не удалось загрузить категории');
            } finally {
                setIsLoadingCategories(false);
            }
        };
        
        fetchCategories();
    }, [id, isEdit]);

    const loadQuiz = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem('token');
            const quiz = await getQuizById(id, token);
            setQuizName(quiz.title);
            setDescription(quiz.description || '');
            
            // Convert category names to IDs if needed
            if (quiz.categories && quiz.categories.length > 0) {
                const categoryIds = quiz.categories.map(cat => {
                    if (typeof cat === 'object') return cat.id;
                    // If it's just a name, find the ID
                    const found = availableCategories.find(c => c.name === cat);
                    return found ? found.id : null;
                }).filter(Boolean);
                
                setCategories(categoryIds);
            } else {
                setCategories([]);
            }
            
            // Преобразуем вопросы из формата БД в формат формы
            const formattedQuestions = (quiz.questions || []).map(q => {
                let options = [];
                try {
                    options = q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : [];
                } catch (e) {
                    console.error('Failed to parse options:', q.options, e);
                    options = [];
                }

                if (!Array.isArray(options) || options.length === 0) {
                    options = [q.answer || '', '', '', ''];
                }

                if (options.length < 4) {
                    options = [...options, ...Array(4 - options.length).fill('')];
                } else if (options.length > 4) {
                    options = options.slice(0, 4);
                }

                return {
                    question: q.question_text || q.question || '',
                    options,
                    correctAnswer: typeof q.correct_answer === 'number' ? q.correct_answer : 0
                };
            });

            setQuestions(formattedQuestions.length > 0 ? formattedQuestions : [createEmptyQuestion()]);
        } catch (error) {
            console.error('Ошибка при загрузке викторины:', error);
            toast.error('Не удалось загрузить викторину');
        } finally {
            setIsLoading(false);
        }
    };

    const addQuestion = () => {
        setQuestions([...questions, createEmptyQuestion()]);
    };

    const removeQuestion = (index) => {
        if (questions.length > 1) {
            const newQuestions = questions.filter((_, i) => i !== index);
            setQuestions(newQuestions);
        }
    };

    const handleQuestionChange = (index, field, value) => {
        const newQuestions = [...questions];
        newQuestions[index] = { ...newQuestions[index], [field]: value };
        setQuestions(newQuestions);
    };

    const handleOptionChange = (questionIndex, optionIndex, value) => {
        setQuestions(prev => prev.map((question, idx) => {
            if (idx !== questionIndex) return question;
            const updatedOptions = question.options.map((opt, optIdx) => optIdx === optionIndex ? value : opt);
            return { ...question, options: updatedOptions };
        }));
    };

    const handleCorrectAnswerChange = (questionIndex, optionIndex) => {
        setQuestions(prev => prev.map((question, idx) => (
            idx === questionIndex ? { ...question, correctAnswer: optionIndex } : question
        )));
    };

    const saveQuiz = async () => {
        setSubmitError('');
        if (!quizName.trim()) {
            toast.error('Введите название викторины');
            setSubmitError('Введите название викторины');
            return;
        }

        if (questions.some(q => !q.question || !q.question.trim() || q.options.some(opt => !opt || !opt.trim()))) {
            toast.error('Заполните вопрос и все варианты ответов');
            setSubmitError('Заполните вопрос и все варианты ответов');
            return;
        }

        if (categories.length === 0) {
            toast.error('Выберите хотя бы одну категорию');
            setSubmitError('Выберите хотя бы одну категорию');
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            toast.error('Сессия истекла. Войдите заново.');
            navigate('/login');
            return;
        }

        try {
            setIsLoading(true);

            const quizData = {
                title: quizName,
                description: description.trim(),
                categories: categories,
                questions: questions.map(q => ({
                    question: q.question.trim(),
                    options: q.options.map(opt => opt.trim()),
                    correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0
                }))
            };

            if (isEdit && id) {
                await updateQuiz(id, quizData, token);
                toast.success('Викторина успешно обновлена');
            } else {
                await createQuiz(quizData, token);
                toast.success('Викторина успешно создана');
                setQuizName('');
                setDescription('');
                setQuestions([createEmptyQuestion()]);
            }
            
            navigate('/dashboard');
        } catch (error) {
            console.error('Ошибка при сохранении викторины:', error);
            const msg = error?.response?.data?.error 
              || error?.response?.data?.message 
              || error?.message 
              || 'Не удалось сохранить викторину';
            toast.error(msg);
            setSubmitError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={s.quizContainer}>
            <Nav />
            <div className={s.quizContent}>
                <h2>{isEdit ? 'Редактировать викторину' : 'Создать викторину'}</h2>
                
                <div className={s.formGroup}>
                    <label className={s.label}>Название викторины</label>
                    <input
                        type="text"
                        placeholder="Введите название викторины"
                        value={quizName}
                        onChange={(e) => setQuizName(e.target.value)}
                        className={s.inputQuizName}
                        disabled={isLoading}
                    />
                </div>

                <div className={s.formGroup}>
                    <label className={s.label}>Описание (необязательно)</label>
                    <textarea
                        placeholder="Добавьте описание викторины"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className={s.textareaDescription}
                        disabled={isLoading}
                        rows="3"
                    />
                </div>

                <div className={s.formGroup}>
                    <label className={s.label}>Категории *</label>
                    <div className={s.categorySelect} ref={categoryRef}>
                        <div 
                            className={`${s.selectedCategories} ${isCategoryOpen ? s.active : ''}`}
                            onClick={() => !isLoading && setIsCategoryOpen(!isCategoryOpen)}
                        >
                            {categories.length > 0 ? (
                                <div className={s.categoryTags}>
                                    {categories.map((categoryId, index) => {
                                        const category = availableCategories.find(c => c.id === categoryId);
                                        return category ? (
                                            <span key={categoryId} className={s.categoryTag}>
                                                {category.name}
                                                <button 
                                                    type="button"
                                                    className={s.removeCategory}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setCategories(categories.filter(id => id !== categoryId));
                                                    }}
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ) : null;
                                    })}
                                </div>
                            ) : (
                                <span className={s.placeholder}>Выберите категории</span>
                            )}
                            <span className={s.arrow}>▼</span>
                        </div>
                        
                        {isCategoryOpen && (
                            <div className={s.categoryDropdown}>
                                {isLoadingCategories ? (
                                    <div className={s.loadingText}>Загрузка категорий...</div>
                                ) : availableCategories.length > 0 ? (
                                    availableCategories.map((category) => (
                                        <label key={category.id} className={s.categoryOption}>
                                            <input
                                                type="checkbox"
                                                checked={categories.includes(category.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setCategories([...categories, category.id]);
                                                    } else {
                                                        setCategories(categories.filter(id => id !== category.id));
                                                    }
                                                }}
                                            />
                                            <span className={s.checkmark}></span>
                                            {category.name}
                                        </label>
                                    ))
                                ) : (
                                    <div className={s.noCategories}>Нет доступных категорий</div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className={s.categoryHint}>Выберите одну или несколько категорий</div>
                </div>

                <div className={s.questionsList}>
                    <h3>Вопросы</h3>
                    {questions.map((q, i) => (
                        <div key={i} className={s.questionBlock}>
                            <div className={s.questionHeader}>
                                <span className={s.questionNumber}>Вопрос {i + 1}</span>
                                {questions.length > 1 && (
                                    <button 
                                        type="button"
                                        onClick={() => removeQuestion(i)}
                                        className={s.removeQuestion}
                                        disabled={isLoading}
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                            <input
                                type="text"
                                placeholder="Вопрос"
                                value={q.question || ''}
                                onChange={(e) => handleQuestionChange(i, "question", e.target.value)}
                                className={s.inputQuestion}
                                disabled={isLoading}
                            />
                            <div className={s.optionsGrid}>
                                {q.options.map((option, idx) => (
                                    <div key={idx} className={`${s.optionRow} ${q.correctAnswer === idx ? s.optionRowActive : ''}`}>
                                        <span className={s.optionIndex}>{String.fromCharCode(65 + idx)}</span>
                                        <input
                                            type="text"
                                            placeholder={`Вариант ${idx + 1}`}
                                            value={option}
                                            onChange={(e) => handleOptionChange(i, idx, e.target.value)}
                                            disabled={isLoading}
                                            className={s.optionInput}
                                        />
                                        <label className={s.correctToggle}>
                                            <input
                                                type="radio"
                                                name={`correct-${i}`}
                                                checked={q.correctAnswer === idx}
                                                onChange={() => handleCorrectAnswerChange(i, idx)}
                                                disabled={isLoading}
                                            />
                                            <span>Правильный</span>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    <button 
                        type="button" 
                        onClick={addQuestion} 
                        className={s.buttonAddQuestion}
                        disabled={isLoading}
                    >
                        + Добавить вопрос
                    </button>
                </div>

                <div className={s.actions}>
                    <button 
                        type="button" 
                        onClick={() => navigate("/dashboard")} 
                        className={s.buttonSecondary}
                        disabled={isLoading}
                    >
                        Отмена
                    </button>
                    <button 
                        type="button" 
                        onClick={saveQuiz} 
                        className={s.buttonPrimary}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <span className={s.buttonLoader}></span>
                        ) : isEdit ? (
                            'Сохранить изменения'
                        ) : (
                            'Создать викторину'
                        )}
                    </button>
                    {submitError && <div className={s.submitError}>{submitError}</div>}
                </div>
            </div>
        </div>
    );
}

export default CreateQuiz;
