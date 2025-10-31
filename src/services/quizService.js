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
    const response = await axios.get(`${API_URL}/quizzes?include=categories`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Логируем ответ для отладки
    console.log('API Response:', response.data);
    
    // Обрабатываем ответ, чтобы убедиться, что категории есть
    const data = response.data;
    
    // Если категории не пришли, добавляем пустой массив
    if (data.myQuizzes) {
      data.myQuizzes = data.myQuizzes.map(quiz => ({
        ...quiz,
        categories: quiz.categories || []
      }));
    }
    
    if (data.publicQuizzes) {
      data.publicQuizzes = data.publicQuizzes.map(quiz => ({
        ...quiz,
        categories: quiz.categories || []
      }));
    }
    
    return data;
  } catch (error) {
    console.error('Ошибка при получении викторин:', error);
    throw error;
  }
};

// Получить викторину по ID
export const getQuizById = async (id, token) => {
  try {
    const response = await axios.get(`${API_URL}/quizzes/${id}?include=categories`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Ensure categories is always an array
    const quizData = response.data;
    if (quizData && !Array.isArray(quizData.categories)) {
      quizData.categories = [];
    }
    
    console.log('Fetched quiz data:', quizData);
    return quizData;
  } catch (error) {
    console.error('Ошибка при получении викторины:', error);
    throw error;
  }
};

// Создать новую викторину
export const createQuiz = async (quizData, token) => {
  try {
    // Ensure categories is always an array of category IDs
    const categories = Array.isArray(quizData.categories) 
      ? quizData.categories.filter(id => id) // Filter out any falsy values
      : [];
    
    // Prepare questions data
    const questions = (quizData.questions || []).map(q => {
      // If options is not an array, create it from the answer
      const options = Array.isArray(q.options) ? q.options : 
                     (q.answer ? [q.answer] : ['']);
      
      // Ensure correctAnswer is a number and within bounds
      let correctAnswer = 0;
      if (q.correctAnswer !== undefined) {
        const num = Number(q.correctAnswer);
        if (!isNaN(num) && num >= 0 && num < options.length) {
          correctAnswer = num;
        }
      }
      
      return {
        question: q.question || 'Без названия',
        options: options,
        correctAnswer: correctAnswer,
        points: q.points || 1
      };
    });
    
    const dataToSend = {
      title: quizData.title || 'Без названия',
      description: quizData.description || '',
      is_public: true, // Default to public
      categories: categories,
      questions: questions
    };
    
    console.log('Sending quiz data:', dataToSend); // Debug log
    
    const response = await axios.post(`${API_URL}/quizzes`, dataToSend, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Quiz created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Ошибка при создании викторины:', error);
    throw error;
  }
};

// Обновить викторину
export const updateQuiz = async (id, quizData, token) => {
  try {
    // Ensure categories is always an array of category IDs
    const categories = Array.isArray(quizData.categories) 
      ? quizData.categories.filter(id => id) // Filter out any falsy values
      : [];
    
    // Prepare questions data
    const questions = (quizData.questions || []).map(q => {
      // If options is not an array, create it from the answer
      const options = Array.isArray(q.options) ? q.options : 
                     (q.answer ? [q.answer] : ['']);
      
      // Ensure correctAnswer is a number and within bounds
      let correctAnswer = 0;
      if (q.correctAnswer !== undefined) {
        const num = Number(q.correctAnswer);
        if (!isNaN(num) && num >= 0 && num < options.length) {
          correctAnswer = num;
        }
      }
      
      return {
        question: q.question || 'Без названия',
        options: options,
        correctAnswer: correctAnswer,
        points: q.points || 1
      };
    });
    
    const dataToSend = {
      title: quizData.title || 'Без названия',
      description: quizData.description || '',
      is_public: true, // Default to public
      categories: categories,
      questions: questions
    };
    
    console.log('Updating quiz with data:', dataToSend);
    
    const response = await axios.put(`${API_URL}/quizzes/${id}`, dataToSend, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Quiz updated successfully:', response.data);
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
