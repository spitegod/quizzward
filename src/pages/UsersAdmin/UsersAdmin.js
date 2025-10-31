import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import NavAdmin from '../../components/NavAdmin/NavAdmin';
import UserEditModal from '../../components/UserEditModal/UserEditModal';
import { 
  getAllUsers, 
  updateUser, 
  deleteUser, 
  banUser, 
  resetUserStats 
} from '../../services/userService';
import s from './UsersAdmin.module.css';

const UsersAdmin = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingUser, setEditingUser] = useState(null);

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

  const handleEditUser = (user) => {
    setEditingUser(user);
  };

  const handleSaveUser = async (userData) => {
    try {
      await updateUser(userData);
      await fetchUsers();
      setEditingUser(null);
      toast.success('Данные пользователя обновлены');
    } catch (error) {
      console.error('Ошибка при обновлении пользователя:', error);
      toast.error('Не удалось обновить данные пользователя');
    }
  };

  const handleBanUser = async (userId, isBanned) => {
    try {
      await banUser(userId, isBanned);
      await fetchUsers();
      toast.success(`Пользователь успешно ${isBanned ? 'заблокирован' : 'разблокирован'}`);
    } catch (error) {
      console.error('Ошибка при блокировке пользователя:', error);
      toast.error('Не удалось изменить статус блокировки');
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await deleteUser(userId);
      await fetchUsers();
      setEditingUser(null);
      toast.success('Пользователь успешно удален');
    } catch (error) {
      console.error('Ошибка при удалении пользователя:', error);
      toast.error('Не удалось удалить пользователя');
    }
  };

  const handleResetStats = async (userId) => {
    try {
      await resetUserStats(userId);
      await fetchUsers();
      toast.success('Статистика пользователя сброшена');
    } catch (error) {
      console.error('Ошибка при сбросе статистики:', error);
      toast.error('Не удалось сбросить статистику');
    }
  };

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
                  <th>Статус</th>
                  <th>Дата регистрации</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr key={user.id} className={user.is_banned ? s.bannedUser : ''}>
                    <td className={s.colIndex}>{index + 1}</td>
                    <td>{user.login}</td>
                    <td>{user.email || 'Не указан'}</td>
                    <td>{user.points || 0}</td>
                    <td>
                      <span className={user.is_banned ? s.bannedStatus : s.activeStatus}>
                        {user.is_banned ? 'Заблокирован' : 'Активен'}
                      </span>
                    </td>
                    <td>{user.registration_date || 'Неизвестно'}</td>
                    <td>
                      <div className={s.actions}>
                        <button
                          className={s.editButton}
                          onClick={() => handleEditUser(user)}
                          disabled={user.login === 'admin'}
                          title={user.login === 'admin' ? 'Редактирование администратора запрещено' : 'Редактировать пользователя'}
                        >
                          Редактировать
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

      {editingUser && (
        <UserEditModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={handleSaveUser}
          onBan={handleBanUser}
          onDelete={handleDeleteUser}
          onResetStats={handleResetStats}
        />
      )}
    </div>
  );
};

export default UsersAdmin;
