import { Link } from "react-router-dom"
import s from "./NavAdmin.module.css"

function NavAdmin() {
    return (
        <nav className={s.navigation}>
            <div className={s.navLeft}>
                <div className={s.navAdminLogoContainer}>
                    <Link to="/users-admin" className={s.navAdminLogo}>АдминПанель</Link>
                </div>
                <Link to="/users-admin" className={s.navLink}>Пользователи</Link>
                <Link to="/quizzes-admin" className={s.navLink}>Викторины</Link>
            </div>
            <div className={s.navRight}>
                <Link to="/dashboard" className={s.navCta}>Главное меню</Link>
            </div>
        </nav>
    )
}

export default NavAdmin
