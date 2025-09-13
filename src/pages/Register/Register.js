import { Link } from "react-router-dom";
import "./Register.css";

function Register() {
    return (
        <div className="login-page">
            <div className="login-container">
                <div className="auth-links">
                    <Link to="/login" className="auth-link">Вход</Link>
                    <Link to="/register" className="auth-link active">Регистрация</Link>
                </div>
                <div className="company-name">
                    Quizzward
                </div>
                <div className="login-inputs">
                    <input type="text" className="input-login" placeholder="Логин" />
                    <input type="password" className="input-password" placeholder="Пароль" />
                </div>
                <button className="button-login">
                    Регистрация
                </button>
            </div>
        </div>
    )
}

export default Register