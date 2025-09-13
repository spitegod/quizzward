import "./Login.css";

function Login() {
    return (
        <div className="login-page">
            <div className="login-container">
                <div className="auth-links">
                    <a className="a auth-link active">Вход</a>
                    <a className="a auth-link">Регистрация</a>
                </div>
                <div className="company-name">
                    Quizzward
                </div>
                <div className="login-inputs">
                    <input type="text" className="input input-login" placeholder="Логин" />
                    <input type="password" className="input input-password" placeholder="Пароль" />
                </div>
                <button className="button button-login">
                    Войти
                </button>
            </div>
        </div>
    )
}

export default Login