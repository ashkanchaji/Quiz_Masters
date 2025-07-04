// src/services/categoryService.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Helper function to get auth token
const getAuthToken = () => {
  const userData = localStorage.getItem('user');
  if (userData) {
    const user = JSON.parse(userData);
    return user.token || user.access_token;
  }
  return null;
};

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = getAuthToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Get all categories
const getAllCategories = async () => {
  const response = await axios.get(`${API_BASE_URL}/categories/`, {
    headers: getAuthHeaders()
  });
  return response.data;
};

// Create new category
const createCategory = async (categoryName) => {
  const response = await axios.post(`${API_BASE_URL}/categories/`, {
    category_name: categoryName
  }, {
    headers: getAuthHeaders()
  });
  return response.data;
};

// Get popular categories
const getPopularCategories = async () => {
  const response = await axios.get(`${API_BASE_URL}/categories/popular`, {
    headers: getAuthHeaders()
  });
  return response.data;
};

// Get categories with question counts
const getAllCategoriesWithCounts = async () => {
  try {
    const categories = await getAllCategories();
    
    // Get question count for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        try {
          const countResponse = await axios.get(`${API_BASE_URL}/questions/category/${category.c_id}/count`, {
            headers: getAuthHeaders()
          });
          return {
            ...category,
            question_count: countResponse.data.confirmed_question_count
          };
        } catch (err) {
          return {
            ...category,
            question_count: 0
          };
        }
      })
    );
    
    return categoriesWithCounts;
  } catch (error) {
    console.error('Error fetching categories with counts:', error);
    throw error;
  }
};

const categoryService = {
  getAllCategories,
  createCategory,
  getPopularCategories,
  getAllCategoriesWithCounts
};

export default categoryService;