const { Server } = require('socket.io');

class LobbyManager {
  constructor() {
    this.lobbies = new Map();
    this.userToLobby = new Map();
  }

  createLobby(quizId, maxPlayers, hostId, hostName) {
    const lobbyId = this.generateLobbyId();
    console.log(`Creating new lobby with ID: ${lobbyId}, quizId: ${quizId}, host: ${hostName}`);

    const lobby = {
      id: lobbyId,
      quizId: quizId || 'default-quiz',
      maxPlayers: Math.max(2, Math.min(20, parseInt(maxPlayers, 10) || 4)),
      players: new Map([[hostId, {
        id: hostId,
        name: hostName || 'Host',
        score: 0,
        isReady: true
      }]]),
      gameState: 'waiting',
      currentQuestion: null,
      currentQuestionIndex: -1,
      questions: [],
      questionStartTime: null,
      questionAnswers: new Map(),
      hostId,
      createdAt: new Date(),
      timePerQuestionMs: 30000,
      pauseRemainingMs: null,
      analytics: {
        answers: []
      }
    };

    this.lobbies.set(lobbyId, lobby);
    this.userToLobby.set(hostId, lobbyId);

    console.log(`Lobby created: ${lobbyId}`);
    return lobby;
  }

  joinLobby(lobbyId, userId, userName) {
    if (!lobbyId) {
      console.error('No lobby ID provided');
      return { error: 'Не указан код лобби' };
    }

    console.log(`Attempting to join lobby: ${lobbyId}`);
    console.log(`Current lobbies:`, Array.from(this.lobbies.keys()));

    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) {
      console.error(`Lobby not found: ${lobbyId}`);
      return { error: 'Лобби не найдено' };
    }

    if (lobby.gameState !== 'waiting') {
      console.error(`Game has already started in lobby: ${lobbyId}`);
      return { error: 'Игра уже началась' };
    }

    if (lobby.players.size >= lobby.maxPlayers) {
      console.error(`Lobby ${lobbyId} is full (${lobby.players.size}/${lobby.maxPlayers} players)`);
      return { error: 'Лобби переполнено' };
    }

    if (lobby.players.has(userId)) {
      console.error(`User ${userId} is already in lobby ${lobbyId}`);
      return { error: 'Вы уже в этом лобби' };
    }

    lobby.players.set(userId, {
      id: userId,
      name: userName,
      score: 0,
      isReady: false,
      joinTime: new Date().toISOString()
    });

    this.userToLobby.set(userId, lobbyId);

    console.log(`User ${userName} (${userId}) successfully joined lobby ${lobbyId}`);
    console.log(`Lobby ${lobbyId} now has ${lobby.players.size} players`);

