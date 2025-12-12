import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import WebSocketService from '../services/WebSocketService';
import { getCurrentUser } from '../services/userService';
import './LiveLobby.css';
import { FaCopy, FaUser, FaUsers, FaPlay, FaSignOutAlt, FaUserCircle, FaClock, FaTrophy, FaDownload, FaChartBar } from 'react-icons/fa';

const normalizeQuestions = (rawQuestions = []) => {
  return rawQuestions.map((q, index) => {
    let options = [];
    try {
      options = q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : [];
    } catch (e) {
      console.error('Failed to parse options for live lobby:', q.options, e);
      options = [];
    }

    if (!Array.isArray(options) || options.length === 0) {
      options = [q.answer ?? '', '', '', ''];
    }

    if (options.length < 4) {
      options = [...options, ...Array(4 - options.length).fill('')];
    } else if (options.length > 4) {
      options = options.slice(0, 4);
    }

    const baseIndex = typeof q.correct_answer === 'number' ? q.correct_answer : 0;
    const correctAnswerIndex = Math.min(Math.max(baseIndex, 0), options.length - 1);

    return {
      ...q,
      questionText: q.question_text || q.question || `Вопрос ${index + 1}`,
      options,
      correctAnswerIndex,
      correctAnswerText: (options[correctAnswerIndex] ?? q.answer ?? '').toString()
    };
  });
};

