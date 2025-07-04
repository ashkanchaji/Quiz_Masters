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

const getCurrentUser = () => {
  const userData = localStorage.getItem('user');
  if (userData) {
    return JSON.parse(userData);
  }
  return null;
};

const gameService = {
  getUserActiveGames: async (userId) => {
    const response = await axios.get(`${API_BASE_URL}/games/user/${userId}/active`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  startRandomGame: async (playerId) => {
    const response = await axios.post(`${API_BASE_URL}/games/start/random`, {
      player1_id: playerId
    }, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  startSelectedGame: async (playerId, opponentUsername) => {
    const response = await axios.post(`${API_BASE_URL}/games/start/selected`, {
      player1_id: playerId,
      opponent_username: opponentUsername
    }, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  getGameSession: async (sessionId) => {
    const response = await axios.get(`${API_BASE_URL}/games/${sessionId}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  startNewRoundWithCategory: async (sessionId, categoryId) => {
    const user = getCurrentUser();
    const response = await axios.post(`${API_BASE_URL}/rounds/games/${sessionId}/quiz-round`, {
      category_id: categoryId,
      user_id: user?.user_id
    }, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  submitRoundAnswers: async (sessionId, answers) => {
    const user = getCurrentUser();
    const response = await axios.post(`${API_BASE_URL}/rounds/games/${sessionId}/quiz-answers`, {
      answers: answers,
      user_id: user?.user_id
    }, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  getCurrentRound: async (sessionId) => {
    const response = await axios.get(`${API_BASE_URL}/rounds/games/${sessionId}/current-round-quiz`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  checkPlayerTurn: async (sessionId, userId) => {
    const response = await axios.get(`${API_BASE_URL}/games/${sessionId}/turn/${userId}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  getRoundResults: async (sessionId, roundNumber) => {
    const response = await axios.get(`${API_BASE_URL}/games/${sessionId}/rounds/${roundNumber}/results`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  endGame: async (sessionId) => {
    const response = await axios.post(`${API_BASE_URL}/games/${sessionId}/end`, {}, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  getGameStats: async (sessionId) => {
    const response = await axios.get(`${API_BASE_URL}/games/${sessionId}/stats`, {
      headers: getAuthHeaders()
    });
    return response.data;
  }
};

export default gameService;