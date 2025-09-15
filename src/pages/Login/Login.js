import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import s from "./Login.module.css";

function Login() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ login: "", password: "" });
    const [error, setError] = useState("");

    const handleChange = e => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError("");
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        try {
            const res = await fetch("http://localhost:4000/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Ошибка входа");
            localStorage.setItem("token", data.token);
            navigate("/dashboard");
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className={s.loginPage}>
            <div className={s.loginContainer}>
                <div className={s.authLinks}>
                    <Link to="/login" className={`${s.authLink} ${s.active}`}>Вход</Link>
                    <Link to="/register" className={s.authLink}>Регистрация</Link>
                </div>
                <div className={s.companyName}>Quizzward</div>
                <form className={s.loginInputs} onSubmit={handleLogin}>
                    <input name="login" type="text" className={s.inputLogin} placeholder="Логин" value={form.login} onChange={handleChange} required />
                    <input name="password" type="password" className={`${s.input} ${s.inputPassword}`} placeholder="Пароль" value={form.password} onChange={handleChange} required />
                    <button type="submit" className={s.buttonLogin}>Войти</button>
                </form>
                {error && <div style={{color:'red', marginTop:8}}>{error}</div>}
            </div>
        </div>
    )
}

export default Login