const LiveLobby = () => {
  const { quizId, lobbyId: lobbyIdParam } = useParams();
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
  const [selectedOption, setSelectedOption] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [answerResult, setAnswerResult] = useState(null);
  const [myScore, setMyScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [isBlocked, setIsBlocked] = useState(false);
  const [liveStats, setLiveStats] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [revealedAnswer, setRevealedAnswer] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [kicked, setKicked] = useState(false);

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
    WebSocketService.on('liveStats', handleLiveStats);
    WebSocketService.on('gamePaused', handleGamePaused);
    WebSocketService.on('gameResumed', handleGameResumed);
    WebSocketService.on('revealAnswer', handleRevealAnswer);
    WebSocketService.on('chatMessage', handleChatMessage);
    WebSocketService.on('scoreUpdate', handleScoreUpdate);
    WebSocketService.on('kicked', () => {
      setKicked(true);
      toast.error('Вы были кикнуты из лобби');
      navigate('/dashboard');
    });

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

        const normalizedQuestions = normalizeQuestions(response.data.questions || []);
        setQuiz({ ...response.data, questions: normalizedQuestions });
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
    const normalizedQuestion = {
      ...data.question,
      options: data.question?.options || [],
      correctAnswerIndex: typeof data.question?.correctAnswerIndex === 'number'
        ? data.question.correctAnswerIndex
        : 0,
      correctAnswerText: data.question?.correctAnswer || ''
    };
    setCurrentQuestion(normalizedQuestion);
    setQuestionNumber(data.questionNumber);
    setTotalQuestions(data.totalQuestions);
    setTimeLeft(data.timeLimit ? Math.floor(data.timeLimit / 1000) : 30);
    setSelectedOption(null);
    setHasAnswered(false);
    setAnswerResult(null);
    setCountdown(null);
    setAttemptsLeft(3);
    setIsBlocked(false);
    setRevealedAnswer(null);
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
      setSelectedOption(null);
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
    if (data.stats) {
      setLiveStats(data.stats);
    }
    toast.success('Игра завершена!');
  }, []);

  const handleLobbyClosed = useCallback(() => {
    toast.info('Лобби было закрыто');
    navigate('/dashboard');
  }, [navigate]);

  const handleLiveStats = useCallback((data) => {
    if (!data) return;
    setLiveStats(data);
    if (Array.isArray(data.leaderboard)) {
      setLeaderboard(data.leaderboard);
    }
    if (!selectedPlayerId && Array.isArray(data.unansweredPlayers) && data.unansweredPlayers.length > 0) {
      setSelectedPlayerId(data.unansweredPlayers[0].id);
    }
  }, [selectedPlayerId]);

  const handleGamePaused = useCallback((data) => {
    setGameState('paused');
    setCountdown(null);
    setTimeLeft(Math.max(0, Math.ceil((data?.timeLeftMs || 0) / 1000)));
  }, []);

  const handleGameResumed = useCallback((data) => {
    setGameState('playing');
    setTimeLeft(Math.max(0, Math.ceil((data?.timeLeftMs || 0) / 1000)));
  }, []);

  const handleRevealAnswer = useCallback((data) => {
    setRevealedAnswer(data);
  }, []);

  const handleChatMessage = useCallback((msg) => {
    setChatMessages(prev => [...prev.slice(-19), msg]);
  }, []);

  const handleScoreUpdate = useCallback((data) => {
    if (!data || !data.playerId) return;
    setLeaderboard(prev => prev.map(p => p.id === data.playerId ? { ...p, score: data.score } : p));
  }, []);

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
      setLiveStats(null);
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
      const questions = (quiz.questions || []).map((q, index) => {
        const options = Array.isArray(q.options) ? q.options : [];
        const baseIndex = typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0;
        const correctAnswerIndex = Math.min(Math.max(baseIndex, 0), options.length ? options.length - 1 : 0);
        const correctAnswerText = (options[correctAnswerIndex] ?? q.correctAnswerText ?? '').toString();

        return {
          id: q.id || `question-${index}`,
          questionText: q.questionText || q.question || `Вопрос ${index + 1}`,
          options,
          correctAnswerIndex,
          correctAnswer: correctAnswerText
        };
      });

      setLiveStats(null);
      await WebSocketService.startGame(currentLobby.id, questions);
    } catch (error) {
      console.error('Ошибка при запуске игры:', error);
      toast.error('Не удалось запустить игру');
    }
  };

  const handleSubmitAnswer = async () => {
    if (selectedOption === null || isBlocked) return;

    const lobbyIdToUse = currentLobby?.id || lobbyIdParam;
    if (!lobbyIdToUse) {
      toast.error('Лобби не найдено');
      return;
    }

    try {
      await WebSocketService.submitAnswer(lobbyIdToUse, currentQuestion?.id || '', selectedOption);
    } catch (error) {
      console.error('Ошибка при отправке ответа:', error);

      if (error.message.includes('No attempts left')) {
        setIsBlocked(true);
        setAttemptsLeft(0);
        toast.error('Попытки закончились!');
      } else {
        toast.error(error.message || 'Не удалось отправить ответ');
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

  const handleExportCsv = async () => {
    if (!currentLobby?.id) {
      toast.error('Лобби не найдено');
      return;
    }

    setIsExporting(true);
    try {
      const report = await WebSocketService.requestLobbyReport(currentLobby.id);
      const answers = Array.isArray(report?.answers) ? report.answers : [];
      if (answers.length === 0) {
        toast.info('Пока нет ответов для экспорта');
        return;
      }

      const headers = [
        'lobby_id',
        'quiz_id',
        'player_id',
        'player_name',
        'question_id',
        'question_text',
        'answer',
        'is_correct',
        'response_time_ms',
        'attempt',
        'timestamp_iso'
      ];

      const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

      const csvRows = answers.map((row) => [
        report.lobbyId,
        report.quizId,
        row.playerId,
        row.playerName,
        row.questionId,
        row.questionText,
        row.answerText,
        row.isCorrect ? 'true' : 'false',
        row.responseTime ?? '',
        row.attemptNumber ?? 1,
        row.timestamp ? new Date(row.timestamp).toISOString() : ''
      ].map(escape).join(','));

      const csvContent = [headers.map(escape).join(','), ...csvRows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `lobby-${currentLobby.id}-answers.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('CSV экспортирован');
    } catch (error) {
      console.error('Ошибка при экспорте CSV:', error);
      toast.error(error.message || 'Не удалось выгрузить CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePauseGame = async () => {
    if (!currentLobby?.id) return;
    try {
      await WebSocketService.pauseGame(currentLobby.id);
      toast.info('Игра поставлена на паузу');
    } catch (error) {
      toast.error(error.message || 'Не удалось поставить на паузу');
    }
  };

  const handleResumeGame = async () => {
    if (!currentLobby?.id) return;
    try {
      await WebSocketService.resumeGame(currentLobby.id);
      toast.success('Игра возобновлена');
    } catch (error) {
      toast.error(error.message || 'Не удалось возобновить игру');
    }
  };

  const handleStopGame = async () => {
    if (!currentLobby?.id) return;
    try {
      await WebSocketService.stopGame(currentLobby.id);
      toast.info('Игра остановлена');
    } catch (error) {
      toast.error(error.message || 'Не удалось остановить игру');
    }
  };

  const handleRevealAnswerClick = async () => {
    if (!currentLobby?.id) return;
    try {
      await WebSocketService.revealAnswer(currentLobby.id);
    } catch (error) {
      toast.error(error.message || 'Не удалось показать ответ');
    }
  };

  const handleSendChat = async () => {
    if (!currentLobby?.id) return;
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    try {
      await WebSocketService.sendChatMessage(currentLobby.id, trimmed);
      setChatInput('');
    } catch (error) {
      toast.error(error.message || 'Не удалось отправить сообщение');
    }
  };

  const handleAdjustScore = async (delta) => {
    if (!currentLobby?.id || !selectedPlayerId) return;
    try {
      await WebSocketService.adjustScore(currentLobby.id, selectedPlayerId, delta);
      toast.success(delta > 0 ? 'Бонус выдан' : 'Штраф применён');
    } catch (error) {
      toast.error(error.message || 'Не удалось изменить счёт');
    }
  };

  const handleKickPlayer = async (playerId) => {
    if (!currentLobby?.id) return;
    try {
      await WebSocketService.kickPlayer(currentLobby.id, playerId);
      toast.info('Игрок кикнут');
    } catch (error) {
      toast.error(error.message || 'Не удалось кикнуть игрока');
    }
  };

  const renderLiveStatsPanel = () => {
    if (!isHost) return null;

    const accuracy = liveStats?.accuracyPercent ?? 0;
    const avgTime = liveStats?.avgResponseTimeMs ?? 0;
    const totalAnswers = liveStats?.totalAnswers ?? 0;
    const unanswered = liveStats?.unansweredPlayers || [];

    return (
      <div className="live-admin-panel">
        <div className="panel-header">
          <div className="panel-title">
            <FaChartBar />
            <div>
              <p className="panel-subtitle">Live Mode</p>
              <strong>Панель хоста</strong>
            </div>
          </div>
          <div className="panel-actions">
            <button
              onClick={gameState === 'paused' ? handleResumeGame : handlePauseGame}
              className="btn-secondary panel-export"
              disabled={!['playing', 'paused'].includes(gameState)}
            >
              {gameState === 'paused' ? 'Продолжить' : 'Пауза'}
            </button>
            <button
              onClick={handleRevealAnswerClick}
              className="btn-secondary panel-export"
              disabled={!currentQuestion}
            >
              Показать ответ
            </button>
            <button
              onClick={handleStopGame}
              className="btn-danger panel-export"
            >
              Стоп раунда
            </button>
            <button
              onClick={handleExportCsv}
              className="btn-secondary panel-export"
              disabled={isExporting}
            >
              <FaDownload />
              {isExporting ? 'Готовим CSV...' : 'Экспорт CSV'}
            </button>
          </div>
        </div>

        <div className="stat-grid">
          <div className="stat-card">
            <p className="stat-label">Среднее время ответа</p>
            <div className="stat-value">{avgTime} мс</div>
            <p className="stat-hint">По всем попыткам</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">% правильных</p>
            <div className="stat-value">{accuracy}%</div>
            <p className="stat-hint">Точность участников</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Ответов получено</p>
            <div className="stat-value">{totalAnswers}</div>
            <p className="stat-hint">Суммарно по лобби</p>
          </div>
        </div>

        <div className="inline-two">
          <div className="mini-block">
            <p className="stat-label">Не ответили</p>
            <div className="chips">
              {unanswered.length === 0 ? (
                <span className="chip muted">Все ответили</span>
              ) : unanswered.map((p) => (
                <span key={p.id} className="chip">
                  {p.name}
                </span>
              ))}
            </div>
          </div>

          <div className="mini-block">
            <p className="stat-label">Штраф/бонус</p>
            <div className="adjust-row">
              <select
                value={selectedPlayerId || ''}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
              >
                <option value="">Выберите игрока</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <div className="adjust-buttons">
                <button onClick={() => handleAdjustScore(-1)} className="btn-secondary" disabled={!selectedPlayerId}>-1</button>
                <button onClick={() => handleAdjustScore(1)} className="btn-secondary" disabled={!selectedPlayerId}>+1</button>
              </div>
            </div>
          </div>
        </div>

        <div className="mini-block">
          <p className="stat-label">Чат / объявление</p>
          <div className="chat-box">
            <div className="chat-messages">
              {chatMessages.map((m, idx) => (
                <div key={`${m.timestamp}-${idx}`} className="chat-row">
                  <span className="chat-name">{m.isHost ? 'Хост' : m.playerName}:</span>
                  <span>{m.message}</span>
                </div>
              ))}
              {chatMessages.length === 0 && <div className="chat-empty">Сообщений пока нет</div>}
            </div>
            <div className="chat-input">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Сообщение для всех..."
              />
              <button onClick={handleSendChat} className="btn-secondary">Отправить</button>
            </div>
          </div>
        </div>

        {Array.isArray(liveStats?.perQuestion) && liveStats.perQuestion.length > 0 && (
          <div className="question-stats">
            <div className="question-stats-header">По вопросам</div>
            <div className="question-stats-list">
              {liveStats.perQuestion.map((q) => (
                <div key={q.questionId} className="question-stat-item">
                  <div className="question-title">{q.questionText}</div>
                  <div className="question-metrics">
                    <span>{q.accuracyPercent}% точных</span>
                    <span>{q.avgResponseTimeMs} мс</span>
                    <span>{q.totalAnswers} ответов</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderChatPanel = (showInput = isHost) => {
    if (chatMessages.length === 0 && !showInput) return null;

    return (
      <div className="chat-panel">
        <div className="chat-panel-header">
          <span>Чат / объявления</span>
        </div>
        <div className="chat-messages">
          {chatMessages.length === 0 && <div className="chat-empty">Сообщений пока нет</div>}
          {chatMessages.map((m, idx) => (
            <div key={`${m.timestamp}-${idx}`} className="chat-row">
              <span className="chat-name">{m.isHost ? 'Хост' : m.playerName}:</span>
              <span>{m.message}</span>
            </div>
          ))}
        </div>
        {showInput && (
          <div className="chat-input">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Сообщение для всех..."
            />
            <button onClick={handleSendChat} className="btn-secondary">Отправить</button>
          </div>
        )}
      </div>
    );
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
              <div className="select-wrapper">
                <select
                  id="maxPlayers"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                  className="form-control select"
                >
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20].map(num => (
                    <option key={num} value={num}>{num} игроков</option>
                  ))}
                </select>
              </div>
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
          <div className="lobby-hero">
            <span className="eyebrow">Live lobby</span>
            <h1>{quiz.title}</h1>
          </div>

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
                  {isHost && player.id !== WebSocketService.socket?.id && (
                    <button
                      className="kick-btn"
                      onClick={() => handleKickPlayer(player.id)}
                      title="Кикнуть игрока"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="lobby-actions">
            {isHost ? (
              <div className="lobby-cta">
                <button
                  onClick={handleStartGame}
                  className="btn-cta"
                  disabled={players.length < 1}
                >
                  <FaPlay /> Начать игру
                </button>
                <button onClick={handleLeaveGame} className="btn-ghost">
                  <FaSignOutAlt /> Покинуть лобби
                </button>
              </div>
            ) : (
              <div className="waiting-message">
                <p>Ожидание начала игры...</p>
                <button onClick={handleLeaveGame} className="btn-ghost" style={{ marginTop: '10px' }}>
                  <FaSignOutAlt /> Покинуть лобби
                </button>
              </div>
            )}
          </div>
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
            {revealedAnswer && (
              <div className="reveal-banner">
                Правильный ответ: {revealedAnswer.correctAnswer}
              </div>
            )}
          </div>

          <div className="answer-options">
            {currentQuestion?.options?.map((option, idx) => (
              <button
                key={idx}
                type="button"
                className={`option-button ${selectedOption === idx ? 'selected' : ''}`}
                onClick={() => !isBlocked && setSelectedOption(idx)}
                disabled={isBlocked}
              >
                <span className="option-label">{String.fromCharCode(65 + idx)}</span>
                <span className="option-text">{option}</span>
              </button>
            ))}
          </div>

          <div className="answer-controls">
            <button
              onClick={handleSubmitAnswer}
              className="answer-button"
              disabled={selectedOption === null || isBlocked}
            >
              {isBlocked ? (hasAnswered ? 'Ответ принят' : 'Заблокировано') : 'Ответить'}
            </button>
          </div>

          <div className="attempts-info">
            {!isBlocked && <p>Осталось попыток: {attemptsLeft}/3</p>}
            {isBlocked && !hasAnswered && <p className="blocked-message">❌ Попытки исчерпаны</p>}
          </div>

          {renderLiveStatsPanel()}
          {renderChatPanel(false)}

          {answerResult && answerResult.isCorrect && (
            <div className="answer-feedback correct">
              <p>✅ Правильно! +{answerResult.points} {answerResult.points === 1 ? 'балл' : 'балла'}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (gameState === 'paused') {
    return (
      <div className="live-lobby-container">
        <div className="game-screen paused">
          <div className="game-header">
            <div className="question-progress">Игра на паузе</div>
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
            {revealedAnswer && (
              <div className="reveal-banner">
                Правильный ответ: {revealedAnswer.correctAnswer}
              </div>
            )}
          </div>

          <div className="paused-overlay">
            <p>Раунд на паузе</p>
            {isHost && (
              <button onClick={handleResumeGame} className="btn-primary btn-large">
                Продолжить
              </button>
            )}
          </div>

          {renderLiveStatsPanel()}
          {renderChatPanel(false)}
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
          {renderLiveStatsPanel()}
          {renderChatPanel(false)}
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

          {renderLiveStatsPanel()}
          {renderChatPanel(false)}

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
