import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Nav from "../../components/Nav/Nav";
import { getQuizById, submitQuizResults } from "../../services/quizService";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import s from "./PlayQuiz.module.css";

function PlayQuiz() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userAnswers, setUserAnswers] = useState([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }
        
        const quizData = await getQuizById(id, token);
        setQuiz(quizData);
        setUserAnswers(Array(quizData.questions.length).fill(''));
      } catch (err) {
        console.error('Ошибка при загрузке викторины:', err);
        setError('Не удалось загрузить викторину. Пожалуйста, попробуйте позже.');
        toast.error('Ошибка при загрузке викторины');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuiz();
  }, [id, navigate]);

  const handleAnswer = () => {
    if (!answer || !answer.trim()) {
      toast.warning('Пожалуйста, введите ответ');
      return;
    }

    const newUserAnswers = [...userAnswers];
    const trimmedAnswer = answer.trim();
    newUserAnswers[current] = trimmedAnswer;
    setUserAnswers(newUserAnswers);

    // Проверяем ответ с защитой от null/undefined
    let isCorrect = false;
    const currentQuestion = quiz?.questions?.[current];
    
    if (currentQuestion && currentQuestion.answer) {
      isCorrect = trimmedAnswer.toLowerCase() === currentQuestion.answer.toString().trim().toLowerCase();
      
      if (isCorrect) {
        setScore(prev => prev + 1);
      }
    } else {
      console.error('Ошибка: не удалось проверить ответ - вопрос или ответ отсутствует');
    }

    // Переходим к следующему вопросу или завершаем викторину
    if (current + 1 < quiz.questions.length) {
      setCurrent(prev => prev + 1);
      setAnswer(userAnswers[current + 1] || '');
    } else {
      finishQuiz(isCorrect);
    }
  };

  const finishQuiz = async (isLastAnswerCorrect) => {
    const finalScore = score + (isLastAnswerCorrect ? 1 : 0);
    const percentage = Math.round((finalScore / quiz.questions.length) * 100);
    
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await submitQuizResults(id, {
          score: finalScore,
          totalQuestions: quiz.questions.length,
          answers: userAnswers.map((answer, index) => ({
            questionId: quiz.questions[index].id,
            userAnswer: answer,
            isCorrect: answer.toLowerCase() === quiz.questions[index].answer.trim().toLowerCase()
          }))
        }, token);
      }
      
      setShowResults(true);
    } catch (err) {
      console.error('Ошибка при сохранении результатов:', err);
      toast.error('Не удалось сохранить результаты');
    }
  };

  const handleNext = () => {
    if (current + 1 < quiz.questions.length) {
      setCurrent(prev => prev + 1);
      setAnswer(userAnswers[current + 1] || '');
    }
  };

  const handlePrev = () => {
    if (current > 0) {
      setCurrent(prev => prev - 1);
      setAnswer(userAnswers[current - 1] || '');
    }
  };

  const handleQuestionClick = (index) => {
    setCurrent(index);
    setAnswer(userAnswers[index] || '');
  };

  const restartQuiz = () => {
    setCurrent(0);
    setScore(0);
    setAnswer('');
    setUserAnswers(Array(quiz.questions.length).fill(''));
    setShowResults(false);
  };

  if (isLoading) {
    return (
      <div className={s.playQuizPage}>
        <Nav />
        <div className={s.loadingContainer}>
          <div className={s.loadingSpinner}></div>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className={s.playQuizPage}>
        <Nav />
        <div className={s.errorContainer}>
          <p className={s.errorText}>{error || 'Викторина не найдена'}</p>
          <button onClick={() => navigate('/dashboard')} className={s.backButton}>
            Вернуться на главную
          </button>
        </div>
      </div>
    );
  }

  if (showResults) {
    const percentage = Math.round((score / quiz.questions.length) * 100);
    return (
      <div className={s.playQuizPage}>
        <Nav />
        <div className={s.resultsContainer}>
          <h2 className={s.resultsTitle}>Результаты викторины</h2>
          <div className={s.resultsCard}>
            <div className={s.resultsScore}>
              <span className={s.scoreNumber}>{score}</span>
              <span className={s.scoreDivider}>/</span>
              <span className={s.scoreTotal}>{quiz.questions.length}</span>
            </div>
            <div className={s.resultsPercentage}>
              {percentage}% правильных ответов
            </div>
            <div className={s.resultsFeedback}>
              {percentage >= 80 
                ? 'Отличный результат! 🎉' 
                : percentage >= 50 
                  ? 'Хороший результат! 👍' 
                  : 'Попробуйте еще раз! 💪'}
            </div>
            <div className={s.resultsActions}>
              <button 
                onClick={() => navigate('/dashboard')} 
                className={s.resultsButton}
              >
                На главную
              </button>
              <button 
                onClick={restartQuiz} 
                className={`${s.resultsButton} ${s.resultsButtonRetry}`}
              >
                Пройти заново
              </button>
            </div>
          </div>
          
          <div className={s.answersReview}>
            <h3>Проверьте свои ответы:</h3>
            <div className={s.answersList}>
              {quiz.questions.map((q, index) => {
                const isCorrect = userAnswers[index]?.toLowerCase() === q.answer.trim().toLowerCase();
                return (
                  <div 
                    key={index} 
                    className={`${s.answerItem} ${isCorrect ? s.correct : s.incorrect}`}
                  >
                    <div className={s.answerQuestion}>
                      <strong>Вопрос {index + 1}:</strong> {q.question}
                    </div>
                    <div className={s.answerUser}>
                      <strong>Ваш ответ:</strong> {userAnswers[index] || 'Нет ответа'}
                    </div>
                    {!isCorrect && (
                      <div className={s.answerCorrect}>
                        <strong>Правильный ответ:</strong> {q.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={s.playQuizPage}>
      <Nav />
      <div className={s.playQuizContainer}>
        <div className={s.quizHeader}>
          <h1 className={s.quizTitle}>{quiz.title}</h1>
          {quiz.description && <p className={s.quizDescription}>{quiz.description}</p>}
          <div className={s.quizProgress}>
            <div 
              className={s.progressBar} 
              style={{
                width: `${((current + 1) / quiz.questions.length) * 100}%`
              }}
            ></div>
            <div className={s.progressText}>
              Вопрос {current + 1} из {quiz.questions.length}
            </div>
          </div>
        </div>

        <div className={s.quizContent}>
          <div className={s.questionBlock}>
            <div className={s.questionText}>
              {quiz.questions[current].question}
            </div>
            
            <div className={s.answerInputContainer}>
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAnswer()}
                placeholder="Введите ваш ответ..."
                className={s.inputAnswer}
                autoFocus
              />
              <button 
                onClick={handleAnswer} 
                className={s.buttonAnswer}
                disabled={!answer.trim()}
              >
                {current === quiz.questions.length - 1 ? 'Завершить' : 'Ответить'}
              </button>
            </div>
          </div>

          <div className={s.navigation}>
            <button 
              onClick={handlePrev} 
              className={s.navButton}
              disabled={current === 0}
            >
              Назад
            </button>
            
            <div className={s.questionIndicators}>
              {quiz.questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => handleQuestionClick(index)}
                  className={`${s.questionIndicator} ${
                    current === index ? s.active : ''
                  } ${
                    userAnswers[index] ? s.answered : ''
                  }`}
                  title={`Вопрос ${index + 1}`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
            
            <button 
              onClick={handleNext} 
              className={s.navButton}
              disabled={current === quiz.questions.length - 1}
            >
              Далее
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayQuiz;
