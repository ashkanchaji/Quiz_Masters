// src/services/statsService.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const statsService = {
  // Get user statistics
  getUserStats: async (userId) => {
    const response = await axios.get(`${API_BASE_URL}/stats/user/${userId}`);
    return response.data;
  },

  // Get leaderboards
  getOverallLeaderboard: async () => {
    const response = await axios.get(`${API_BASE_URL}/stats/leaderboard/overall`);
    return response.data;
  },

  getWeeklyLeaderboard: async () => {
    const response = await axios.get(`${API_BASE_URL}/stats/leaderboard/weekly`);
    return response.data;
  },

  getMonthlyLeaderboard: async () => {
    const response = await axios.get(`${API_BASE_URL}/stats/leaderboard/monthly`);
    return response.data;
  }
};

export default statsService;