import React, { useState } from 'react';

export default function RegistrationForm({ onRegister }) {
  const [form, setForm] = useState({ email: '', login: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await fetch('http://localhost:4000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка регистрации');
      setSuccess(data.message);
      if (onRegister) onRegister();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Регистрация</h2>
      <input name="email" placeholder="Email" value={form.email} onChange={handleChange} required />
      <input name="login" placeholder="Логин" value={form.login} onChange={handleChange} required />
      <input name="password" placeholder="Пароль" type="password" value={form.password} onChange={handleChange} required />
      <input name="confirmPassword" placeholder="Подтвердите пароль" type="password" value={form.confirmPassword} onChange={handleChange} required />
      <button type="submit">Зарегистрироваться</button>
      {error && <div style={{color:'red'}}>{error}</div>}
      {success && <div style={{color:'green'}}>{success}</div>}
    </form>
  );
}
