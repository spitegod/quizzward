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
