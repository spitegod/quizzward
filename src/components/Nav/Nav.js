import { Link } from "react-router-dom";
import s from "./Nav.module.css";

function Nav() {
    return (
        <nav className={s.navigation}>
            <div className={s.brand}>
                <span className={s.brandBadge}>QZ</span>
                <div className={s.brandText}>
                    <span className={s.brandTitle}>Quizzward</span>
                    <span className={s.brandSubtitle}>живая викторина</span>
                </div>
            </div>

            <div className={s.navLeft}>
                <Link to="/dashboard" className={`${s.navLink} ${s.active}`}>Главная</Link>
                <Link to="/profile" className={s.navLink}>Профиль</Link>
            </div>

            <Link to="/login" className={`${s.navLink} ${s.logout}`}>Выйти</Link>
        </nav>
    );
}

export default Nav;
