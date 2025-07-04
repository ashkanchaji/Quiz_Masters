// src/pages/LoginPage.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUser, FaLock, FaCrown, FaEye, FaEyeSlash } from 'react-icons/fa';
import authService from '../services/authService';
import '../styles/Auth.css';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authService.login(formData.username, formData.password);
      localStorage.setItem('user', JSON.stringify(response));
      navigate('/dashboard');
    } catch (error) {
      setError(error.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="auth-card">
          <div className="auth-header">
            <FaCrown className="crown-icon" />
            <h1>Quiz of Kings</h1>
            <p>پادشاه دانش شو</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <h2>خوش آمدید</h2>
            
            {error && <div className="error-message">{error}</div>}

            <div className="input-group">
              <FaUser className="input-icon" />
              <input
                type="text"
                name="username"
                placeholder="نام کاربری"
                value={formData.username}
                onChange={handleChange}
                required
                className="auth-input"
              />
            </div>

            <div className="input-group">
              <FaLock className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="رمز عبور"
                value={formData.password}
                onChange={handleChange}
                required
                className="auth-input"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <button
              type="submit"
              className="auth-button"
              disabled={loading}
            >
              {loading ? 'در حال ورود...' : 'ورود'}
            </button>

            <div className="auth-footer">
              <p>
                حساب کاربری ندارید؟{' '}
                <Link to="/signup" className="auth-link">
                  ثبت نام
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;