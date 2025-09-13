import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Nav from "../../components/Nav/Nav";
import s from "./CreateQuiz.module.css";

function CreateQuiz() {
    const navigate = useNavigate();
    const [quizName, setQuizName] = useState("");
    const [questions, setQuestions] = useState([{ question: "", answer: "" }]);

    const addQuestion = () => setQuestions([...questions, { question: "", answer: "" }]);

    const handleQuestionChange = (index, field, value) => {
        const newQuestions = [...questions];
        newQuestions[index][field] = value;
        setQuestions(newQuestions);
    };

    const saveQuiz = () => {
        if (!quizName) return alert("Введите название викторины");
        const existingQuizzes = JSON.parse(localStorage.getItem("quizzes") || "[]");
        const newQuiz = { name: quizName, questions };
        localStorage.setItem("quizzes", JSON.stringify([...existingQuizzes, newQuiz]));
        setQuizName("");
        setQuestions([{ question: "", answer: "" }]);
        alert("Викторина создана!");
    };

    return (
        <div className={s.quizContainer}>
            <Nav />
            <div className={s.quizContent}>
                <h2>Создать викторину</h2>
                <input
                    type="text"
                    placeholder="Название викторины"
                    value={quizName}
                    onChange={(e) => setQuizName(e.target.value)}
                    className={s.inputQuizName}
                />
                {questions.map((q, i) => (
                    <div key={i} className={s.questionBlock}>
                        <input
                            placeholder="Вопрос"
                            value={q.question}
                            onChange={(e) => handleQuestionChange(i, "question", e.target.value)}
                            className={s.inputQuestion}
                        />
                        <input
                            placeholder="Ответ"
                            value={q.answer}
                            onChange={(e) => handleQuestionChange(i, "answer", e.target.value)}
                            className={s.inputAnswer}
                        />
                    </div>
                ))}
                <button onClick={addQuestion} className={s.buttonAddQuestion}>Добавить вопрос</button>
                <button onClick={saveQuiz} className={s.buttonSaveQuiz}>Сохранить викторину</button>
                <button onClick={() => navigate("/dashboard")} className={s.buttonToDashboard}>На главную</button>
            </div>
        </div>
    );
}

export default CreateQuiz;
