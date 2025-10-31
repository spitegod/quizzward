import { useEffect, useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import { FiSearch } from 'react-icons/fi';
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
  const [searchTerm, setSearchTerm] = useState('');

  // Filter users based on search term
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    
    const term = searchTerm.toLowerCase().trim();
    return users.filter(user => 
      (user.login && user.login.toLowerCase().includes(term)) ||
      (user.email && user.email.toLowerCase().includes(term)) ||
      (user.role && user.role.toLowerCase().includes(term))
    );
  }, [users, searchTerm]);

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
          <div className={s.header}>
            <h2 className={s.pageTitle}>Пользователи</h2>
            <div className={s.searchContainer}>
              <FiSearch className={s.searchIcon} />
              <input
                type="text"
                placeholder="Поиск по логину, email или роли..."
                className={s.searchInput}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className={s.loading}>Загрузка пользователей...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={s.page}>
      <NavAdmin />
      <div className={s.content}>
        <div className={s.header}>
          <h2 className={s.pageTitle}>Пользователи</h2>
          <div className={s.searchContainer}>
            <div className={s.searchInputContainer}>
              <FiSearch className={s.searchIcon} />
              <input
                type="text"
                placeholder="Поиск по логину, email или роли..."
                className={s.searchInput}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  className={s.clearButton}
                  onClick={() => setSearchTerm('')}
                  aria-label="Очистить поиск"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
        <div className={s.card}>
          {error ? (
            <div className={s.error}>{error}</div>
          ) : filteredUsers.length === 0 ? (
            <div className={s.emptyState}>
              {searchTerm ? 'Пользователи не найдены. Попробуйте изменить параметры поиска.' : 'Нет пользователей'}
            </div>
          ) : (
            <div className={s.tableContainer}>
              <table className={s.userTable}>
                <thead>
                  <tr>
                    <th>№</th>
                    <th>Логин</th>
                    <th>Email</th>
                    <th>Очки</th>
                    <th>Статус</th>
                    <th>Дата регистрации</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, index) => (
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
          )}
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
