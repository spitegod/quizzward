import axios from 'axios';

const API_URL = 'http://localhost:4000/api';

// Получить данные текущего пользователя
export const getCurrentUser = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Пользователь не авторизован');
    }

    const response = await axios.get(`${API_URL}/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Ошибка при получении данных пользователя:', error);
    throw error;
  }
};

// Получить данные пользователя по ID
export const getUserById = async (userId) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Пользователь не авторизован');
    }

    const response = await axios.get(`${API_URL}/user/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Ошибка при получении данных пользователя по ID:', error);
    throw error;
  }
};

// Получить всех пользователей (только для администратора)
export const getAllUsers = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Пользователь не авторизован');
    }

    const response = await axios.get(`${API_URL}/admin/users`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Ошибка при получении списка пользователей:', error);
    throw error;
  }
};

// Обновить данные пользователя
export const updateUser = async (userData) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Пользователь не авторизован');
    }

    const response = await axios.put(
      `${API_URL}/admin/users/${userData.id}`,
      {
        login: userData.login,
        is_banned: userData.is_banned
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Ошибка при обновлении пользователя:', error);
    throw error;
  }
};

// Удалить пользователя
export const deleteUser = async (userId) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Пользователь не авторизован');
    }

    const response = await axios.delete(
      `${API_URL}/admin/users/${userId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Ошибка при удалении пользователя:', error);
    throw error;
  }
};

// Заблокировать/разблокировать пользователя
export const banUser = async (userId, isBanned) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Пользователь не авторизован');
    }

    const response = await axios.post(
      `${API_URL}/admin/users/${userId}/ban`,
      { is_banned: isBanned },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Ошибка при блокировке пользователя:', error);
    throw error;
  }
};

// Сбросить статистику пользователя
export const resetUserStats = async (userId) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Пользователь не авторизован');
    }

    const response = await axios.post(
      `${API_URL}/admin/users/${userId}/reset-stats`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Ошибка при сбросе статистики пользователя:', error);
    throw error;
  }
};
