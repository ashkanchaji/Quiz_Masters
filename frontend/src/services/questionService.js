import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const getAuthToken = () => {
  const userData = localStorage.getItem('user');
  if (userData) {
    const user = JSON.parse(userData);
    return user.token || user.access_token;
  }
  return null;
};

const getAuthHeaders = () => {
  const token = getAuthToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

const questionService = {
  createQuestion: async (questionData) => {
    const response = await axios.post(`${API_BASE_URL}/questions/`, questionData);
    return response.data;
  },

  getPendingQuestions: async () => {
    const response = await axios.get(`${API_BASE_URL}/questions/pending`);
    return response.data;
  },

  confirmQuestion: async (questionId, status) => {
    const response = await axios.put(`${API_BASE_URL}/questions/${questionId}/confirm`, {
      status: status
    });
    return response.data;
  },

  getQuestionCount: async (categoryId) => {
    const response = await axios.get(`${API_BASE_URL}/questions/category/${categoryId}/count`);
    return response.data;
  },

  getAllQuestions: async () => {
    const response = await axios.get(`${API_BASE_URL}/questions`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  getQuestionsByCategory: async (categoryId) => {
    const response = await axios.get(`${API_BASE_URL}/questions/category/${categoryId}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  getRandomQuestions: async (categoryId, count = 3) => {
    const response = await axios.get(`${API_BASE_URL}/questions/category/${categoryId}/random/${count}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  addQuestion: async (questionData) => {
    const response = await axios.post(`${API_BASE_URL}/questions`, questionData, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  updateQuestion: async (questionId, questionData) => {
    const response = await axios.put(`${API_BASE_URL}/questions/${questionId}`, questionData, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  deleteQuestion: async (questionId) => {
    const response = await axios.delete(`${API_BASE_URL}/questions/${questionId}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  }
};

export default questionService;