// src/pages/ManagementPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaPlus, FaList, FaQuestion, FaLayerGroup, FaArrowLeft,
  FaCheck, FaTimes, FaEye, FaLock 
} from 'react-icons/fa';
import categoryService from '../services/categoryService';
import questionService from '../services/questionService';
import '../styles/Management.css';

const ManagementPage = () => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('questions');
  const [categories, setCategories] = useState([]);
  const [pendingQuestions, setPendingQuestions] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [newQuestion, setNewQuestion] = useState({
    q_text: '',
    c_id: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: 'A',
    difficulty_level: 1,
    author: 'User'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }
    
    const parsedUser = JSON.parse(userData);
    console.log('Parsed user:', parsedUser); // Debug log
    setUser(parsedUser);
    setIsAdmin(parsedUser.is_admin || false);
    
    // Set default tab based on admin status
    if (parsedUser.is_admin) {
      setActiveTab('categories');
    }
    
    // Set author based on admin status
    setNewQuestion(prev => ({
      ...prev,
      author: parsedUser.is_admin ? 'Admin' : 'User'
    }));
    
    // Pass the parsed user data directly to loadData
    loadData(parsedUser);
  }, [navigate]);

  const loadData = async (userData = user) => {
    try {
      setLoading(true);
      console.log('Loading data for user:', userData); // Debug log
      
      const categoriesData = await categoryService.getAllCategories();
      setCategories(categoriesData);
      
      // Load pending questions if user is admin (use the passed userData)
      if (userData?.is_admin) {
        console.log('User is admin, loading pending questions...'); // Debug log
        const pendingData = await questionService.getPendingQuestions();
        console.log('Pending questions loaded:', pendingData); // Debug log
        setPendingQuestions(pendingData);
      } else {
        console.log('User is not admin, skipping pending questions'); // Debug log
      }
    } catch (error) {
      console.error('Error loading data:', error); // Debug log
      setError('خطا در بارگیری اطلاعات');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      setError('فقط مدیران می‌توانند دسته‌بندی ایجاد کنند');
      return;
    }
    if (!newCategory.trim()) return;

    try {
      await categoryService.createCategory(newCategory);
      setNewCategory('');
      setSuccess('دسته‌بندی با موفقیت اضافه شد');
      loadData();
    } catch (error) {
      setError('خطا در ایجاد دسته‌بندی');
    }
  };

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    
    try {
      await questionService.createQuestion(newQuestion);
      setNewQuestion({
        q_text: '',
        c_id: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_answer: 'A',
        difficulty_level: 1,
        author: isAdmin ? 'Admin' : 'User'
      });
      setSuccess(isAdmin ? 'سوال با موفقیت اضافه شد' : 'سوال برای تایید ارسال شد');
      
      // Reload data with current user context
      loadData();
    } catch (error) {
      setError('خطا در ایجاد سوال');
    }
  };

  const handleConfirmQuestion = async (questionId, status) => {
    if (!isAdmin) {
      setError('فقط مدیران می‌توانند سوالات را تایید کنند');
      return;
    }
    
    try {
      await questionService.confirmQuestion(questionId, status);
      setSuccess(status ? 'سوال تایید شد' : 'سوال رد شد');
      loadData();
    } catch (error) {
      setError('خطا در تایید سوال');
    }
  };

  const handleQuestionChange = (field, value) => {
    setNewQuestion(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  return (
    <div className="management-container">
      <div className="management-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          <FaArrowLeft /> بازگشت به داشبورد
        </button>
        <h1>مدیریت محتوا</h1>
        {isAdmin && <span className="admin-badge">مدیر</span>}
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button className="alert-close" onClick={clearMessages}>×</button>
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          {success}
          <button className="alert-close" onClick={clearMessages}>×</button>
        </div>
      )}

      <div className="management-tabs">
        {isAdmin && (
          <button 
            className={activeTab === 'categories' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('categories')}
          >
            <FaLayerGroup /> دسته‌بندی‌ها
          </button>
        )}
        
        <button 
          className={activeTab === 'questions' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('questions')}
        >
          <FaQuestion /> سوالات
        </button>
        
        {isAdmin && (
          <button 
            className={activeTab === 'pending' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('pending')}
          >
            <FaEye /> تایید سوالات ({pendingQuestions.length})
          </button>
        )}
      </div>

      <div className="management-content">
        {/* Categories section - Admin only */}
        {isAdmin && activeTab === 'categories' && (
          <div className="categories-section">
            <div className="section-card">
              <h2><FaPlus /> افزودن دسته‌بندی جدید</h2>
              <form onSubmit={handleCreateCategory} className="category-form">
                <input
                  type="text"
                  placeholder="نام دسته‌بندی (مثال: تاریخ، جغرافیا، علوم)"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="form-input"
                  required
                />
                <button type="submit" className="submit-btn" disabled={loading}>
                  <FaPlus /> افزودن دسته‌بندی
                </button>
              </form>
            </div>

            <div className="section-card">
              <h2><FaList /> دسته‌بندی‌های موجود ({categories.length})</h2>
              <div className="categories-grid">
                {categories.length === 0 ? (
                  <div className="empty-message">
                    هنوز هیچ دسته‌بندی‌ای ایجاد نشده است
                  </div>
                ) : (
                  categories.map(category => (
                    <div key={category.c_id} className="category-item">
                      <h3>{category.category_name}</h3>
                      <span className="category-id">شناسه: {category.c_id}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Questions section - All users */}
        {activeTab === 'questions' && (
          <div className="questions-section">
            <div className="section-card">
              <h2><FaPlus /> افزودن سوال جدید</h2>
              {!isAdmin && (
                <p className="user-note">
                  💡 سوالات شما پس از بررسی و تایید مدیر در بازی نمایش داده می‌شوند
                </p>
              )}
              
              <form onSubmit={handleCreateQuestion} className="question-form">
                <div className="form-row">
                  <select
                    value={newQuestion.c_id}
                    onChange={(e) => handleQuestionChange('c_id', parseInt(e.target.value))}
                    className="form-select"
                    required
                  >
                    <option value="">انتخاب دسته‌بندی</option>
                    {categories.map(category => (
                      <option key={category.c_id} value={category.c_id}>
                        {category.category_name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={newQuestion.difficulty_level}
                    onChange={(e) => handleQuestionChange('difficulty_level', parseInt(e.target.value))}
                    className="form-select"
                  >
                    <option value={1}>آسان 🟢</option>
                    <option value={2}>متوسط 🟡</option>
                    <option value={3}>سخت 🔴</option>
                  </select>
                </div>

                <textarea
                  placeholder="متن سوال خود را وارد کنید..."
                  value={newQuestion.q_text}
                  onChange={(e) => handleQuestionChange('q_text', e.target.value)}
                  className="form-textarea"
                  rows="3"
                  required
                />

                <div className="options-grid">
                  <div className="option-group">
                    <label>گزینه الف:</label>
                    <input
                      type="text"
                      placeholder="متن گزینه الف"
                      value={newQuestion.option_a}
                      onChange={(e) => handleQuestionChange('option_a', e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="option-group">
                    <label>گزینه ب:</label>
                    <input
                      type="text"
                      placeholder="متن گزینه ب"
                      value={newQuestion.option_b}
                      onChange={(e) => handleQuestionChange('option_b', e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="option-group">
                    <label>گزینه ج:</label>
                    <input
                      type="text"
                      placeholder="متن گزینه ج"
                      value={newQuestion.option_c}
                      onChange={(e) => handleQuestionChange('option_c', e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="option-group">
                    <label>گزینه د:</label>
                    <input
                      type="text"
                      placeholder="متن گزینه د"
                      value={newQuestion.option_d}
                      onChange={(e) => handleQuestionChange('option_d', e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div className="correct-answer">
                  <label>پاسخ صحیح:</label>
                  <select
                    value={newQuestion.correct_answer}
                    onChange={(e) => handleQuestionChange('correct_answer', e.target.value)}
                    className="form-select"
                  >
                    <option value="A">الف</option>
                    <option value="B">ب</option>
                    <option value="C">ج</option>
                    <option value="D">د</option>
                  </select>
                </div>

                <button type="submit" className="submit-btn" disabled={loading || !newQuestion.c_id}>
                  <FaPlus /> {isAdmin ? 'افزودن سوال' : 'ارسال برای تایید'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Pending questions - Admin only */}
        {isAdmin && activeTab === 'pending' && (
          <div className="pending-section">
            <div className="section-card">
              <h2><FaEye /> سوالات در انتظار تایید ({pendingQuestions.length})</h2>
              {pendingQuestions.length === 0 ? (
                <div className="empty-message">
                  🎉 همه سوالات بررسی شده‌اند! هیچ سوالی در انتظار تایید نیست
                </div>
              ) : (
                <div className="pending-questions">
                  {pendingQuestions.map(question => (
                    <div key={question.q_id} className="pending-question">
                      <div className="question-header">
                        <h3>سوال #{question.q_id}</h3>
                        <span className="category-badge">{question.category_name}</span>
                        <span className="author-badge">نویسنده: {question.author}</span>
                        <span className={`difficulty-badge difficulty-${question.difficulty_level}`}>
                          {question.difficulty_level === 1 ? 'آسان' : 
                           question.difficulty_level === 2 ? 'متوسط' : 'سخت'}
                        </span>
                      </div>
                      
                      <div className="question-content">
                        <p className="question-text">{question.q_text}</p>
                        <div className="question-options">
                          <div className={`option ${question.correct_answer === 'A' ? 'correct' : ''}`}>
                            الف) {question.option_a}
                          </div>
                          <div className={`option ${question.correct_answer === 'B' ? 'correct' : ''}`}>
                            ب) {question.option_b}
                          </div>
                          <div className={`option ${question.correct_answer === 'C' ? 'correct' : ''}`}>
                            ج) {question.option_c}
                          </div>
                          <div className={`option ${question.correct_answer === 'D' ? 'correct' : ''}`}>
                            د) {question.option_d}
                          </div>
                        </div>
                        <p className="correct-answer-display">
                          ✅ پاسخ صحیح: {question.correct_answer}
                        </p>
                      </div>

                      <div className="question-actions">
                        <button 
                          className="approve-btn"
                          onClick={() => handleConfirmQuestion(question.q_id, true)}
                          disabled={loading}
                        >
                          <FaCheck /> تایید
                        </button>
                        <button 
                          className="reject-btn"
                          onClick={() => handleConfirmQuestion(question.q_id, false)}
                          disabled={loading}
                        >
                          <FaTimes /> رد
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Access denied for non-admin trying to access admin sections */}
        {!isAdmin && (activeTab === 'categories' || activeTab === 'pending') && (
          <div className="access-denied">
            <FaLock className="lock-icon" />
            <h2>دسترسی محدود</h2>
            <p>این بخش فقط برای مدیران سیستم در دسترس است</p>
            <button 
              className="back-to-questions"
              onClick={() => setActiveTab('questions')}
            >
              بازگشت به افزودن سوال
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagementPage;