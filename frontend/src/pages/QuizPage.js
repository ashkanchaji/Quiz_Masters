import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FaCrown, FaArrowLeft, FaClock, FaCheck, FaTimes, 
  FaPlay, FaFlag, FaGamepad 
} from 'react-icons/fa';
import categoryService from '../services/categoryService';
import gameService from '../services/gameService';
import '../styles/QuizPage.css';

const QuizPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  
  const [currentUser, setCurrentUser] = useState(null);
  const [quizPhase, setQuizPhase] = useState('loading');
  
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }
    
    const parsedUser = JSON.parse(userData);
    setCurrentUser(parsedUser);
    
    initializeQuiz();
  }, [sessionId, navigate]);

  useEffect(() => {
    let timer;
    if (isTimerRunning && timeLeft > 0) {
      timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0 && quizPhase === 'answering') {
      handleTimeUp();
    }
    
    return () => clearTimeout(timer);
  }, [timeLeft, isTimerRunning, quizPhase]);

  const initializeQuiz = async () => {
    try {
      setLoading(true);
      
      const userData = localStorage.getItem('user');
      const currentUser = JSON.parse(userData);
      const myUserId = currentUser?.user_id?.toString();
      
      // Check if there's an existing round that needs answering
      try {
        const currentRound = await gameService.getCurrentRound(sessionId);
        if (currentRound && currentRound.questions && currentRound.questions.length > 0) {
          
          // Check if current user has already answered THIS round
          const hasMyAnswers = currentRound.players_answers && currentRound.players_answers[myUserId];
          
          // IMPORTANT: Only load existing round if:
          // 1. I haven't answered yet AND
          // 2. The round is not complete (meaning opponent started it but I need to answer)
          if (!hasMyAnswers) {
            // Check if the round has any answers at all (meaning someone started it)
            const hasAnyAnswers = currentRound.players_answers && Object.keys(currentRound.players_answers).length > 0;
            
            if (hasAnyAnswers) {
              // Someone else started this round, I need to answer the same questions
              setQuestions(currentRound.questions);
              setQuizPhase('answering');
              setCurrentQuestionIndex(0);
              setAnswers([]);
              setTimeLeft(30);
              setIsTimerRunning(true);
              setLoading(false);
              return;
            }
            // If no answers exist yet, fall through to category selection (I'm starting a new round)
          }
          // If I already answered, fall through to category selection for next round
        }
        // If no current round exists, fall through to category selection
      } catch (err) {
        // No existing round or error - proceed with new round
      }
      
      // Show category selection for NEW round
      const allCategories = await categoryService.getAllCategoriesWithCounts();
      const validCategories = allCategories.filter(cat => cat.question_count >= 3);
      
      if (validCategories.length < 3) {
        setError('تعداد دسته‌بندی‌های با سوالات کافی کم است');
        return;
      }
      
      const randomCategories = validCategories
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);
      
      setCategories(randomCategories);
      setQuizPhase('category-selection');
      
    } catch (err) {
      setError('خطا در بارگیری اطلاعات بازی');
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = async (category) => {
    try {
      setSelectedCategory(category);
      setSubmitting(true);
      
      const roundData = await gameService.startNewRoundWithCategory(sessionId, category.c_id);
      
      if (roundData.questions && roundData.questions.length === 3) {
        setQuestions(roundData.questions);
        setQuizPhase('answering');
        setCurrentQuestionIndex(0);
        setAnswers([]);
        setTimeLeft(30);
        setIsTimerRunning(true);
      } else {
        throw new Error('Invalid questions received from round creation');
      }
      
    } catch (err) {
      if (err.response?.status === 400) {
        setError('تعداد سوالات موجود در این دسته‌بندی کافی نیست');
      } else {
        setError('خطا در شروع دور جدید');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnswerSelect = (selectedAnswer) => {
    if (!isTimerRunning) return;
    
    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = selectedAnswer === currentQuestion.correct_answer;
    
    const newAnswer = {
      question_id: currentQuestion.q_id,
      selected_answer: selectedAnswer,
      is_correct: isCorrect,
      time_taken: 30 - timeLeft
    };
    
    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);
    setIsTimerRunning(false);
    
    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setTimeLeft(30);
        setIsTimerRunning(true);
      } else {
        handleQuizComplete(updatedAnswers);
      }
    }, 2000);
  };

  const handleTimeUp = () => {
    if (!isTimerRunning) return;
    
    const currentQuestion = questions[currentQuestionIndex];
    const newAnswer = {
      question_id: currentQuestion.q_id,
      selected_answer: null,
      is_correct: false,
      time_taken: 30
    };
    
    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);
    setIsTimerRunning(false);
    
    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setTimeLeft(30);
        setIsTimerRunning(true);
      } else {
        handleQuizComplete(updatedAnswers);
      }
    }, 2000);
  };

  const handleQuizComplete = async (finalAnswers) => {
    try {
      setSubmitting(true);
      
      await gameService.submitRoundAnswers(sessionId, finalAnswers);
      
      setQuizPhase('completed');
      
      setTimeout(() => {
        navigate(`/game/${sessionId}`);
      }, 3000);
      
    } catch (err) {
      setError('خطا در ارسال پاسخ‌ها');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturnToGame = () => {
    navigate(`/game/${sessionId}`);
  };

  if (loading) {
    return (
      <div className="quiz-page-loading">
        <div className="loading-animation">
          <FaCrown className="loading-crown" />
          <div className="loading-spinner"></div>
        </div>
        <p>در حال بارگیری...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="quiz-page-error">
        <div className="error-content">
          <FaTimes className="error-icon" />
          <h2>خطا</h2>
          <p>{error}</p>
          <button onClick={() => navigate(`/game/${sessionId}`)} className="error-back-btn">
            <FaArrowLeft /> بازگشت به بازی
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const lastAnswer = answers[answers.length - 1];

  return (
    <div className="quiz-page-container">
      <div className="background-effects">
        <div className="floating-shape shape-1"></div>
        <div className="floating-shape shape-2"></div>
        <div className="floating-shape shape-3"></div>
      </div>

      <div className="quiz-header">
        <button className="back-button" onClick={handleReturnToGame}>
          <FaArrowLeft />
        </button>
        <div className="quiz-title">
          <FaCrown className="title-crown" />
          <h1>مسابقه</h1>
          <span className="game-id">بازی #{sessionId}</span>
        </div>
      </div>

      {quizPhase === 'category-selection' && (
        <div className="category-selection-section">
          <div className="section-header">
            <FaFlag className="section-icon" />
            <h2>انتخاب دسته‌بندی</h2>
            <p>یک دسته‌بندی برای این دور انتخاب کنید</p>
          </div>
          
          <div className="categories-grid">
            {categories.map((category) => (
              <button
                key={category.c_id}
                className="category-card"
                onClick={() => handleCategorySelect(category)}
                disabled={submitting}
              >
                <div className="category-icon">
                  <FaGamepad />
                </div>
                <h3>{category.category_name}</h3>
                <p>{category.question_count || 0} سوال</p>
              </button>
            ))}
          </div>
          
          {submitting && (
            <div className="creating-round-indicator">
              <div className="loading-spinner small"></div>
              <span>در حال ایجاد دور...</span>
            </div>
          )}
        </div>
      )}

      {quizPhase === 'answering' && currentQuestion && (
        <div className="answering-section">
          <div className="quiz-progress">
            <div className="progress-info">
              <span>سوال {currentQuestionIndex + 1} از {questions.length}</span>
              <div className="timer">
                <FaClock className="timer-icon" />
                <span className={timeLeft <= 10 ? 'timer-warning' : ''}>{timeLeft}</span>
              </div>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="question-section">
            <div className="question-card">
              <h2 className="question-text">{currentQuestion.q_text}</h2>
              
              <div className="answers-grid">
                {[
                  { label: 'A', text: currentQuestion.option_a },
                  { label: 'B', text: currentQuestion.option_b },
                  { label: 'C', text: currentQuestion.option_c },
                  { label: 'D', text: currentQuestion.option_d }
                ].map((option, index) => {
                  const isSelected = lastAnswer && lastAnswer.selected_answer === option.label;
                  const isCorrect = option.label === currentQuestion.correct_answer;
                  const showResult = !isTimerRunning && answers.length > currentQuestionIndex;
                  
                  return (
                    <button
                      key={index}
                      className={`answer-option ${
                        showResult 
                          ? (isCorrect ? 'correct' : (isSelected ? 'incorrect' : ''))
                          : ''
                      }`}
                      onClick={() => handleAnswerSelect(option.label)}
                      disabled={!isTimerRunning}
                    >
                      <div className="answer-label">{option.label}</div>
                      <div className="answer-text">{option.text}</div>
                      {showResult && isCorrect && <FaCheck className="result-icon" />}
                      {showResult && isSelected && !isCorrect && <FaTimes className="result-icon" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {quizPhase === 'completed' && (
        <div className="completed-section">
          <div className="completion-content">
            <FaCheck className="completion-icon" />
            <h2>دور تمام شد!</h2>
            <p>پاسخ‌های شما ثبت شد</p>
            
            <div className="round-summary">
              <h3>نتیجه شما:</h3>
              <div className="score-display">
                <span className="score-number">
                  {answers.filter(a => a.is_correct).length}
                </span>
                <span className="score-total">از {questions.length}</span>
              </div>
            </div>
            
            <button className="return-game-btn" onClick={handleReturnToGame}>
              <FaArrowLeft />
              بازگشت به بازی
            </button>
          </div>
        </div>
      )}

      {submitting && quizPhase === 'completed' && (
        <div className="submitting-overlay">
          <div className="submitting-content">
            <div className="loading-spinner"></div>
            <span>در حال ارسال پاسخ‌ها...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizPage;