// src/pages/Dashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaCrown, FaGamepad, FaPlus, FaTrophy, FaSignOutAlt, 
  FaUser, FaFire, FaCalendarWeek, FaCalendarAlt, FaGlobe,
  FaLayerGroup
} from 'react-icons/fa';
import gameService from '../services/gameService';
import statsService from '../services/statsService';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [activeGames, setActiveGames] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardType, setLeaderboardType] = useState('overall');
  const [showNewGameModal, setShowNewGameModal] = useState(false);
  const [opponentUsername, setOpponentUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }
    
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    loadDashboardData(parsedUser.user_id);
  }, [navigate]);

  const loadDashboardData = async (userId) => {
    try {
      setLoading(true);
      
      // Load user active games
      const games = await gameService.getUserActiveGames(userId);
      setActiveGames(games);

      // Load user stats
      const stats = await statsService.getUserStats(userId);
      setUserStats(stats);

      // Load initial leaderboard
      const leaderboardData = await statsService.getOverallLeaderboard();
      setLeaderboard(leaderboardData);

    } catch (error) {
      setError('خطا در بارگیری اطلاعات');
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaderboardChange = async (type) => {
    try {
      setLeaderboardType(type);
      let leaderboardData;
      
      switch (type) {
        case 'weekly':
          leaderboardData = await statsService.getWeeklyLeaderboard();
          break;
        case 'monthly':
          leaderboardData = await statsService.getMonthlyLeaderboard();
          break;
        default:
          leaderboardData = await statsService.getOverallLeaderboard();
      }
      
      setLeaderboard(leaderboardData);
    } catch (error) {
      setError('خطا در بارگیری جدول امتیازات');
    }
  };

  const handleStartRandomGame = async () => {
    try {
      const response = await gameService.startRandomGame(user.user_id);
      setShowNewGameModal(false);
      loadDashboardData(user.user_id); // Refresh data
      setError('');
    } catch (error) {
      setError('خطا در شروع بازی جدید');
    }
  };

  const handleStartSelectedGame = async () => {
    if (!opponentUsername.trim()) {
      setError('لطفا نام کاربری حریف را وارد کنید');
      return;
    }

    try {
      const response = await gameService.startSelectedGame(user.user_id, opponentUsername);
      setShowNewGameModal(false);
      setOpponentUsername('');
      loadDashboardData(user.user_id); // Refresh data
      setError('');
    } catch (error) {
      setError('خطا در شروع بازی یا حریف یافت نشد');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <FaCrown className="loading-icon" />
        <p>در حال بارگیری...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <FaCrown className="header-crown" />
            <h1>Quiz of Kings</h1>
          </div>
          <div className="header-right">
            <div className="user-info">
              <FaUser className="user-icon" />
              <span>{user?.user_name || 'کاربر'}</span>
            </div>
            
            {/* Management Button */}
            <button 
              className="management-btn"
              onClick={() => navigate('/management')}
            >
              <FaLayerGroup /> مدیریت
            </button>
            
            <button className="logout-btn" onClick={handleLogout}>
              <FaSignOutAlt />
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        {error && <div className="error-banner">{error}</div>}

        {/* User Stats Card */}
        {userStats && (
          <div className="stats-card">
            <h2><FaFire /> آمار شما</h2>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">تعداد بازی‌ها</span>
                <span className="stat-value">{userStats.game_count}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">برد</span>
                <span className="stat-value">{userStats.win_count}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">درصد برد</span>
                <span className="stat-value">{userStats.win_ratio}%</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">امتیاز کل</span>
                <span className="stat-value">{userStats.xp}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">دقت</span>
                <span className="stat-value">{userStats.average_accuracy}%</span>
              </div>
            </div>
          </div>
        )}

        <div className="dashboard-grid">
          {/* Active Games Section */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2><FaGamepad /> بازی‌های در حال انجام</h2>
              <button 
                className="new-game-btn"
                onClick={() => setShowNewGameModal(true)}
              >
                <FaPlus /> بازی جدید
              </button>
            </div>

            <div className="games-list">
              {activeGames.length === 0 ? (
                <div className="empty-state">
                  <FaGamepad className="empty-icon" />
                  <p>هیچ بازی فعالی ندارید</p>
                  <button 
                    className="start-game-btn"
                    onClick={() => setShowNewGameModal(true)}
                  >
                    شروع بازی جدید
                  </button>
                </div>
              ) : (
                activeGames.map(game => (
                  <div key={game.s_id} className="game-card">
                    <div className="game-info">
                      <h3>بازی #{game.s_id}</h3>
                      <p>حریف: {game.player1 === user?.user_id ? `بازیکن ${game.player2}` : `بازیکن ${game.player1}`}</p>
                      <small>شروع: {new Date(game.start_time).toLocaleDateString('fa-IR')}</small>
                    </div>
                    <button 
                      className="continue-btn"
                      onClick={() => navigate(`/game/${game.s_id}`)}
                    >
                      ادامه بازی
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Leaderboard Section */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2><FaTrophy /> جدول امتیازات</h2>
              <div className="leaderboard-tabs">
                <button 
                  className={leaderboardType === 'overall' ? 'tab active' : 'tab'}
                  onClick={() => handleLeaderboardChange('overall')}
                >
                  <FaGlobe /> کل
                </button>
                <button 
                  className={leaderboardType === 'monthly' ? 'tab active' : 'tab'}
                  onClick={() => handleLeaderboardChange('monthly')}
                >
                  <FaCalendarAlt /> ماهانه
                </button>
                <button 
                  className={leaderboardType === 'weekly' ? 'tab active' : 'tab'}
                  onClick={() => handleLeaderboardChange('weekly')}
                >
                  <FaCalendarWeek /> هفتگی
                </button>
              </div>
            </div>

            <div className="leaderboard-list">
              {leaderboard.length === 0 ? (
                <div className="empty-leaderboard">
                  <FaTrophy className="empty-icon" />
                  <p>
                    {leaderboardType === 'weekly' ? 'هیچ بازی‌ای در هفته گذشته انجام نشده' :
                     leaderboardType === 'monthly' ? 'هیچ بازی‌ای در ماه گذشته انجام نشده' :
                     'هنوز بازیکنی ثبت نشده'}
                  </p>
                </div>
              ) : (
                leaderboard.map((player, index) => (
                  <div key={index} className="leaderboard-item">
                    <div className="rank">
                      {index + 1}
                      {index === 0 && <FaCrown className="crown-small" />}
                    </div>
                    <div className="player-name">{player.user_name}</div>
                    <div className="player-stats">
                      <span className="xp">{player.xp} XP</span>
                      <span className="wins">{player.win_count} برد</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New Game Modal */}
      {showNewGameModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>بازی جدید</h3>
            <div className="modal-content">
              <button 
                className="game-option-btn"
                onClick={handleStartRandomGame}
              >
                <FaGamepad />
                بازی با حریف تصادفی
              </button>
              
              <div className="selected-opponent">
                <input
                  type="text"
                  placeholder="نام کاربری حریف"
                  value={opponentUsername}
                  onChange={(e) => setOpponentUsername(e.target.value)}
                  className="opponent-input"
                />
                <button 
                  className="game-option-btn"
                  onClick={handleStartSelectedGame}
                >
                  بازی با حریف انتخابی
                </button>
              </div>
            </div>
            
            <button 
              className="modal-close"
              onClick={() => {
                setShowNewGameModal(false);
                setOpponentUsername('');
                setError('');
              }}
            >
              انصراف
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;