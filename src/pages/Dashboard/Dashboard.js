import { useNavigate } from "react-router-dom";
import s from "./Dashboard.module.css"
import Nav from "../../components/Nav/Nav";
import { useEffect, useState } from "react";

function Dashboard() {
    const navigate = useNavigate();
    const [quizzes, setQuizzes] = useState([]);

    useEffect(() => {
        const stored = JSON.parse(localStorage.getItem("quizzes") || "[]");
        setQuizzes(stored);
    }, []);

    return (
        <div className={s.dashboardContainer}>
            <Nav />
            <div className={s.dashboardContent}>
                <h2 className={s.dashboardMainText}>Главная страница</h2>
                <button onClick={() => navigate("/create-quiz")} className={s.buttonCreate}>Создать викторину</button>

                <h3 className={s.myQuizzes}>Мои викторины</h3>
                {quizzes.length === 0 && <p>Викторины пока не созданы</p>}
                {quizzes.map((q, i) => (
                    <div key={i} className={s.quizItem}>
                        <p>{q.name}</p>
                        <button onClick={() => navigate(`/play-quiz/${i}`)} className={s.buttonPlay}>Играть</button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Dashboard;
