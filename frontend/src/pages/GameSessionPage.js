import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FaCircle, FaArrowLeft, FaCrown, FaGamepad, 
  FaCheckCircle, FaTimesCircle, FaPlay, FaClock 
} from 'react-icons/fa';
import gameService from '../services/gameService';
import '../styles/GameSessionPage.css';

const GameSessionPage = () => {
  const { sessionId } = useParams();
  const [gameInfo, setGameInfo] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchGameData = useCallback(async () => {
    try {
      setLoading(true);
      
      const gameData = await gameService.getGameSession(sessionId);
      setGameInfo(gameData);
      
      try {
        const roundsResponse = await fetch(`http://localhost:5000/api/rounds/game/${sessionId}`);
        if (roundsResponse.ok) {
          const roundsData = await roundsResponse.json();
          setRounds(roundsData || []);
        } else {
          setRounds([]);
        }
      } catch (roundsError) {
        setRounds([]);
      }
      
    } catch (err) {
      setError('خطا در بارگیری اطلاعات بازی');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }
    
    const parsedUser = JSON.parse(userData);
    setCurrentUser(parsedUser);
    
    fetchGameData();
  }, [sessionId, navigate, fetchGameData]);

  if (loading) {
    return (
      <div className="game-session-loading">
        <div className="loading-animation">
          <FaCrown className="loading-crown" />
          <div className="loading-spinner"></div>
        </div>
        <p>در حال بارگیری اطلاعات بازی...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="game-session-error">
        <div className="error-content">
          <FaTimesCircle className="error-icon" />
          <h2>خطا در بارگیری</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/dashboard')} className="error-back-btn">
            <FaArrowLeft /> بازگشت به داشبورد
          </button>
        </div>
      </div>
    );
  }

  if (!gameInfo) {
    return (
      <div className="game-session-error">
        <div className="error-content">
          <FaGamepad className="error-icon" />
          <h2>بازی یافت نشد</h2>
          <p>این بازی وجود ندارد یا حذف شده است</p>
          <button onClick={() => navigate('/dashboard')} className="error-back-btn">
            <FaArrowLeft /> بازگشت به داشبورد
          </button>
        </div>
      </div>
    );
  }

  const getPlayerName = (playerData, playerId) => {
    if (typeof playerData === 'string') {
      return playerData;
    }
    if (typeof playerData === 'object' && playerData !== null) {
      return playerData.username || playerData.name || `Player ${playerId}`;
    }
    return `Player ${playerId}`;
  };

  const getPlayerId = (playerData) => {
    if (typeof playerData === 'object' && playerData !== null) {
      return playerData.id || playerData.user_id;
    }
    return playerData;
  };

  const player1 = {
    id: getPlayerId(gameInfo.player1),
    name: getPlayerName(gameInfo.player1, gameInfo.player1)
  };
  
  const player2 = {
    id: getPlayerId(gameInfo.player2), 
    name: getPlayerName(gameInfo.player2, gameInfo.player2)
  };

  const currentRound = rounds.length;
  const gameStatus = gameInfo.game_status;
  const isCurrentUserPlayer1 = currentUser?.user_id === player1.id;

  const needsToAnswerExistingRound = () => {
    if (currentRound === 0) return false;
    
    const latestRound = rounds[currentRound - 1];
    if (latestRound && latestRound.players_answers) {
      const myUserId = currentUser.user_id.toString();
      const myAnswers = latestRound.players_answers[myUserId];
      return !myAnswers;
    }
    
    return false;
  };

  // Check if all 5 rounds are complete
  const isGameComplete = () => {
    if (gameStatus === 'ended') return true;
    
    if (currentRound < 5) return false;
    
    // Check if all 5 rounds have answers from both players
    let completedRounds = 0;
    for (let i = 0; i < Math.min(rounds.length, 5); i++) {
      const round = rounds[i];
      if (round && round.players_answers) {
        const answers = round.players_answers;
        const player1HasAnswered = answers[player1.id];
        const player2HasAnswered = answers[player2.id];
        
        if (player1HasAnswered && player2HasAnswered) {
          completedRounds++;
        }
      }
    }
    
    return completedRounds === 5;
  };

  const isMyTurn = () => {
    if (isGameComplete()) return false;
    if (currentRound >= 5 && !needsToAnswerExistingRound()) return false;
    
    if (currentRound === 0) {
      return isCurrentUserPlayer1;
    }
    
    const latestRound = rounds[currentRound - 1];
    if (latestRound && latestRound.players_answers) {
      const answers = latestRound.players_answers;
      const myUserId = currentUser.user_id.toString();
      const otherPlayerId = (isCurrentUserPlayer1 ? player2.id : player1.id).toString();
      
      const myAnswers = answers[myUserId];
      const otherAnswers = answers[otherPlayerId];
      
      if (!myAnswers) return true;
      
      if (myAnswers && otherAnswers) {
        const nextRoundNumber = currentRound + 1;
        
        if (nextRoundNumber > 5) return false;
        
        const nextRoundStarter = (nextRoundNumber % 2 === 1) ? player1.id : player2.id;
        return nextRoundStarter === currentUser.user_id;
      }
      
      return false;
    }
    
    const roundToStart = currentRound + 1;
    const roundStarter = (roundToStart % 2 === 1) ? player1.id : player2.id;
    return roundStarter === currentUser.user_id;
  };

  const handleStartNewRound = () => {
    navigate(`/game/${sessionId}/quiz`);
  };

  const getActionText = () => {
    if (needsToAnswerExistingRound()) {
      return `پاسخ به دور ${currentRound}`;
    } else {
      return `شروع دور ${currentRound + 1}`;
    }
  };

  const calculatePlayerScore = (playerId) => {
    let score = 0;
    rounds.forEach(round => {
      if (round.players_answers && round.players_answers[playerId]) {
        score += round.players_answers[playerId].score || 0;
      }
    });
    return score;
  };

  const player1Score = calculatePlayerScore(player1.id);
  const player2Score = calculatePlayerScore(player2.id);

  const allRounds = [];
  for (let i = 0; i < 5; i++) {
    if (rounds[i]) {
      const round = rounds[i];
      const player1Answers = round.players_answers?.[player1.id];
      const player2Answers = round.players_answers?.[player2.id];
      
      allRounds.push({
        player1_answers: player1Answers && player1Answers.answers ? 
          player1Answers.answers.map(a => a.is_correct) : [],
        player2_answers: player2Answers && player2Answers.answers ? 
          player2Answers.answers.map(a => a.is_correct) : []
      });
    } else {
      allRounds.push({
        player1_answers: [],
        player2_answers: []
      });
    }
  }

  const myTurn = isMyTurn();
  const needsToAnswer = needsToAnswerExistingRound();
  const gameComplete = isGameComplete();

  return (
    <div className="game-session-container">
      <div className="background-effects">
        <div className="floating-shape shape-1"></div>
        <div className="floating-shape shape-2"></div>
        <div className="floating-shape shape-3"></div>
      </div>

      <div className="game-header">
        <button className="back-button" onClick={() => navigate('/dashboard')}>
            <FaArrowLeft />
        </button>
        <div className="game-title">
            <FaCrown className="title-crown" />
            <h1>نبرد پادشاهان</h1>
            <span className="game-id">بازی #{sessionId}</span>
        </div>
      </div>

      <div className="battle-header">
        <div className={`player-card ${isCurrentUserPlayer1 ? 'current-player' : 'opponent-player'}`}>
          <div className="player-avatar">
            <FaCrown className="player-crown" />
          </div>
          <div className="player-details">
            <h2 className="player-name">{player1.name}</h2>
            <span className="player-role">
              {isCurrentUserPlayer1 ? 'شما' : 'حریف'}
            </span>
            <div className="player-score">
              <span className="score-label">امتیاز</span>
              <span className="score-value">{player1Score}</span>
            </div>
          </div>
        </div>

        <div className="vs-section">
          <div className="vs-circle">
            <span>VS</span>
          </div>
          <div className="battle-status">
            {gameComplete ? (
              <span className="status-ended">پایان بازی</span>
            ) : (
              <span className="status-ongoing">در حال بازی</span>
            )}
          </div>
        </div>

        <div className={`player-card ${!isCurrentUserPlayer1 ? 'current-player' : 'opponent-player'}`}>
          <div className="player-avatar">
            <FaCrown className="player-crown" />
          </div>
          <div className="player-details">
            <h2 className="player-name">{player2.name}</h2>
            <span className="player-role">
              {!isCurrentUserPlayer1 ? 'شما' : 'حریف'}
            </span>
            <div className="player-score">
              <span className="score-label">امتیاز</span>
              <span className="score-value">{player2Score}</span>
            </div>
          </div>
        </div>
      </div>

      {needsToAnswer && (
        <div className="round-status-indicator">
          <div className="status-content">
            <FaClock className="status-icon" />
            <span>حریف شما دور {currentRound} را شروع کرده است - نوبت پاسخ دادن شما!</span>
          </div>
        </div>
      )}

      <div className="battle-grid">
        <div className="rounds-header">
          <h3>نتایج دورها</h3>
          <span className="rounds-subtitle">هر دور شامل ۳ سوال می‌باشد</span>
        </div>

        <div className="rounds-container">
          {allRounds.map((round, roundIndex) => (
            <div key={roundIndex} className={`round-battle ${roundIndex < currentRound ? 'completed' : 'upcoming'}`}>
              <div className="round-header">
                <span className="round-number">دور {roundIndex + 1}</span>
                {roundIndex < currentRound && (
                  <FaCheckCircle className="round-completed-icon" />
                )}
              </div>

              <div className="round-content">
                <div className="player-round-results">
                  <div className="results-row">
                    {[0, 1, 2].map((questionIndex) => {
                      const hasAnswer = round.player1_answers[questionIndex] !== undefined;
                      const isCorrect = round.player1_answers[questionIndex] === true;
                      
                      return (
                        <div
                          key={questionIndex}
                          className={`answer-result ${
                            hasAnswer 
                              ? (isCorrect ? 'correct' : 'incorrect')
                              : 'pending'
                          }`}
                        >
                          {hasAnswer ? (
                            isCorrect ? <FaCheckCircle /> : <FaTimesCircle />
                          ) : (
                            <FaCircle />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="vs-divider-small">
                    <span>vs</span>
                  </div>

                  <div className="results-row">
                    {[0, 1, 2].map((questionIndex) => {
                      const hasAnswer = round.player2_answers[questionIndex] !== undefined;
                      const isCorrect = round.player2_answers[questionIndex] === true;
                      
                      return (
                        <div
                          key={questionIndex}
                          className={`answer-result ${
                            hasAnswer 
                              ? (isCorrect ? 'correct' : 'incorrect')
                              : 'pending'
                          }`}
                        >
                          {hasAnswer ? (
                            isCorrect ? <FaCheckCircle /> : <FaTimesCircle />
                          ) : (
                            <FaCircle />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="game-footer">
        {gameComplete ? (
          <div className="game-ended-section">
            <div className="winner-announcement">
              <FaCrown className="winner-crown" />
              <h2>🎉 بازی به پایان رسید</h2>
              <p className="winner-text">
                {player1Score > player2Score 
                  ? `${player1.name} برنده شد!`
                  : player2Score > player1Score 
                  ? `${player2.name} برنده شد!`
                  : 'بازی مساوی شد!'
                }
              </p>
            </div>
            <button onClick={() => navigate('/dashboard')} className="finish-game-btn">
              <FaArrowLeft /> بازگشت به داشبورد
            </button>
          </div>
        ) : (
          <div className="game-ongoing-section">
            {myTurn ? (
              <div className="my-turn-section">
                <div className="turn-indicator">
                  <FaPlay className="play-icon" />
                  <span className="turn-text">
                    {needsToAnswer ? 'پاسخ دهید!' : 'نوبت شما است!'}
                  </span>
                </div>
                <button 
                  className={`start-round-btn ${needsToAnswer ? 'answer-round' : ''}`} 
                  onClick={handleStartNewRound}
                >
                  <FaGamepad />
                  {getActionText()}
                </button>
              </div>
            ) : (
              <div className="waiting-section">
                <div className="waiting-indicator">
                  <FaClock className="clock-icon" />
                  <span className="waiting-text">در انتظار حریف...</span>
                </div>
                <p className="opponent-turn-text">
                  نوبت {isCurrentUserPlayer1 ? player2.name : player1.name} است
                </p>
                <div className="waiting-animation">
                  <div className="dot dot1"></div>
                  <div className="dot dot2"></div>
                  <div className="dot dot3"></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameSessionPage;