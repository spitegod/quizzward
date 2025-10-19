import { Link } from "react-router-dom"
import s from "./NavAdmin.module.css"

function NavAdmin() {
    return (
        <nav className={s.navigation}>
            <div className={s.navLeft}>
                <div className={s.navAdminLogoContainer}>

                <Link to="/admin" className={s.navAdminLogo}>АдминПанель</Link>
                </div>
                <Link to="/admin" className={`${s.navLink} ${s.active}`}>Главная</Link>
                <Link to="/profile" className={s.navLink}>Пользователи</Link>
                <Link to="/login" className={s.navLink}>Викторины</Link>
            </div>
            <Link to="/login" className={s.navLink}>Выход</Link>
        </nav>
    )
}

export default NavAdmin