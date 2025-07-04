// src/pages/QuizExistingPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FaCrown, FaArrowLeft, FaClock, FaCheck, FaTimes 
} from 'react-icons/fa';
import gameService from '../services/gameService';
import '../styles/QuizPage.css';

const QuizExistingPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  
  const [currentUser, setCurrentUser] = useState(null);
  const [currentRound, setCurrentRound] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [quizPhase, setQuizPhase] = useState('loading'); // 'loading', 'answering', 'completed'
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
    
    loadExistingRound();
  }, [sessionId, navigate]);

  // Timer effect
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

  const loadExistingRound = async () => {
    try {
      setLoading(true);
      
      // Get current round
      const roundData = await gameService.getCurrentRound(sessionId);
      
      console.log('Current round data:', roundData);
      
      if (!roundData || !roundData.questions) {
        setError('هیچ دور فعال یافت نشد');
        return;
      }
      
      // Check if current user has already answered
      const myUserId = currentUser?.user_id?.toString();
      if (roundData.players_answers && roundData.players_answers[myUserId]) {
        setError('شما قبلاً به این دور پاسخ داده‌اید');
        return;
      }
      
      setCurrentRound(roundData);
      setQuestions(roundData.questions);
      setQuizPhase('answering');
      setIsTimerRunning(true);
      
    } catch (err) {
      console.error('Error loading existing round:', err);
      setError('خطا در بارگیری دور فعلی');
    } finally {
      setLoading(false);
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
    
    // Show result for 2 seconds before next question
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
      
      console.log('Submitting answers for existing round:', finalAnswers);
      
      const result = await gameService.submitRoundAnswers(sessionId, finalAnswers);
      
      console.log('Submission result:', result);
      
      setQuizPhase('completed');
      
      // Auto-return to game after 3 seconds
      setTimeout(() => {
        navigate(`/game/${sessionId}`);
      }, 3000);
      
    } catch (err) {
      console.error('Error submitting answers:', err);
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('خطا در ارسال پاسخ‌ها');
      }
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
        <p>در حال بارگیری سوالات...</p>
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
          <button onClick={handleReturnToGame} className="error-back-btn">
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
      {/* Background Effects */}
      <div className="background-effects">
        <div className="floating-shape shape-1"></div>
        <div className="floating-shape shape-2"></div>
        <div className="floating-shape shape-3"></div>
      </div>

      {/* Header */}
      <div className="quiz-header">
        <button className="back-button" onClick={handleReturnToGame}>
          <FaArrowLeft />
        </button>
        <div className="quiz-title">
          <FaCrown className="title-crown" />
          <h1>دور {currentRound?.round_number}</h1>
          <span className="game-id">بازی #{sessionId}</span>
        </div>
      </div>

      {/* Answering Phase */}
      {quizPhase === 'answering' && currentQuestion && (
        <div className="answering-section">
          {/* Progress Bar */}
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

          {/* Question */}
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

      {/* Completed Phase */}
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

      {/* Submitting Overlay */}
      {submitting && (
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

export default QuizExistingPage;