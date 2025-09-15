import React, { useEffect, useState } from "react";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Нет токена. Войдите в систему.");
      return;
    }
    fetch("http://localhost:4000/profile", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.user) setUser(data.user);
        else setError(data.message || "Ошибка");
      })
      .catch(() => setError("Ошибка запроса"));
  }, []);

  if (error) return <div style={{color:'red'}}>{error}</div>;
  if (!user) return <div>Загрузка...</div>;
  return (
    <div>
      <h2>Профиль</h2>
      <p>Email: {user.email}</p>
      <p>Логин: {user.login}</p>
      <p>ID: {user.id}</p>
    </div>
  );
}
