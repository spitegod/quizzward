import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import NavAdmin from '../../components/NavAdmin/NavAdmin';
import { getAllUsers } from '../../services/userService';
import s from './UsersAdmin.module.css';

const UsersAdmin = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await getAllUsers();
        setUsers(data);
        setError(null);
      } catch (err) {
        console.error('Ошибка при загрузке пользователей:', err);
        setError('Не удалось загрузить список пользователей');
        toast.error('Ошибка при загрузке пользователей');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (isLoading) {
    return (
      <div className={s.page}>
        <NavAdmin />
        <div className={s.content}>
          <h2 className={s.h2}>Список пользователей</h2>
          <div className={s.loading}>Загрузка пользователей...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={s.page}>
        <NavAdmin />
        <div className={s.content}>
          <h2 className={s.h2}>Список пользователей</h2>
          <div className={s.error}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={s.page}>
      <NavAdmin />
      <div className={s.content}>
        <h2 className={s.h2}>Список пользователей</h2>
        <div className={s.card}>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th className={s.colIndex}>№</th>
                  <th>Логин</th>
                  <th>Email</th>
                  <th>Очки</th>
                  <th>Дата регистрации</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr key={user.id}>
                    <td className={s.colIndex}>{index + 1}</td>
                    <td>{user.login}</td>
                    <td>{user.email || 'Не указан'}</td>
                    <td>{user.points || 0}</td>
                    <td>{user.registration_date || 'Неизвестно'}</td>
                    <td>
                      <div className={s.actions}>
                        <button 
                          className={s.btnDanger}
                          disabled={user.login === 'admin'}
                          title={user.login === 'admin' ? 'Нельзя удалить администратора' : 'Удалить пользователя'}
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsersAdmin;
