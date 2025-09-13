import { Link } from "react-router-dom";
import s from "./Dashboard.module.css"
function Dashboard() {
    return (
        <div className={s.dashboardContainer}>
            <nav className={s.navigation}>
                <div className={s.navLeft}>
                    <Link to="/dashboard" className={`${s.navLink} ${s.active}`}>Главная</Link>
                </div>
                <Link to="/login" className={s.navLink}>Выйти</Link>
            </nav>
            <div className={s.dashboardContent}>
                <h2 className={s.dashboardMainText}>Главная страница</h2>
                <p className={s.myQuizzes}>Мои викторины</p>
                <button className={s.buttonCreate}>Создать викторину</button>
            </div>
        </div>
    )
}

export default Dashboard