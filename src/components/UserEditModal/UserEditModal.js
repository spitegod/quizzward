import { useState } from 'react';
import s from './UserEditModal.module.css';

const UserEditModal = ({ user, onClose, onSave, onBan, onDelete, onResetStats }) => {
  const [username, setUsername] = useState(user.login);
  const [isBanned, setIsBanned] = useState(user.is_banned || false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onSave({
        ...user,
        login: username,
        is_banned: isBanned
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBan = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onBan(user.id, !isBanned);
      setIsBanned(!isBanned);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (isSubmitting || !window.confirm('Вы уверены, что хотите удалить этого пользователя?')) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onDelete(user.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetStats = async () => {
    if (isSubmitting || !window.confirm('Вы уверены, что хотите сбросить статистику пользователя?')) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onResetStats(user.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={e => e.stopPropagation()}>
        <h3>Редактирование пользователя: {user.login}</h3>
        <form onSubmit={handleSubmit}>
          <div className={s.formGroup}>
            <label>Имя пользователя:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>
          
          <div className={s.formGroup}>
            <label>
              <input
                type="checkbox"
                checked={isBanned}
                onChange={(e) => setIsBanned(e.target.checked)}
                disabled={isSubmitting || user.login === 'admin'}
              />
              Заблокировать пользователя
            </label>
          </div>

          <div className={s.buttonGroup}>
            <button 
              type="submit" 
              className={s.saveButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Сохранение...' : 'Сохранить'}
            </button>
            
            <button
              type="button"
              className={s.banButton}
              onClick={handleBan}
              disabled={isSubmitting || user.login === 'admin'}
            >
              {isBanned ? 'Разблокировать' : 'Заблокировать'}
            </button>
            
            <button
              type="button"
              className={s.resetButton}
              onClick={handleResetStats}
              disabled={isSubmitting || user.login === 'admin'}
            >
              Сбросить статистику
            </button>
            
            <button
              type="button"
              className={s.deleteButton}
              onClick={handleDelete}
              disabled={isSubmitting || user.login === 'admin'}
            >
              Удалить
            </button>
            
            <button
              type="button"
              className={s.cancelButton}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserEditModal;
