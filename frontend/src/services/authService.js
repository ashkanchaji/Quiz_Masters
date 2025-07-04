// src/services/authService.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const authService = {
  login: async (username, password) => {
    const response = await axios.post(`${API_BASE_URL}/users/login`, {
      username,
      password
    });
    
    // Check if user is admin
    try {
      const adminCheck = await axios.get(`${API_BASE_URL}/users/${response.data.user_id}/admin-status`);
      
      return {
        ...response.data,
        is_admin: adminCheck.data.is_admin
      };
    } catch (error) {
      console.error('Admin check failed:', error);
      // If admin check fails, assume not admin
      return {
        ...response.data,
        is_admin: false
      };
    }
  },

  signup: async (username, email, password) => {
    const response = await axios.post(`${API_BASE_URL}/users/`, {
      username,
      email,
      password
    });
    return response.data;
  }
};

export default authService;