    return { lobby };
  }

  leaveLobby(userId) {
    const lobbyId = this.userToLobby.get(userId);
    if (!lobbyId) return null;

    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return null;

    const playerLeft = lobby.players.get(userId);
    const wasHost = lobby.hostId === userId;

    lobby.players.delete(userId);
    this.userToLobby.delete(userId);

    if (wasHost) {
      if (lobby.players.size > 0) {
        const newHostId = lobby.players.keys().next().value;
        lobby.hostId = newHostId;
        console.log(`New host assigned: ${newHostId}`);
      } else {
        this.lobbies.delete(lobbyId);
        console.log(`Lobby ${lobbyId} closed (no players left)`);
        return { lobbyId, closed: true };
      }
    }

    return { lobbyId, playerLeft, wasHost };
  }

  startGame(lobbyId, questions) {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return { error: 'Lobby not found' };
    if (lobby.gameState !== 'waiting') return { error: 'Game already in progress' };
    if (lobby.players.size < 1) return { error: 'Not enough players' };

    if (!questions || questions.length === 0) {
      console.error(`No questions provided for lobby ${lobbyId}`);
      return { error: 'No questions provided' };
    }

    lobby.questions = questions.map((q, index) => {
      const options = Array.isArray(q.options) ? q.options : [];
      const baseIndex = typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0;
      const correctedIndex = Math.min(Math.max(baseIndex, 0), options.length > 0 ? options.length - 1 : 0);
      const answerText = (options[correctedIndex] ?? q.correctAnswer ?? '').toString();

      return {
        ...q,
        questionText: q.questionText || q.question || `Вопрос ${index + 1}`,
        options,
        correctAnswerIndex: correctedIndex,
        correctAnswer: answerText
      };
    });
    lobby.currentQuestionIndex = -1;
    lobby.gameState = 'starting';
    lobby.analytics = { answers: [] }; // сбрасываем аналитику перед стартом
    lobby.pauseRemainingMs = null;
    lobby.timePerQuestionMs = 30000;

    for (const player of lobby.players.values()) {
      player.isReady = true;
    }

    console.log(`Game starting in lobby ${lobbyId} with ${questions.length} questions`);
    return { lobby };
  }

  getNextQuestion(lobbyId) {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return null;

    if (lobby.gameState === 'starting') {
      lobby.gameState = 'in_progress';
    }

    if (!lobby.questions || lobby.questions.length === 0) {
      console.error(`No questions found in lobby ${lobbyId}`);
      lobby.gameState = 'finished';
      return { gameOver: true, leaderboard: this.getLeaderboard(lobby) };
    }

    if (lobby.currentQuestionIndex >= lobby.questions.length - 1) {
      lobby.gameState = 'finished';
      return { gameOver: true, leaderboard: this.getLeaderboard(lobby) };
    }

    lobby.currentQuestionIndex++;
    lobby.questionAnswers = new Map();
    lobby.playerAttempts = new Map(); // Очищаем попытки при новом вопросе
    const question = lobby.questions[lobby.currentQuestionIndex];
    lobby.currentQuestion = question;
    lobby.questionStartTime = Date.now();

    return {
      question,
      questionNumber: lobby.currentQuestionIndex + 1,
      totalQuestions: lobby.questions.length,
      isLastQuestion: lobby.currentQuestionIndex === lobby.questions.length - 1
    };
  }

  submitAnswer(lobbyId, userId, answer, responseTime) {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby || !lobby.currentQuestion) return null;

    const player = lobby.players.get(userId);
    if (!player) return null;

    if (!lobby.questionAnswers) {
      lobby.questionAnswers = new Map();
    }

    // Инициализируем попытки игрока если их нет
    if (!lobby.playerAttempts) {
      lobby.playerAttempts = new Map();
    }

    const currentAttempts = lobby.playerAttempts.get(userId) || 0;

    // Проверяем, не исчерпал ли игрок все попытки
    if (currentAttempts >= 3) {
      return { error: 'No attempts left', attemptsLeft: 0 };
    }

    // Проверяем, не ответил ли игрок уже правильно
    const existingAnswer = lobby.questionAnswers.get(userId);
    if (existingAnswer && existingAnswer.isCorrect) {
      return { error: 'Already answered correctly' };
    }

    let answerIndex = typeof answer === 'number' ? answer : parseInt(answer, 10);
    if (Number.isNaN(answerIndex)) {
      answerIndex = null;
    }

    const correctIndex = typeof lobby.currentQuestion.correctAnswerIndex === 'number'
      ? lobby.currentQuestion.correctAnswerIndex
      : null;

    const correctAnswerText = (lobby.currentQuestion.correctAnswer || '').toString();
    let answerText = '';
    if (answerIndex !== null && Array.isArray(lobby.currentQuestion.options)) {
      answerText = (lobby.currentQuestion.options[answerIndex] || '').toString();
    } else {
      answerText = typeof answer === 'string' ? answer : '';
    }

    const isCorrect = correctIndex !== null && answerIndex !== null
      ? answerIndex === correctIndex
      : answerText.trim().toLowerCase() === correctAnswerText.trim().toLowerCase();

    // Увеличиваем счётчик попыток только если ответ неверный
    if (!isCorrect) {
      lobby.playerAttempts.set(userId, currentAttempts + 1);
    }

    const answerData = {
      answer: answerText,
      answerIndex,
      isCorrect,
      responseTime,
      timestamp: Date.now(),
      attemptNumber: currentAttempts + 1
    };

    // Обновляем или сохраняем ответ игрока
    if (isCorrect) {
      lobby.questionAnswers.set(userId, answerData);
    }

    // Новая система баллов: баллы получают только те, кто правильно ответил
    // Если несколько правильных ответов одновременно - делим балл поровну
    if (isCorrect) {
      const correctAnswers = Array.from(lobby.questionAnswers.entries())
        .filter(([_, a]) => a.isCorrect)
        .sort((a, b) => a[1].timestamp - b[1].timestamp);

      const firstAnswerTime = correctAnswers[0][1].timestamp;
      const simultaneousAnswers = correctAnswers.filter(([_, a]) => a.timestamp === firstAnswerTime);
      const pointsPerPlayer = 1 / simultaneousAnswers.length;

      // Начисляем баллы всем кто ответил одновременно первым
      simultaneousAnswers.forEach(([playerId, answerData]) => {
        const p = lobby.players.get(playerId);
        if (p) {
          p.score = (p.score || 0) + pointsPerPlayer;
          answerData.points = pointsPerPlayer;
        }
      });

      answerData.points = pointsPerPlayer;
    } else {
      answerData.points = 0;
    }

    player.lastAnswer = answerData;

    // Проверяем: есть ли хотя бы один правильный ответ - если да, переходим к следующему вопросу
    const correctAnswersCount = Array.from(lobby.questionAnswers.values())
      .filter(a => a.isCorrect).length;

    const shouldMoveToNextQuestion = correctAnswersCount > 0;
    const attemptsLeft = 3 - (lobby.playerAttempts.get(userId) || 0);

    // Записываем попытку в аналитику
    if (lobby.analytics && lobby.currentQuestion) {
      lobby.analytics.answers.push({
        lobbyId,
        questionId: lobby.currentQuestion.id || `question-${lobby.currentQuestionIndex + 1}`,
        questionText: lobby.currentQuestion.questionText,
        playerId: userId,
        playerName: player.name,
        isCorrect,
        answerText,
        answerIndex,
        responseTime,
        timestamp: Date.now(),
        attemptNumber: currentAttempts + 1
      });
    }

    return {
      playerId: userId,
      isCorrect,
      points: answerData.points,
      responseTime,
      currentScore: player.score,
      shouldMoveToNextQuestion,
      attemptsLeft,
      attemptNumber: currentAttempts + 1
    };
  }

  getLeaderboard(lobby) {
    return Array.from(lobby.players.values())
      .sort((a, b) => b.score - a.score)
      .map(player => ({
        id: player.id,
        name: player.name,
        score: player.score
      }));
  }

  buildLiveStats(lobby) {
    const answers = lobby.analytics?.answers || [];
    const totalAnswers = answers.length;
    const correctAnswers = answers.filter(a => a.isCorrect).length;
    const avgResponseTimeMs = totalAnswers
      ? Math.round(
          answers.reduce((acc, curr) => acc + (curr.responseTime || 0), 0) /
          totalAnswers
        )
      : 0;

    const perQuestion = (lobby.questions || []).map((q, idx) => {
      const questionId = q.id || `question-${idx + 1}`;
      const qAnswers = answers.filter(a => a.questionId === questionId);
      const qTotal = qAnswers.length;
      const qCorrect = qAnswers.filter(a => a.isCorrect).length;
      const qAvg = qTotal
        ? Math.round(qAnswers.reduce((acc, curr) => acc + (curr.responseTime || 0), 0) / qTotal)
        : 0;

      return {
        questionId,
        questionText: q.questionText || q.question || `Вопрос ${idx + 1}`,
        avgResponseTimeMs: qAvg,
        accuracyPercent: qTotal ? Math.round((qCorrect / qTotal) * 100) : 0,
        totalAnswers: qTotal
      };
    });

    const currentQuestionId = lobby.currentQuestion?.id || `question-${lobby.currentQuestionIndex + 1}`;
    const answeredIds = new Set(
      answers
        .filter(a => a.questionId === currentQuestionId)
        .map(a => a.playerId)
    );
    const unansweredPlayers = Array.from(lobby.players.values())
      .filter(p => !answeredIds.has(p.id))
      .map(p => ({ id: p.id, name: p.name, score: p.score }));

    return {
      lobbyId: lobby.id,
      totalAnswers,
      totalPlayers: lobby.players.size,
      avgResponseTimeMs,
      accuracyPercent: totalAnswers ? Math.round((correctAnswers / totalAnswers) * 100) : 0,
      leaderboard: this.getLeaderboard(lobby),
      perQuestion,
      unansweredPlayers
    };
  }

  buildReport(lobby) {
    const stats = this.buildLiveStats(lobby);
    return {
      ...stats,
      answers: lobby.analytics?.answers || [],
      startedAt: lobby.createdAt,
      quizId: lobby.quizId
    };
  }

  generateLobbyId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  getLobby(lobbyId) {
    return this.lobbies.get(lobbyId);
  }

  getLobbyByPlayer(userId) {
    const lobbyId = this.userToLobby.get(userId);
    return lobbyId ? this.lobbies.get(lobbyId) : null;
  }
}

function setupWebSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  const lobbyManager = new LobbyManager();

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('createLobby', ({ quizId, maxPlayers, userName }, callback) => {
      try {
        const lobby = lobbyManager.createLobby(quizId, maxPlayers, socket.id, userName);
        socket.join(lobby.id);
        callback({ success: true, lobby });

        socket.emit('lobbyUpdate', {
          lobbyId: lobby.id,
          players: Array.from(lobby.players.values()),
          hostId: lobby.hostId,
          gameState: lobby.gameState,
          maxPlayers: lobby.maxPlayers
        });
      } catch (error) {
        console.error('Error creating lobby:', error);
        callback({ success: false, error: 'Failed to create lobby' });
      }
    });

    socket.on('joinLobby', ({ lobbyId, lobbyCode, userName }, callback) => {
      try {
        const actualLobbyId = lobbyCode || lobbyId;
        const normalizedLobbyId = (actualLobbyId || '').toString().trim().toUpperCase();

        if (!normalizedLobbyId) {
          return callback({ success: false, error: 'Не указан код лобби' });
        }

        console.log(`Join attempt - Lobby: ${normalizedLobbyId}, User: ${userName}`);
        console.log('Available lobbies:', Array.from(lobbyManager.lobbies.keys()));

        const result = lobbyManager.joinLobby(normalizedLobbyId, socket.id, userName);
        if (result.error) {
          console.error(`Join failed for lobby ${normalizedLobbyId}:`, result.error);
          return callback({ success: false, error: result.error });
        }

        socket.join(normalizedLobbyId);
        const lobby = result.lobby;

        io.to(normalizedLobbyId).emit('playerJoined', {
          player: { id: socket.id, name: userName, score: 0, isReady: false },
          players: Array.from(lobby.players.values()),
          hostId: lobby.hostId
        });

        console.log(`User ${userName} successfully joined lobby ${normalizedLobbyId}`);

        callback({
          success: true,
          lobby: {
            id: lobby.id,
            quizId: lobby.quizId,
            maxPlayers: lobby.maxPlayers,
            players: Array.from(lobby.players.values()),
            hostId: lobby.hostId,
            gameState: lobby.gameState
          }
        });
      } catch (error) {
        console.error('Error in joinLobby:', error);
        callback({
          success: false,
          error: 'Не удалось присоединиться к лобби: ' + (error.message || 'Неизвестная ошибка')
        });
      }
    });

    socket.on('startGame', ({ lobbyId, questions }, callback) => {
      try {
        const lobby = lobbyManager.getLobby(lobbyId);
        if (!lobby || lobby.hostId !== socket.id) {
          return callback({ success: false, error: 'Not authorized' });
        }

        const result = lobbyManager.startGame(lobbyId, questions);
        if (result.error) {
          return callback({ success: false, error: result.error });
        }

        io.to(lobbyId).emit('gameStarting', { countdown: 5 });

        const cycleQuestion = () => {
          const currentLobby = lobbyManager.getLobby(lobbyId);
          if (!currentLobby) return;

          // Очищаем предыдущие таймеры если есть
          if (currentLobby.questionTimer) {
            clearTimeout(currentLobby.questionTimer);
            currentLobby.questionTimer = null;
          }
          if (currentLobby.countdownTimer) {
            clearTimeout(currentLobby.countdownTimer);
            currentLobby.countdownTimer = null;
          }

          const questionResult = lobbyManager.getNextQuestion(lobbyId);

          if (questionResult && questionResult.gameOver) {
            // Сразу показываем итоги, без countdown
            const stats = lobbyManager.buildLiveStats(currentLobby);
            io.to(lobbyId).emit('gameOver', { leaderboard: questionResult.leaderboard, stats });
            setTimeout(() => {
              const finalLobby = lobbyManager.getLobby(lobbyId);
              if (finalLobby) {
                finalLobby.players.forEach((_, playerId) => {
                  io.sockets.sockets.get(playerId)?.leave(lobbyId);
                  lobbyManager.leaveLobby(playerId);
                });
                lobbyManager.lobbies.delete(lobbyId);
              }
            }, 30000);
            return;
          }

          if (questionResult) {
            const timeLimitMs = currentLobby.timePerQuestionMs || 30000;
            io.to(lobbyId).emit('question', {
              ...questionResult,
              timeLimit: timeLimitMs,
              questionStartTime: Date.now()
            });

            const stats = lobbyManager.buildLiveStats(currentLobby);
            io.to(lobbyId).emit('liveStats', stats);

            // Сохраняем таймер чтобы можно было отменить при правильном ответе
            currentLobby.questionStartTime = Date.now();
            currentLobby.pauseRemainingMs = null;
            currentLobby.questionTimer = setTimeout(() => {
              io.to(lobbyId).emit('nextQuestionCountdown', { countdown: 3 });

              currentLobby.countdownTimer = setTimeout(() => {
                cycleQuestion();
              }, 3000);
            }, timeLimitMs);
          }
        };

        // Сохраняем функцию cycleQuestion в лобби для доступа из submitAnswer
        lobby.cycleQuestion = cycleQuestion;

        setTimeout(() => {
          lobby.gameState = 'in_progress';
          cycleQuestion();
        }, 5000);

        callback({ success: true });
      } catch (error) {
        console.error('Error starting game:', error);
        callback({ success: false, error: 'Failed to start game' });
      }
    });

    socket.on('submitAnswer', ({ lobbyId, answer }, callback) => {
      try {
        const lobby = lobbyManager.getLobby(lobbyId);
        if (!lobby || lobby.gameState !== 'in_progress' || !lobby.currentQuestion) {
          return callback({ success: false, error: 'Not in an active question' });
        }

        const responseTime = Date.now() - lobby.questionStartTime;
        const result = lobbyManager.submitAnswer(lobbyId, socket.id, answer, responseTime);

        if (!result) {
          return callback({ success: false, error: 'Failed to submit answer' });
        }

        if (result.error) {
          return callback({ success: false, error: result.error, attemptsLeft: result.attemptsLeft });
        }

        socket.emit('answerResult', {
          isCorrect: result.isCorrect,
          points: result.points,
          correctAnswer: result.isCorrect ? lobby.currentQuestion.correctAnswer : null,
          currentScore: result.currentScore,
          attemptsLeft: result.attemptsLeft,
          attemptNumber: result.attemptNumber
        });

        const isLastQuestion = lobby.currentQuestionIndex === lobby.questions.length - 1;
        const stats = lobbyManager.buildLiveStats(lobby);
        io.to(lobbyId).emit('liveStats', stats);

        // Если кто-то ответил правильно - переходим к следующему вопросу или завершаем игру
        if (result.shouldMoveToNextQuestion) {
          // Отменяем текущие таймеры
          if (lobby.questionTimer) {
            clearTimeout(lobby.questionTimer);
            lobby.questionTimer = null;
          }
          if (lobby.countdownTimer) {
            clearTimeout(lobby.countdownTimer);
            lobby.countdownTimer = null;
          }

          // Если это последний вопрос - сразу показываем статистику всем
          if (isLastQuestion) {
            const leaderboard = lobbyManager.getLeaderboard(lobby);
            io.to(lobbyId).emit('gameOver', { leaderboard, stats });

            setTimeout(() => {
              const finalLobby = lobbyManager.getLobby(lobbyId);
              if (finalLobby) {
                finalLobby.players.forEach((_, playerId) => {
                  io.sockets.sockets.get(playerId)?.leave(lobbyId);
                  lobbyManager.leaveLobby(playerId);
                });
                lobbyManager.lobbies.delete(lobbyId);
              }
            }, 30000);
          } else {
            // Для остальных вопросов показываем countdown
            io.to(lobbyId).emit('nextQuestionCountdown', { countdown: 3 });

            setTimeout(() => {
              if (lobby.cycleQuestion) {
                lobby.cycleQuestion();
              }
            }, 3000);
          }
        }

        callback({ success: true});
      } catch (error) {
        console.error('Error submitting answer:', error);
        callback({ success: false, error: 'Failed to submit answer' });
      }
    });

    socket.on('nextQuestion', ({ lobbyId }, callback) => {
      try {
        const lobby = lobbyManager.getLobby(lobbyId);
        if (!lobby || lobby.hostId !== socket.id) {
          return callback({ success: false, error: 'Not authorized' });
        }

        io.to(lobbyId).emit('nextQuestionCountdown', { countdown: 5 });

        setTimeout(() => {
          const questionResult = lobbyManager.getNextQuestion(lobbyId);

          if (questionResult && questionResult.gameOver) {
            const stats = lobbyManager.buildLiveStats(lobby);
            io.to(lobbyId).emit('gameOver', { leaderboard: questionResult.leaderboard, stats });
            setTimeout(() => {
              lobby.players.forEach((_, playerId) => {
                io.sockets.sockets.get(playerId)?.leave(lobbyId);
                lobbyManager.leaveLobby(playerId);
              });
              lobbyManager.lobbies.delete(lobbyId);
            }, 30000);
            return callback({ success: true, gameOver: true });
          }

          if (questionResult) {
            const timeLimitMs = lobby.timePerQuestionMs || 30000;
            io.to(lobbyId).emit('question', {
              ...questionResult,
              timeLimit: timeLimitMs,
              questionStartTime: Date.now()
            });

            const stats = lobbyManager.buildLiveStats(lobby);
            io.to(lobbyId).emit('liveStats', stats);

            lobby.questionStartTime = Date.now();
            lobby.pauseRemainingMs = null;
            if (lobby.questionTimer) {
              clearTimeout(lobby.questionTimer);
            }
            if (lobby.countdownTimer) {
              clearTimeout(lobby.countdownTimer);
            }
            lobby.questionTimer = setTimeout(() => {
              io.to(lobbyId).emit('nextQuestionCountdown', { countdown: 3 });
              lobby.countdownTimer = setTimeout(() => {
                if (lobby.cycleQuestion) {
                  lobby.cycleQuestion();
                }
              }, 3000);
            }, timeLimitMs);
          }

          callback({ success: true });
        }, 5000);
      } catch (error) {
        console.error('Error getting next question:', error);
        callback({ success: false, error: 'Failed to get next question' });
      }
    });

    socket.on('pauseGame', ({ lobbyId }, callback) => {
      try {
        const lobby = lobbyManager.getLobby(lobbyId);
        if (!lobby || lobby.hostId !== socket.id) {
          return callback?.({ success: false, error: 'Not authorized' });
        }
        if (lobby.gameState !== 'in_progress') {
          return callback?.({ success: false, error: 'Игра не идёт' });
        }

        const elapsed = lobby.questionStartTime ? Date.now() - lobby.questionStartTime : 0;
        const timeLimitMs = lobby.timePerQuestionMs || 30000;
        const remaining = Math.max(timeLimitMs - elapsed, 0);
        lobby.pauseRemainingMs = remaining;
        lobby.gameState = 'paused';

        if (lobby.questionTimer) {
          clearTimeout(lobby.questionTimer);
          lobby.questionTimer = null;
        }
        if (lobby.countdownTimer) {
          clearTimeout(lobby.countdownTimer);
          lobby.countdownTimer = null;
        }

        io.to(lobbyId).emit('gamePaused', { timeLeftMs: remaining });
        callback?.({ success: true, timeLeftMs: remaining });
      } catch (error) {
        console.error('Error pausing game:', error);
        callback?.({ success: false, error: 'Failed to pause game' });
      }
    });

    socket.on('resumeGame', ({ lobbyId }, callback) => {
      try {
        const lobby = lobbyManager.getLobby(lobbyId);
        if (!lobby || lobby.hostId !== socket.id) {
          return callback?.({ success: false, error: 'Not authorized' });
        }
        if (lobby.gameState !== 'paused') {
          return callback?.({ success: false, error: 'Игра не на паузе' });
        }

        const remaining = lobby.pauseRemainingMs ?? lobby.timePerQuestionMs ?? 30000;
        lobby.gameState = 'in_progress';
        lobby.questionStartTime = Date.now();

        if (lobby.questionTimer) {
          clearTimeout(lobby.questionTimer);
        }
        if (lobby.countdownTimer) {
          clearTimeout(lobby.countdownTimer);
        }

        lobby.questionTimer = setTimeout(() => {
          io.to(lobbyId).emit('nextQuestionCountdown', { countdown: 3 });
          lobby.countdownTimer = setTimeout(() => {
            if (lobby.cycleQuestion) {
              lobby.cycleQuestion();
            }
          }, 3000);
        }, remaining);

        io.to(lobbyId).emit('gameResumed', { timeLeftMs: remaining });
        callback?.({ success: true, timeLeftMs: remaining });
      } catch (error) {
        console.error('Error resuming game:', error);
        callback?.({ success: false, error: 'Failed to resume game' });
      }
    });

    socket.on('stopGame', ({ lobbyId }, callback) => {
      try {
        const lobby = lobbyManager.getLobby(lobbyId);
        if (!lobby || lobby.hostId !== socket.id) {
          return callback?.({ success: false, error: 'Not authorized' });
        }

        if (lobby.questionTimer) {
          clearTimeout(lobby.questionTimer);
          lobby.questionTimer = null;
        }
        if (lobby.countdownTimer) {
          clearTimeout(lobby.countdownTimer);
          lobby.countdownTimer = null;
        }

        lobby.gameState = 'finished';
        const stats = lobbyManager.buildLiveStats(lobby);
        const leaderboard = lobbyManager.getLeaderboard(lobby);
        io.to(lobbyId).emit('gameOver', { leaderboard, stats, stopped: true });

        setTimeout(() => {
          const finalLobby = lobbyManager.getLobby(lobbyId);
          if (finalLobby) {
            finalLobby.players.forEach((_, playerId) => {
              io.sockets.sockets.get(playerId)?.leave(lobbyId);
              lobbyManager.leaveLobby(playerId);
            });
            lobbyManager.lobbies.delete(lobbyId);
          }
        }, 30000);

        callback?.({ success: true });
      } catch (error) {
        console.error('Error stopping game:', error);
        callback?.({ success: false, error: 'Failed to stop game' });
      }
    });

    socket.on('kickPlayer', ({ lobbyId, targetPlayerId }, callback) => {
      try {
        const lobby = lobbyManager.getLobby(lobbyId);
        if (!lobby || lobby.hostId !== socket.id) {
          return callback?.({ success: false, error: 'Not authorized' });
        }
        if (targetPlayerId === socket.id) {
          return callback?.({ success: false, error: 'Нельзя кикнуть себя' });
        }

        const target = lobby.players.get(targetPlayerId);
        if (!target) {
          return callback?.({ success: false, error: 'Игрок не найден' });
        }

        lobby.players.delete(targetPlayerId);
        lobbyManager.userToLobby.delete(targetPlayerId);

        const targetSocket = io.sockets.sockets.get(targetPlayerId);
        if (targetSocket) {
          targetSocket.leave(lobbyId);
          targetSocket.emit('kicked', { lobbyId });
        }

        io.to(lobbyId).emit('playerLeft', { playerId: targetPlayerId });

        if (lobby.players.size === 0) {
          lobbyManager.lobbies.delete(lobbyId);
        }

        callback?.({ success: true });
      } catch (error) {
        console.error('Error kicking player:', error);
        callback?.({ success: false, error: 'Failed to kick player' });
      }
    });

    socket.on('revealAnswer', ({ lobbyId }, callback) => {
      try {
        const lobby = lobbyManager.getLobby(lobbyId);
        if (!lobby || lobby.hostId !== socket.id) {
          return callback?.({ success: false, error: 'Not authorized' });
        }
        if (!lobby.currentQuestion) {
          return callback?.({ success: false, error: 'Нет активного вопроса' });
        }

        io.to(lobbyId).emit('revealAnswer', {
          correctAnswer: lobby.currentQuestion.correctAnswer,
          correctAnswerIndex: lobby.currentQuestion.correctAnswerIndex
        });
        callback?.({ success: true });
      } catch (error) {
        console.error('Error revealing answer:', error);
        callback?.({ success: false, error: 'Failed to reveal answer' });
      }
    });

    socket.on('adjustScore', ({ lobbyId, targetPlayerId, delta }, callback) => {
      try {
        const lobby = lobbyManager.getLobby(lobbyId);
        if (!lobby || lobby.hostId !== socket.id) {
          return callback?.({ success: false, error: 'Not authorized' });
        }
        const player = lobby.players.get(targetPlayerId);
        if (!player) {
          return callback?.({ success: false, error: 'Игрок не найден' });
        }

        const deltaNum = Number(delta) || 0;
        player.score = (player.score || 0) + deltaNum;

        io.to(lobbyId).emit('scoreUpdate', { playerId: targetPlayerId, score: player.score, delta: deltaNum });

        const stats = lobbyManager.buildLiveStats(lobby);
        io.to(lobbyId).emit('liveStats', stats);

        callback?.({ success: true, score: player.score });
      } catch (error) {
        console.error('Error adjusting score:', error);
        callback?.({ success: false, error: 'Failed to adjust score' });
      }
    });

    socket.on('chatMessage', ({ lobbyId, message }, callback) => {
      try {
        const lobby = lobbyManager.getLobby(lobbyId);
        if (!lobby) {
          return callback?.({ success: false, error: 'Лобби не найдено' });
        }

        const trimmed = String(message || '').trim();
        if (!trimmed) {
          return callback?.({ success: false, error: 'Пустое сообщение' });
        }
        const sender = lobby.players.get(socket.id);
        const payload = {
          playerId: socket.id,
          playerName: sender?.name || 'Участник',
          message: trimmed,
          timestamp: Date.now(),
          isHost: socket.id === lobby.hostId
        };

        io.to(lobbyId).emit('chatMessage', payload);
        callback?.({ success: true });
      } catch (error) {
        console.error('Error sending chat message:', error);
        callback?.({ success: false, error: 'Failed to send message' });
      }
    });

    socket.on('requestLobbyReport', ({ lobbyId }, callback) => {
      try {
        const lobby = lobbyManager.getLobby(lobbyId);
        if (!lobby) {
          return callback({ success: false, error: 'Лобби не найдено' });
        }
        if (lobby.hostId !== socket.id) {
          return callback({ success: false, error: 'Только хост может выгружать отчёт' });
        }

        const report = lobbyManager.buildReport(lobby);
        callback({ success: true, report });
      } catch (error) {
        console.error('Error building lobby report:', error);
        callback({ success: false, error: 'Не удалось сформировать отчёт' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);

      const result = lobbyManager.leaveLobby(socket.id);
      if (result) {
        const { lobbyId, playerLeft, wasHost, closed } = result;

        if (closed) {
          io.to(lobbyId).emit('lobbyClosed');
        } else if (wasHost) {
          io.to(lobbyId).emit('hostLeft', { newHostId: lobbyManager.getLobby(lobbyId)?.hostId });
        } else if (playerLeft) {
          io.to(lobbyId).emit('playerLeft', { playerId: socket.id });
        }

        socket.leave(lobbyId);
      }
    });
  });

  return io;
}

module.exports = { setupWebSocket, LobbyManager };
