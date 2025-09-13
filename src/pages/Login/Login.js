import { Link } from "react-router-dom";
import s from "./Login.module.css";

function Login() {
    return (
        <div className={s.loginPage}>
            <div className={s.loginContainer}>
                <div className={s.authLinks}>
                    <Link to="/login" className={`${s.authLink} ${s.active}`}>Вход</Link>
                    <Link to="/register" className={s.authLink}>Регистрация</Link>
                </div>
                <div className={s.companyName}>
                    Quizzward
                </div>
                <div className={s.loginInputs}>
                    <input type="text" className={s.inputLogin} placeholder="Логин" />
                    <input type="password" className={`${s.input} ${s.inputPassword}`} placeholder="Пароль" />
                </div>
                <button className={s.buttonLogin}>
                    Войти
                </button>
            </div>
        </div>
    )
}

export default Login