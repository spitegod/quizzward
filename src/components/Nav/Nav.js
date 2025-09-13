import { Link } from "react-router-dom"
import s from "./Nav.module.css"

function Nav() {
    return (
        <nav className={s.navigation}>
            <div className={s.navLeft}>
                <Link to="/dashboard" className={`${s.navLink} ${s.active}`}>Главная</Link>
            </div>
            <Link to="/login" className={s.navLink}>Выйти</Link>
        </nav>
    )
}

export default Nav