import axios from 'axios';

const API_URL = 'http://localhost:4000/api';

// Отправить результаты прохождения викторины
export const submitQuizResults = async (quizId, results, token) => {
  try {
    const response = await axios.post(
      `${API_URL}/quizzes/${quizId}/results`,
      results,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Ошибка при отправке результатов:', error);
    throw error;
  }
};

// Получить все викторины пользователя
export const getQuizzes = async (token) => {
  try {
    const response = await axios.get(`${API_URL}/quizzes`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Ошибка при получении викторин:', error);
    throw error;
  }
};

// Получить викторину по ID
export const getQuizById = async (id, token) => {
  try {
    const response = await axios.get(`${API_URL}/quizzes/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Ошибка при получении викторины:', error);
    throw error;
  }
};

// Создать новую викторину
export const createQuiz = async (quizData, token) => {
  try {
    const response = await axios.post(
      `${API_URL}/quizzes`,
      quizData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Ошибка при создании викторины:', error);
    throw error;
  }
};

// Обновить викторину
export const updateQuiz = async (id, quizData, token) => {
  try {
    const response = await axios.put(
      `${API_URL}/quizzes/${id}`,
      quizData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Ошибка при обновлении викторины:', error);
    throw error;
  }
};

// Удалить викторину
export const deleteQuiz = async (id, token) => {
  try {
    const response = await axios.delete(`${API_URL}/quizzes/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Ошибка при удалении викторины:', error);
    throw error;
  }
};
