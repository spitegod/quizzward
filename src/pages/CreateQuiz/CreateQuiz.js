import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Nav from "../../components/Nav/Nav";
import s from "./CreateQuiz.module.css";
import { createQuiz, getQuizById, updateQuiz } from "../../services/quizService";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function CreateQuiz({ isEdit = false }) {
    const navigate = useNavigate();
    const { id } = useParams();
    const [quizName, setQuizName] = useState("");
    const [description, setDescription] = useState("");
    const [questions, setQuestions] = useState([{ question: "", answer: "" }]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isEdit && id) {
            loadQuiz();
        }
    }, [id, isEdit]);

    const loadQuiz = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem('token');
            const quiz = await getQuizById(id, token);
            setQuizName(quiz.title);
            setDescription(quiz.description || '');
            setQuestions(quiz.questions || []);
        } catch (error) {
            console.error('Ошибка при загрузке викторины:', error);
            toast.error('Не удалось загрузить викторину');
        } finally {
            setIsLoading(false);
        }
    };

    const addQuestion = () => {
        setQuestions([...questions, { question: "", answer: "" }]);
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

    const saveQuiz = async () => {
        if (!quizName.trim()) {
            toast.error('Введите название викторины');
            return;
        }

        if (questions.some(q => !q.question.trim() || !q.answer.trim())) {
            toast.error('Заполните все поля вопросов и ответов');
            return;
        }

        try {
            setIsLoading(true);
            const token = localStorage.getItem('token');
            const quizData = {
                title: quizName,
                description: description.trim(),
                questions: questions.map(q => ({
                    question: q.question.trim(),
                    answer: q.answer.trim()
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
                setQuestions([{ question: "", answer: "" }]);
            }
            
            navigate('/dashboard');
        } catch (error) {
            console.error('Ошибка при сохранении викторины:', error);
            toast.error('Не удалось сохранить викторину');
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
                                value={q.question}
                                onChange={(e) => handleQuestionChange(i, "question", e.target.value)}
                                className={s.inputQuestion}
                                disabled={isLoading}
                            />
                            <input
                                type="text"
                                placeholder="Ответ"
                                value={q.answer}
                                onChange={(e) => handleQuestionChange(i, "answer", e.target.value)}
                                className={s.inputAnswer}
                                disabled={isLoading}
                            />
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
                </div>
            </div>
        </div>
    );
}

export default CreateQuiz;
