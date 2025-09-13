import { Link } from "react-router-dom";
import s from "./Dashboard.module.css"
import Nav from "../../components/Nav/Nav";

function Dashboard() {
    return (
        <div className={s.dashboardContainer}>
            <Nav />
            <div className={s.dashboardContent}>
                <h2 className={s.dashboardMainText}>Главная страница</h2>
                <p className={s.myQuizzes}>Мои викторины</p>
                <button className={s.buttonCreate}>Создать викторину</button>
            </div>
        </div>
    )
}

export default Dashboard