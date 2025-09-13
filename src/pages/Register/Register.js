import { Link, useNavigate } from "react-router-dom";
import s from "./Register.module.css";

function Register() {
    const navigate = useNavigate();
    
    const handleRegister = () => {
        navigate("/dashboard")
    }
    return (
        <div className={s.loginPage}>
            <div className={s.loginContainer}>
                <div className={s.authLinks}>
                    <Link to="/login" className={s.authLink}>Вход</Link>
                    <Link to="/register" className={`${s.authLink} ${s.active}`}>Регистрация</Link>
                </div>
                <div className={s.companyName}>
                    Quizzward
                </div>
                <div className={s.loginInputs}>
                    <input type="text" className={s.inputLogin} placeholder="Логин" />
                    <input type="password" className={`${s.input} ${s.inputPassword}`} placeholder="Пароль" />
                </div>
                <button onClick={handleRegister} className={s.buttonLogin}>
                    Регистрация
                </button>
            </div>
        </div>
    )
}

export default Register