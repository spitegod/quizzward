import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Nav from "../../components/Nav/Nav";
import s from "./PlayQuiz.module.css";

function PlayQuiz() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [answer, setAnswer] = useState("");

  useEffect(() => {
    const quizzes = JSON.parse(localStorage.getItem("quizzes") || "[]");
    const quizIndex = parseInt(id, 10);
    if (!quizzes[quizIndex]) {
      navigate("/dashboard");
      return;
    }
    setQuiz(quizzes[quizIndex]);
  }, [id, navigate]);

  if (!quiz) return null;

  const handleAnswer = () => {
    if (answer.trim() === quiz.questions[current].answer.trim()) {
      setScore(prev => prev + 1);
    }
    setAnswer("");
    if (current + 1 < quiz.questions.length) {
      setCurrent(prev => prev + 1);
    } else {
      alert(`Викторина завершена! Результат: ${score + (answer.trim() === quiz.questions[current].answer.trim() ? 1 : 0)}/${quiz.questions.length}`);
      navigate("/dashboard");
    }
  };

  return (
    <div className={s.playQuizPage}>
      <Nav />
      <div className={s.playQuizContainer}>
        <h2 className={s.quizTitle}>{quiz.name}</h2>
        <div className={s.questionBlock}>
          <p className={s.questionText}>
            Вопрос {current + 1}/{quiz.questions.length}:
          </p>
          <p className={s.questionTextMain}>{quiz.questions[current].question}</p>
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Ваш ответ"
            className={s.inputAnswer}
          />
          <button onClick={handleAnswer} className={s.buttonAnswer}>Ответить</button>
        </div>
      </div>
    </div>
  );
}

export default PlayQuiz;
