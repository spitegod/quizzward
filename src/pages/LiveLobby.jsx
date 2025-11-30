import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import WebSocketService from '../services/WebSocketService';
import { getCurrentUser } from '../services/userService';
import './LiveLobby.css';
import { FaCopy, FaUser, FaUsers, FaPlay, FaSignOutAlt, FaUserCircle, FaClock, FaTrophy } from 'react-icons/fa';

const LiveLobby = () => {
  const { quizId, lobbyId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState('setup');
  const [isHost, setIsHost] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [currentLobby, setCurrentLobby] = useState(null);
  const [players, setPlayers] = useState([]);
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [countdown, setCountdown] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [answer, setAnswer] = useState('');
  const [hasAnswered, setHasAnswered] = useState(false);
  const [answerResult, setAnswerResult] = useState(null);
  const [myScore, setMyScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const user = await getCurrentUser();
        if (user && user.username) {
          setPlayerName(user.username);
        }
      } catch (error) {
        console.error('Ошибка при загрузке данных пользователя:', error);
      }
    };
    loadUserData();
  }, []);

  useEffect(() => {
    const initWebSocket = async () => {
      try {
        await WebSocketService.connect();
        console.log('WebSocket connected successfully');
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        toast.error('Не удалось подключиться к серверу');
      }
    };

    initWebSocket();

    WebSocketService.on('lobbyUpdate', handleLobbyUpdate);
    WebSocketService.on('playerJoined', handlePlayerJoined);
    WebSocketService.on('playerLeft', handlePlayerLeft);
    WebSocketService.on('gameStarting', handleGameStarting);
    WebSocketService.on('question', handleQuestion);
    WebSocketService.on('answerResult', handleAnswerResult);
    WebSocketService.on('nextQuestionCountdown', handleNextQuestionCountdown);
    WebSocketService.on('gameOver', handleGameOver);
    WebSocketService.on('lobbyClosed', handleLobbyClosed);

    return () => {
      if (currentLobby) {
        WebSocketService.leaveLobby();
      }
    };
  }, []);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        setLoading(true);
        if (!quizId) {
          throw new Error('Quiz ID is missing');
        }

        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('User not authenticated');
        }

        const response = await axios.get(`http://localhost:4000/api/quizzes/${quizId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        setQuiz(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error loading quiz:', err);
        toast.error('Failed to load quiz');
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [quizId]);

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (gameState === 'playing' && timeLeft === 0 && !hasAnswered) {
      setHasAnswered(true);
      toast.warning('Время вышло!');
    }
  }, [timeLeft, gameState, hasAnswered]);

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleLobbyUpdate = useCallback((data) => {
    console.log('Lobby update:', data);
    if (data.players) {
      const playersList = Array.isArray(data.players)
        ? data.players
        : (data.players.values ? Array.from(data.players.values()) : []);
      setPlayers(playersList);
    }
    if (data.lobbyId) {
      setCurrentLobby(prev => ({
        ...prev,
        id: data.lobbyId,
        hostId: data.hostId,
        maxPlayers: data.maxPlayers || prev?.maxPlayers
      }));
      setIsHost(data.hostId === WebSocketService.socket?.id);
    }
  }, []);

  const handlePlayerJoined = useCallback((data) => {
    console.log('Player joined:', data);
    if (data.players) {
      const playersList = Array.isArray(data.players) ? data.players : [];
      setPlayers(playersList);
      if (data.player && data.player.name) {
        toast.success(`${data.player.name} присоединился к лобби!`);
      }
    }
    if (data.hostId) {
      setCurrentLobby(prev => ({ ...prev, hostId: data.hostId }));
    }
  }, []);

  const handlePlayerLeft = useCallback((data) => {
    setPlayers(prev => prev.filter(p => p.id !== data.playerId));
    toast.info('Игрок покинул лобби');
  }, []);

  const handleGameStarting = useCallback((data) => {
    setGameState('countdown');
    setCountdown(data.countdown || 5);
    toast.info('Игра начинается!');
  }, []);

  const handleQuestion = useCallback((data) => {
    console.log('Question received:', data);
    setGameState('playing');
    setCurrentQuestion(data.question);
    setQuestionNumber(data.questionNumber);
    setTotalQuestions(data.totalQuestions);
    setTimeLeft(data.timeLimit ? Math.floor(data.timeLimit / 1000) : 30);
    setAnswer('');
    setHasAnswered(false);
    setAnswerResult(null);
    setCountdown(null);
    setAttemptsLeft(3);
    setIsBlocked(false);
  }, []);

  const handleAnswerResult = useCallback((data) => {
    console.log('Answer result:', data);
    setAnswerResult(data);
    setMyScore(data.currentScore);
    setAttemptsLeft(data.attemptsLeft);

    if (data.isCorrect) {
      setHasAnswered(true);
      setIsBlocked(true);
      toast.success(`Правильно! +${data.points} ${data.points === 1 ? 'балл' : data.points === 0.5 ? 'балла' : 'баллов'}`);
    } else {
      setAnswer('');
      if (data.attemptsLeft === 0) {
        setIsBlocked(true);
        toast.error('Попытки закончились!');
      } else {
        toast.error(`Неправильно! Осталось попыток: ${data.attemptsLeft}`);
      }
    }
  }, []);

  const handleNextQuestionCountdown = useCallback((data) => {
    setGameState('waiting');
    setCountdown(data.countdown || 5);
  }, []);

  const handleGameOver = useCallback((data) => {
    console.log('Game over:', data);
    setGameState('finished');
    setLeaderboard(data.leaderboard || []);
    toast.success('Игра завершена!');
  }, []);

  const handleLobbyClosed = useCallback(() => {
    toast.info('Лобби было закрыто');
    navigate('/dashboard');
  }, [navigate]);

  const handleCreateLobby = async () => {
    const trimmedName = playerName.trim();

    if (!trimmedName) {
      toast.error('Пожалуйста, введите ваше имя');
      return;
    }

    try {
      await WebSocketService.connect();

      const lobby = await WebSocketService.createLobby(quizId, {
        userName: trimmedName,
        maxPlayers: maxPlayers,
        timePerQuestion: 30,
        questionsCount: quiz?.questions?.length || 10
      });

      console.log('Lobby created:', lobby);
      setCurrentLobby(lobby);
      setIsHost(true);
      setGameState('lobby');
      setPlayers([{ id: WebSocketService.socket?.id, name: trimmedName, score: 0, isReady: true }]);
      toast.success('Лобби создано!');
    } catch (error) {
      console.error('Ошибка при создании лобби:', error);
      toast.error(error.message || 'Не удалось создать лобби');
    }
  };

  const handleStartGame = async () => {
    if (!quiz || !quiz.questions || quiz.questions.length === 0) {
      toast.error('Нет вопросов для игры');
      return;
    }

    try {
      const questions = quiz.questions.map(q => {
        let options = q.options;
        if (typeof options === 'string') {
          try {
            options = JSON.parse(options);
          } catch (e) {
            console.error('Failed to parse options:', options);
            options = [];
          }
        }

        return {
          id: q.id,
          questionText: q.question_text,
          correctAnswer: Array.isArray(options) && options[q.correct_answer]
            ? String(options[q.correct_answer])
            : String(q.correct_answer)
        };
      });

      await WebSocketService.startGame(currentLobby.id, questions);
    } catch (error) {
      console.error('Ошибка при запуске игры:', error);
      toast.error('Не удалось запустить игру');
    }
  };

  const handleSubmitAnswer = async (e) => {
    if (e) e.preventDefault();

    if (!answer.trim() || isBlocked) return;

    try {
      await WebSocketService.submitAnswer(currentLobby.id, currentQuestion.id, answer);
    } catch (error) {
      console.error('Ошибка при отправке ответа:', error);

      if (error.message.includes('No attempts left')) {
        setIsBlocked(true);
        setAttemptsLeft(0);
        toast.error('Попытки закончились!');
      } else {
        toast.error('Не удалось отправить ответ');
      }
    }
  };

  const handleNextQuestion = async () => {
    try {
      await WebSocketService.nextQuestion(currentLobby.id);
    } catch (error) {
      console.error('Ошибка при переходе к следующему вопросу:', error);
      toast.error('Не удалось перейти к следующему вопросу');
    }
  };

  const handleLeaveGame = () => {
    WebSocketService.leaveLobby();
    navigate('/dashboard');
  };

  const handleJoinLobby = async () => {
    const trimmedName = playerName.trim();
    const trimmedCode = joinCode.trim().toUpperCase();

    if (!trimmedName) {
      toast.error('Пожалуйста, введите ваше имя');
      return;
    }

    if (!trimmedCode) {
      toast.error('Пожалуйста, введите код лобби');
      return;
    }

    setIsJoining(true);

    try {
      await WebSocketService.connect();

      const lobby = await WebSocketService.joinLobby(trimmedCode, {
        userName: trimmedName,
        quizId: quizId
      });

      console.log('Joined lobby:', lobby);
      setCurrentLobby(lobby);
      setIsHost(false);
      setGameState('lobby');
      setPlayers(Array.isArray(lobby.players) ? lobby.players : []);
      toast.success('Вы присоединились к лобби!');
    } catch (error) {
      console.error('Ошибка при присоединении к лобби:', error);
      toast.error(error.message || 'Не удалось присоединиться к лобби');
    } finally {
      setIsJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="live-lobby-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Загрузка викторины...</p>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="live-lobby-container">
        <div className="error">
          <h2>Викторина не найдена</h2>
          <button onClick={() => navigate('/dashboard')} className="btn-primary">
            Вернуться к викторинам
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'setup') {
    return (
      <div className="live-lobby-container">
        <div className="lobby-setup">
          <h1>{quiz.title}</h1>
          <p className="quiz-description">{quiz.description}</p>

          <div className="setup-form">
            <div className="form-group">
              <label>Ваше имя:</label>
              <div className="player-info">
                <FaUserCircle className="user-icon" />
                <span>{playerName || 'Гость'}</span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="maxPlayers">Максимум игроков:</label>
              <select
                id="maxPlayers"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                className="form-control"
              >
                {[2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20].map(num => (
                  <option key={num} value={num}>{num} игроков</option>
                ))}
              </select>
            </div>

            <button onClick={handleCreateLobby} className="btn-primary btn-large">
              Создать лобби
            </button>

            <div className="divider">или</div>

            <div className="form-group">
              <label htmlFor="joinCode">Код лобби:</label>
              <input
                type="text"
                id="joinCode"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Введите код (6 символов)"
                className="form-control"
                maxLength={6}
              />
            </div>

            <button
              onClick={handleJoinLobby}
              className="btn-secondary btn-large"
              disabled={isJoining}
            >
              {isJoining ? 'Подключение...' : 'Присоединиться к лобби'}
            </button>

            <button onClick={() => navigate('/dashboard')} className="btn-secondary">
              Отмена
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'lobby') {
    return (
      <div className="live-lobby-container">
        <div className="lobby-waiting">
          <h1>{quiz.title}</h1>

          <div className="lobby-code-section">
            <h2>Код лобби:</h2>
            <div className="lobby-code-display">
              <span className="code">{currentLobby.id}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(currentLobby.id);
                  toast.success('Код скопирован!');
                }}
                className="btn-icon"
                title="Скопировать код"
              >
                <FaCopy />
              </button>
            </div>
          </div>

          <div className="players-section">
            <h3>
              <FaUsers /> Игроки ({players.length}/{currentLobby.maxPlayers || maxPlayers})
            </h3>
            <div className="players-list">
              {players.map(player => (
                <div key={player.id} className={`player-item ${player.id === currentLobby.hostId ? 'host' : ''}`}>
                  <FaUser className="player-icon" />
                  <span className="player-name">{player.name}</span>
                  {player.id === currentLobby.hostId && <span className="badge">Хост</span>}
                  {player.id === WebSocketService.socket?.id && <span className="badge-you">Вы</span>}
                </div>
              ))}
            </div>
          </div>

          {isHost && (
            <button
              onClick={handleStartGame}
              className="btn-primary btn-large"
              disabled={players.length < 1}
            >
              <FaPlay /> Начать игру
            </button>
          )}

          {!isHost && (
            <div className="waiting-message">
              <p>Ожидание начала игры...</p>
            </div>
          )}

          <button onClick={handleLeaveGame} className="btn-danger">
            <FaSignOutAlt /> Покинуть лобби
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'countdown') {
    return (
      <div className="live-lobby-container">
        <div className="countdown-screen">
          <h1>Игра начинается через...</h1>
          <div className="countdown-number">{countdown}</div>
        </div>
      </div>
    );
  }

  if (gameState === 'playing') {
    return (
      <div className="live-lobby-container">
        <div className="game-screen">
          <div className="game-header">
            <div className="question-progress">
              Вопрос {questionNumber} из {totalQuestions}
            </div>
            <div className="player-score">
              <FaTrophy /> {myScore}
            </div>
          </div>

          <div className="timer-section">
            <FaClock />
            <div className="timer-bar">
              <div
                className="timer-fill"
                style={{ width: `${(timeLeft / 30) * 100}%` }}
              ></div>
            </div>
            <span className="time-left">{timeLeft}с</span>
          </div>

          <div className="question-section">
            <h2>{currentQuestion?.questionText}</h2>
          </div>

          <form onSubmit={handleSubmitAnswer} className="answer-form">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder={isBlocked ? "Попытки закончились" : "Введите ваш ответ..."}
              className="answer-input"
              disabled={isBlocked}
              autoFocus
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={!answer.trim() || isBlocked}
            >
              {isBlocked ? (hasAnswered ? 'Ответ отправлен' : 'Заблокировано') : 'Отправить'}
            </button>
          </form>

          <div className="attempts-info">
            {!isBlocked && <p>Осталось попыток: {attemptsLeft}/3</p>}
            {isBlocked && !hasAnswered && <p className="blocked-message">❌ Попытки исчерпаны</p>}
          </div>

          {answerResult && answerResult.isCorrect && (
            <div className="answer-feedback correct">
              <p>✅ Правильно! +{answerResult.points} {answerResult.points === 1 ? 'балл' : 'балла'}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (gameState === 'waiting') {
    return (
      <div className="live-lobby-container">
        <div className="waiting-screen">
          <h2>Следующий вопрос через...</h2>
          <div className="countdown-number">{countdown}</div>
          {isHost && (
            <button onClick={handleNextQuestion} className="btn-secondary">
              Пропустить ожидание
            </button>
          )}
        </div>
      </div>
    );
  }

  if (gameState === 'finished') {
    return (
      <div className="live-lobby-container">
        <div className="game-over-screen">
          <h1>🎉 Игра завершена!</h1>

          <div className="final-score">
            <h2>Ваш счёт: {myScore}</h2>
          </div>

          <div className="leaderboard">
            <h3>🏆 Таблица лидеров</h3>
            <div className="leaderboard-list">
              {leaderboard.map((player, index) => (
                <div
                  key={player.id}
                  className={`leaderboard-item ${player.id === WebSocketService.socket?.id ? 'current-player' : ''}`}
                >
                  <div className="position">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                  </div>
                  <div className="player-name">
                    {player.name}
                    {player.id === WebSocketService.socket?.id && ' (Вы)'}
                  </div>
                  <div className="player-score">{player.score}</div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => navigate('/dashboard')} className="btn-primary btn-large">
            Вернуться к викторинам
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default LiveLobby;
