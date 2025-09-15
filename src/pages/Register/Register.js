import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import s from "./Register.module.css";

function Register() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: "", login: "", password: "", confirmPassword: "" });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleChange = e => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError("");
        setSuccess("");
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        try {
            const res = await fetch("http://localhost:4000/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Ошибка регистрации");
            setSuccess(data.message);
            setTimeout(() => navigate("/login"), 1200);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className={s.loginPage}>
            <div className={s.loginContainer}>
                <div className={s.authLinks}>
                    <Link to="/login" className={s.authLink}>Вход</Link>
                    <Link to="/register" className={`${s.authLink} ${s.active}`}>Регистрация</Link>
                </div>
                <div className={s.companyName}>Quizzward</div>
                <form className={s.loginInputs} onSubmit={handleRegister}>
                    <input name="email" type="email" className={s.inputLogin} placeholder="Email" value={form.email} onChange={handleChange} required />
                    <input name="login" type="text" className={s.inputLogin} placeholder="Логин" value={form.login} onChange={handleChange} required />
                    <input name="password" type="password" className={`${s.input} ${s.inputPassword}`} placeholder="Пароль" value={form.password} onChange={handleChange} required />
                    <input name="confirmPassword" type="password" className={`${s.input} ${s.inputPassword}`} placeholder="Подтвердите пароль" value={form.confirmPassword} onChange={handleChange} required />
                    <button type="submit" className={s.buttonLogin}>Регистрация</button>
                </form>
                {error && <div style={{color:'red', marginTop:8}}>{error}</div>}
                {success && <div style={{color:'green', marginTop:8}}>{success}</div>}
            </div>
        </div>
    )
}

export default Register