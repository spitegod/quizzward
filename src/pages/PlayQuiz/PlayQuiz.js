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
  const [selectedOption, setSelectedOption] = useState(null);
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
        const normalizedQuestions = (quizData.questions || []).map((q, index) => {
          let parsedOptions = [];
          try {
            parsedOptions = q.options ? JSON.parse(q.options) : [];
          } catch (err) {
            parsedOptions = [];
          }

          let options = Array.isArray(parsedOptions) && parsedOptions.length > 0
            ? parsedOptions.slice(0, 4)
            : [q.answer ?? '', '', '', ''];

          if (options.length < 4) {
            options = [...options, ...Array(4 - options.length).fill('')];
          }

          const fallbackAnswer = q.answer ?? q.correct_answer ?? '';
          const correctAnswerIndexRaw = typeof q.correct_answer === 'number' ? q.correct_answer : 0;
          const correctAnswerIndex = Math.min(Math.max(correctAnswerIndexRaw, 0), options.length - 1);
          const optionAnswer = options[correctAnswerIndex] ?? fallbackAnswer;

          return {
            ...q,
            questionText: q.question_text || q.question || `Вопрос ${index + 1}`,
            options,
            correctAnswer: correctAnswerIndex,
            correctText: (optionAnswer ?? fallbackAnswer ?? '').toString()
          };
        });

        setQuiz({ ...quizData, questions: normalizedQuestions });
        setUserAnswers(Array(normalizedQuestions.length).fill(null));
        setSelectedOption(null);
        setCurrent(0);
        setScore(0);
        setShowResults(false);
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
    if (selectedOption === null) {
      toast.warning('Выберите вариант ответа');
      return;
    }

    const newUserAnswers = [...userAnswers];
    newUserAnswers[current] = selectedOption;
    setUserAnswers(newUserAnswers);

    const currentQuestion = quiz?.questions?.[current];
    const correctIndex = typeof currentQuestion?.correctAnswer === 'number'
      ? currentQuestion.correctAnswer
      : (currentQuestion?.options || []).findIndex(opt =>
          opt && currentQuestion.correctText &&
          opt.toString().trim().toLowerCase() === currentQuestion.correctText.trim().toLowerCase()
        );
    const isCorrect = selectedOption === correctIndex;

    if (isCorrect) {
      setScore(prev => prev + 1);
    }

    if (current + 1 < quiz.questions.length) {
      const nextIndex = current + 1;
      setCurrent(nextIndex);
      setSelectedOption(newUserAnswers[nextIndex] ?? null);
    } else {
      finishQuiz(isCorrect);
    }
  };

  const finishQuiz = async (isLastAnswerCorrect) => {
    const finalScore = score + (isLastAnswerCorrect ? 1 : 0);

    try {
      const token = localStorage.getItem('token');
      if (token) {
        await submitQuizResults(id, {
          score: finalScore,
          totalQuestions: quiz.questions.length,
          answers: userAnswers.map((userAnswer, index) => {
            const safeAnswer = userAnswer == null ? '' : userAnswer;
            const cleanAnswer = safeAnswer.toString().trim().toLowerCase();
            const correctAnswer = (quiz.questions[index].correctText || '').trim().toLowerCase();

            return {
              questionId: quiz.questions[index].id,
              userAnswer: safeAnswer,
              isCorrect: cleanAnswer === correctAnswer
            };
          })
        }, token);
      }
    } catch (err) {
      console.error('Ошибка при сохранении результатов:', err);
      toast.error('Не удалось сохранить результаты');
    } finally {
      setScore(finalScore);
      setShowResults(true);
    }
  };

  const handleNext = () => {
    if (current + 1 < quiz.questions.length) {
      const nextIndex = current + 1;
      setCurrent(nextIndex);
      setSelectedOption(userAnswers[nextIndex] ?? null);
    }
  };

  const handlePrev = () => {
    if (current > 0) {
      const prevIndex = current - 1;
      setCurrent(prevIndex);
      setSelectedOption(userAnswers[prevIndex] ?? null);
    }
  };

  const handleQuestionClick = (index) => {
    setCurrent(index);
    setSelectedOption(userAnswers[index] ?? null);
  };

  const restartQuiz = () => {
    setCurrent(0);
    setScore(0);
    setSelectedOption(null);
    setUserAnswers(Array(quiz.questions.length).fill(null));
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
                const questionText = q.questionText;
                const correctAnswer = (q.correctText || '').trim();
                const userIndex = userAnswers[index];
                const userAnswer = typeof userIndex === 'number' ? (q.options[userIndex] || '').toString().trim() : '';
                const isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();
                return (
                  <div 
                    key={index} 
                    className={`${s.answerItem} ${isCorrect ? s.correct : s.incorrect}`}
                  >
                    <div className={s.answerQuestion}>
                      <strong>Вопрос {index + 1}:</strong> {questionText}
                    </div>
                    <div className={s.answerUser}>
                      <strong>Ваш ответ:</strong> {userAnswer || 'Нет ответа'}
                    </div>
                    {!isCorrect && (
                      <div className={s.answerCorrect}>
                        <strong>Правильный ответ:</strong> {correctAnswer || 'Нет ответа'}
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
          <div className={s.quizTitleRow}>
            <h1 className={s.quizTitle}>{quiz.title}</h1>
          </div>
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
              {quiz.questions[current].questionText}
            </div>
            
            <div className={s.optionsGrid}>
              {quiz.questions[current].options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedOption(idx)}
                  className={`${s.optionButton} ${selectedOption === idx ? s.optionSelected : ''}`}
                >
                  <span className={s.optionLabel}>{String.fromCharCode(65 + idx)}</span>
                  <span className={s.optionText}>{option}</span>
                </button>
              ))}
            </div>

            <div className={s.answerInputContainer}>
              <button 
                onClick={handleAnswer} 
                className={s.buttonAnswer}
                disabled={selectedOption === null}
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
