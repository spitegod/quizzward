import { io } from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.callbacks = {
      onLobbyUpdate: null,
      onPlayerJoined: null,
      onPlayerLeft: null,
      onHostLeft: null,
      onGameStarting: null,
      onQuestion: null,
      onAnswerResult: null,
      onGameOver: null,
      onLobbyClosed: null,
      onNextQuestionCountdown: null,
      onLiveStats: null,
      onGamePaused: null,
      onGameResumed: null,
      onRevealAnswer: null,
      onChatMessage: null,
      onScoreUpdate: null,
      onKicked: null,
      onError: null,
      onLobbyJoined: null,      // New callback for successful lobby join
      onLobbyError: null,       // New callback for lobby errors
      onConnectionError: null,  // New callback for connection errors
    };
    
    // Bind all methods to maintain 'this' context
    this.handleLobbyUpdate = this.handleLobbyUpdate.bind(this);
    this.handlePlayerJoined = this.handlePlayerJoined.bind(this);
    this.handlePlayerLeft = this.handlePlayerLeft.bind(this);
    this.handleHostLeft = this.handleHostLeft.bind(this);
    this.handleGameStarting = this.handleGameStarting.bind(this);
    this.handleQuestion = this.handleQuestion.bind(this);
    this.handleAnswerResult = this.handleAnswerResult.bind(this);
    this.handleGameOver = this.handleGameOver.bind(this);
    this.handleLobbyClosed = this.handleLobbyClosed.bind(this);
    this.handleNextQuestionCountdown = this.handleNextQuestionCountdown.bind(this);
    this.handleLiveStats = this.handleLiveStats.bind(this);
    this.handleGamePaused = this.handleGamePaused.bind(this);
    this.handleGameResumed = this.handleGameResumed.bind(this);
    this.handleRevealAnswer = this.handleRevealAnswer.bind(this);
    this.handleChatMessage = this.handleChatMessage.bind(this);
    this.handleScoreUpdate = this.handleScoreUpdate.bind(this);
    this.handleKicked = this.handleKicked.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleLobbyJoined = this.handleLobbyJoined.bind(this);
    this.handleLobbyError = this.handleLobbyError.bind(this);
  }

  connect() {
    return new Promise((resolve, reject) => {
      if (this.socket && this.socket.connected) {
        resolve();
        return;
      }

      if (this.socket && !this.socket.connected) {
        this.socket.connect();
        const connectHandler = () => {
          this.socket.off('connect', connectHandler);
          this.socket.off('connect_error', errorHandler);
          resolve();
        };
        const errorHandler = (error) => {
          this.socket.off('connect', connectHandler);
          this.socket.off('connect_error', errorHandler);
          reject(error);
        };
        this.socket.once('connect', connectHandler);
        this.socket.once('connect_error', errorHandler);
        return;
      }

      this.socket = io('http://localhost:4000', {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000
      });

      this.socket.on('connect', () => {
        console.log('WebSocket connected:', this.socket.id);
      });

      this.socket.on('lobbyUpdate', this.handleLobbyUpdate);
      this.socket.on('playerJoined', this.handlePlayerJoined);
      this.socket.on('playerLeft', this.handlePlayerLeft);
      this.socket.on('hostLeft', this.handleHostLeft);
      this.socket.on('gameStarting', this.handleGameStarting);
      this.socket.on('question', this.handleQuestion);
      this.socket.on('answerResult', this.handleAnswerResult);
      this.socket.on('gameOver', this.handleGameOver);
      this.socket.on('lobbyClosed', this.handleLobbyClosed);
      this.socket.on('nextQuestionCountdown', this.handleNextQuestionCountdown);
      this.socket.on('liveStats', this.handleLiveStats);
      this.socket.on('gamePaused', this.handleGamePaused);
      this.socket.on('gameResumed', this.handleGameResumed);
      this.socket.on('revealAnswer', this.handleRevealAnswer);
      this.socket.on('chatMessage', this.handleChatMessage);
      this.socket.on('scoreUpdate', this.handleScoreUpdate);
      this.socket.on('kicked', this.handleKicked);
      this.socket.on('lobbyJoined', this.handleLobbyJoined);
      this.socket.on('lobbyError', this.handleLobbyError);
      this.socket.on('connect_error', this.handleConnectionError);
      this.socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        if (reason === 'io server disconnect') {
          this.socket.connect();
        }
      });

      const connectHandler = () => {
        this.socket.off('connect', connectHandler);
        this.socket.off('connect_error', errorHandler);
        resolve();
      };

      const errorHandler = (error) => {
        this.socket.off('connect', connectHandler);
        this.socket.off('connect_error', errorHandler);
        reject(error);
      };

      this.socket.once('connect', connectHandler);
      this.socket.once('connect_error', errorHandler);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Event handlers that will call the registered callbacks
  handleLobbyUpdate(data) {
    if (this.callbacks && this.callbacks.onLobbyUpdate) this.callbacks.onLobbyUpdate(data);
  }

  handlePlayerJoined(data) {
    if (this.callbacks && this.callbacks.onPlayerJoined) this.callbacks.onPlayerJoined(data);
  }

  handlePlayerLeft(data) {
    if (this.callbacks && this.callbacks.onPlayerLeft) this.callbacks.onPlayerLeft(data);
  }

  handleHostLeft(data) {
    if (this.callbacks && this.callbacks.onHostLeft) this.callbacks.onHostLeft(data);
  }

  handleGameStarting(data) {
    if (this.callbacks && this.callbacks.onGameStarting) this.callbacks.onGameStarting(data);
  }

  handleQuestion(data) {
    if (this.callbacks && this.callbacks.onQuestion) this.callbacks.onQuestion(data);
  }

  handleAnswerResult(data) {
    if (this.callbacks && this.callbacks.onAnswerResult) this.callbacks.onAnswerResult(data);
  }

  handleGameOver(data) {
    if (this.callbacks && this.callbacks.onGameOver) this.callbacks.onGameOver(data);
  }

  handleLobbyClosed() {
    if (this.callbacks && this.callbacks.onLobbyClosed) this.callbacks.onLobbyClosed();
  }

  handleNextQuestionCountdown(data) {
    if (this.callbacks && this.callbacks.onNextQuestionCountdown) this.callbacks.onNextQuestionCountdown(data);
  }

  handleLiveStats(data) {
    if (this.callbacks && this.callbacks.onLiveStats) this.callbacks.onLiveStats(data);
  }

  handleGamePaused(data) {
    if (this.callbacks && this.callbacks.onGamePaused) this.callbacks.onGamePaused(data);
  }

  handleGameResumed(data) {
    if (this.callbacks && this.callbacks.onGameResumed) this.callbacks.onGameResumed(data);
  }

  handleRevealAnswer(data) {
    if (this.callbacks && this.callbacks.onRevealAnswer) this.callbacks.onRevealAnswer(data);
  }

  handleChatMessage(data) {
    if (this.callbacks && this.callbacks.onChatMessage) this.callbacks.onChatMessage(data);
  }

  handleScoreUpdate(data) {
    if (this.callbacks && this.callbacks.onScoreUpdate) this.callbacks.onScoreUpdate(data);
  }

  handleKicked(data) {
    if (this.callbacks && this.callbacks.onKicked) this.callbacks.onKicked(data);
  }

  handleLobbyJoined(data) {
    if (this.callbacks && this.callbacks.onLobbyJoined) {
      this.callbacks.onLobbyJoined(data);
    }
  }

  handleLobbyError(error) {
    console.error('Lobby error:', error);
    if (this.callbacks && this.callbacks.onLobbyError) {
      this.callbacks.onLobbyError(error);
    } else if (this.callbacks && this.callbacks.onError) {
      this.callbacks.onError(error);
    }
  }

  handleConnectionError(error) {
    console.error('WebSocket connection error:', error);
    if (this.callbacks && this.callbacks.onConnectionError) {
      this.callbacks.onConnectionError(error);
    } else if (this.callbacks && this.callbacks.onError) {
      this.callbacks.onError(error);
    }
  }

  handleError(error) {
    console.error('WebSocket error:', error);
    if (this.callbacks && this.callbacks.onError) this.callbacks.onError(error);
  }

  /**
   * Register a callback for WebSocket events
   * @param {string} event - The event name to listen for
   * @param {Function} callback - The callback function to execute
   * @returns {WebSocketService} Returns the WebSocketService instance for chaining
   */
  on(event, callback) {
    const eventMap = {
      // Lobby events
      'lobbyUpdate': 'onLobbyUpdate',
      'lobbyJoined': 'onLobbyJoined',
      'lobbyError': 'onLobbyError',
      'lobbyClosed': 'onLobbyClosed',
      
      // Player events
      'playerJoined': 'onPlayerJoined',
      'playerLeft': 'onPlayerLeft',
      'hostLeft': 'onHostLeft',
      
      // Game events
      'gameStarting': 'onGameStarting',
      'question': 'onQuestion',
      'answerResult': 'onAnswerResult',
      'gameOver': 'onGameOver',
      'nextQuestionCountdown': 'onNextQuestionCountdown',
      'liveStats': 'onLiveStats',
      'gamePaused': 'onGamePaused',
      'gameResumed': 'onGameResumed',
      'revealAnswer': 'onRevealAnswer',
      'chatMessage': 'onChatMessage',
      'scoreUpdate': 'onScoreUpdate',
      'kicked': 'onKicked',
      
      // Connection events
      'error': 'onError',
      'connectionError': 'onConnectionError'
    };
    
    if (event in eventMap) {
      this.callbacks[eventMap[event]] = callback;
    } else {
      console.warn(`Invalid event name: ${event}. Valid events are: ${Object.keys(eventMap).join(', ')}`);
    }
    
    return this; // For method chaining
  }
  
  /**
   * Check if the socket is connected
   * @returns {boolean} True if connected, false otherwise
   */
  isConnected() {
    return this.socket && this.socket.connected;
  }

  /**
   * Create a new game lobby
   * @param {string} quizId - The ID of the quiz to play
   * @param {object} options - Lobby options
   * @param {number} options.maxPlayers - Maximum number of players
   * @param {string} options.userName - The name of the host
   * @param {number} [options.timePerQuestion=30] - Time per question in seconds
   * @param {number} [options.questionsCount=10] - Number of questions to include
   * @returns {Promise<object>} The created lobby data
   */
  createLobby(quizId, { maxPlayers, userName, timePerQuestion = 30, questionsCount = 10 }) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('Not connected to WebSocket server'));
        return;
      }

      this.socket.emit('createLobby', 
        { 
          quizId, 
          maxPlayers: Math.max(2, Math.min(20, maxPlayers)),
          userName: userName.trim(),
          settings: {
            timePerQuestion: Math.max(10, Math.min(120, timePerQuestion)),
            questionsCount: Math.max(1, Math.min(50, questionsCount))
          }
        },
        (response) => {
          if (response && response.success) {
            resolve(response.lobby);
          } else {
            reject(new Error(response?.error || 'Failed to create lobby'));
          }
        }
      );
    });
  }

  /**
   * Join an existing lobby
   * @param {string} lobbyCode - The lobby code to join
   * @param {string|object} options - Either the player's name or an options object
   * @param {string} [options.userName] - The name of the player joining
   * @param {string} [options.quizId] - Optional quiz ID if needed
   * @returns {Promise<object>} The lobby data
   */
  joinLobby(lobbyCode, options) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        // Try to reconnect if not connected
        this.connect().then(() => {
          // Retry joining after reconnection
          this.joinLobby(lobbyCode, options).then(resolve).catch(reject);
        }).catch(() => {
          reject(new Error('Не удалось подключиться к серверу'));
        });
        return;
      }

      // Handle both parameter formats
      const userName = typeof options === 'string' 
        ? options 
        : (options && typeof options === 'object' ? options.userName : '');
      
      const trimmedName = userName ? String(userName).trim() : '';
      if (!trimmedName) {
        reject(new Error('Пожалуйста, укажите ваше имя'));
        return;
      }

      // Normalize lobby code (uppercase, alphanumeric, max 6 chars)
      const normalizedCode = lobbyCode 
        ? String(lobbyCode).trim().toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6)
        : '';
      
      if (!normalizedCode) {
        reject(new Error('Неверный код лобби'));
        return;
      }

      console.log(`Joining lobby ${normalizedCode} as ${trimmedName}`);
      
      const joinData = {
        lobbyCode: normalizedCode, // Using lobbyCode field
        userName: trimmedName
      };

      // Add quizId if provided in options object
      if (typeof options === 'object' && options.quizId) {
        joinData.quizId = options.quizId;
      }

      // Set a timeout for the join request
      const joinTimeout = setTimeout(() => {
        reject(new Error('Время ожидания истекло. Пожалуйста, попробуйте снова.'));
      }, 10000); // 10 seconds timeout

      this.socket.emit('joinLobby', joinData, (response) => {
        clearTimeout(joinTimeout); // Clear the timeout
        
        if (response && response.success) {
          console.log(`Successfully joined lobby ${normalizedCode}`);
          resolve(response.lobby);
        } else {
          const errorMessage = response?.error || 'Не удалось присоединиться к лобби';
          console.error(`Failed to join lobby ${normalizedCode}:`, errorMessage);
          reject(new Error(errorMessage));
        }
      });
    });
  }

  /**
   * Get lobby information by code
   * @param {string} lobbyCode - The lobby code to check
   * @returns {Promise<object>} Lobby information
   */
  getLobbyInfo(lobbyCode) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('Not connected to WebSocket server'));
        return;
      }

      const normalizedCode = lobbyCode.trim().toUpperCase();
      
      this.socket.emit('getLobbyInfo', 
        { lobbyCode: normalizedCode },
        (response) => {
          if (response && response.success) {
            resolve(response.lobby);
          } else {
            reject(new Error(response?.error || 'Lobby not found'));
          }
        }
      );
    });
  }

  /**
   * Start the game in a lobby (host only)
   * @param {string} lobbyId - The ID of the lobby to start
   * @param {Array} questions - Array of question objects
   * @returns {Promise<void>}
   */
  startGame(lobbyId, questions) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('Not connected to WebSocket server'));
        return;
      }

      if (!questions || questions.length === 0) {
        reject(new Error('No questions provided'));
        return;
      }

      console.log(`Starting game in lobby ${lobbyId} with ${questions.length} questions`);

      this.socket.emit('startGame',
        { lobbyId, questions },
        (response) => {
          if (response && response.success) {
            resolve();
          } else {
            reject(new Error(response?.error || 'Failed to start the game'));
          }
        }
      );
    });
  }

  /**
   * Submit an answer to the current question
   * @param {string} lobbyId - The ID of the lobby
   * @param {string} questionId - The ID of the question being answered
   * @param {string|number} answer - The answer provided by the player
   * @returns {Promise<boolean>} True if the answer was submitted successfully
   */
  submitAnswer(lobbyId, questionId, answer) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('Not connected to WebSocket server'));
        return;
      }

      const payloadAnswer = typeof answer === 'number'
        ? answer
        : (typeof answer === 'string' ? answer.trim() : answer);

      this.socket.emit(
        'submitAnswer',
        { 
          lobbyId, 
          questionId,
          answer: payloadAnswer
        },
        (response) => {
          if (response && response.success) {
            resolve(true);
          } else {
            reject(new Error(response?.error || 'Failed to submit answer'));
          }
        }
      );
    });
  }

  /**
   * Request the next question (host only)
   * @param {string} lobbyId - The ID of the lobby
   * @returns {Promise<object>} The next question data
   */
  nextQuestion(lobbyId) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('Not connected to WebSocket server'));
        return;
      }

      this.socket.emit(
        'nextQuestion',
        { lobbyId },
        (response) => {
          if (response && response.success) {
            resolve(response.question);
          } else {
            reject(new Error(response?.error || 'Failed to get next question'));
          }
        }
      );
    });
  }

  /**
   * Leave the current lobby
   * @returns {Promise<void>}
   */
  leaveLobby() {
    return new Promise((resolve) => {
      if (!this.isConnected()) {
        resolve();
        return;
      }

      this.socket.emit('leaveLobby', {}, () => {
        resolve();
      });
    });
  }

  /**
   * Send a chat message to the lobby
   * @param {string} lobbyId - The ID of the lobby
   * @param {string} message - The message to send
   * @returns {Promise<boolean>} True if the message was sent successfully
   */
  sendChatMessage(lobbyId, message) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('Not connected to WebSocket server'));
        return;
      }

      const trimmedMsg = String(message).trim();
      if (!trimmedMsg) {
        reject(new Error('Message cannot be empty'));
        return;
      }

      this.socket.emit(
        'chatMessage',
        { lobbyId, message: trimmedMsg },
        (response) => {
          if (response && response.success) {
            resolve(true);
          } else {
            reject(new Error(response?.error || 'Failed to send message'));
          }
        }
      );
    });
  }

  /**
   * Update lobby settings (host only)
   * @param {string} lobbyId - The ID of the lobby
   * @param {object} settings - The settings to update
   * @param {number} [settings.timePerQuestion] - Time per question in seconds
   * @param {number} [settings.questionsCount] - Number of questions
   * @param {number} [settings.maxPlayers] - Maximum number of players
   * @returns {Promise<object>} Updated lobby data
   */
  updateLobbySettings(lobbyId, settings) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('Not connected to WebSocket server'));
        return;
      }

      // Validate and sanitize settings
      const sanitizedSettings = {};
      if (settings.timePerQuestion !== undefined) {
        sanitizedSettings.timePerQuestion = Math.max(10, Math.min(120, parseInt(settings.timePerQuestion, 10) || 30));
      }
      if (settings.questionsCount !== undefined) {
        sanitizedSettings.questionsCount = Math.max(1, Math.min(50, parseInt(settings.questionsCount, 10) || 10));
      }
      if (settings.maxPlayers !== undefined) {
        sanitizedSettings.maxPlayers = Math.max(2, Math.min(20, parseInt(settings.maxPlayers, 10) || 4));
      }

      if (Object.keys(sanitizedSettings).length === 0) {
        reject(new Error('No valid settings provided'));
        return;
      }

      this.socket.emit(
        'updateLobbySettings',
        { lobbyId, ...sanitizedSettings },
        (response) => {
          if (response && response.success) {
            resolve(response.lobby);
          } else {
            reject(new Error(response?.error || 'Failed to update lobby settings'));
          }
        }
      );
    });
  }

  /**
   * Request lobby report (host only)
   * @param {string} lobbyId
   * @returns {Promise<object>} report with stats and raw answers
   */
  requestLobbyReport(lobbyId) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('Not connected to WebSocket server'));
        return;
      }

      this.socket.emit('requestLobbyReport', { lobbyId }, (response) => {
        if (response && response.success) {
          resolve(response.report);
        } else {
          reject(new Error(response?.error || 'Не удалось сформировать отчёт'));
        }
      });
    });
  }

  pauseGame(lobbyId) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('Not connected to WebSocket server'));
        return;
      }

      this.socket.emit('pauseGame', { lobbyId }, (response) => {
        if (response && response.success) {
          resolve(response);
        } else {
          reject(new Error(response?.error || 'Не удалось поставить на паузу'));
        }
      });
    });
  }

  resumeGame(lobbyId) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('Not connected to WebSocket server'));
        return;
      }

      this.socket.emit('resumeGame', { lobbyId }, (response) => {
        if (response && response.success) {
          resolve(response);
        } else {
          reject(new Error(response?.error || 'Не удалось возобновить игру'));
        }
      });
    });
  }

  stopGame(lobbyId) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('Not connected to WebSocket server'));
        return;
      }

      this.socket.emit('stopGame', { lobbyId }, (response) => {
        if (response && response.success) {
          resolve(response);
        } else {
          reject(new Error(response?.error || 'Не удалось остановить игру'));
        }
      });
    });
  }

  revealAnswer(lobbyId) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('Not connected to WebSocket server'));
        return;
      }

      this.socket.emit('revealAnswer', { lobbyId }, (response) => {
        if (response && response.success) {
          resolve(response);
        } else {
          reject(new Error(response?.error || 'Не удалось показать ответ'));
        }
      });
    });
  }

  adjustScore(lobbyId, targetPlayerId, delta) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('Not connected to WebSocket server'));
        return;
      }

      this.socket.emit('adjustScore', { lobbyId, targetPlayerId, delta }, (response) => {
        if (response && response.success) {
          resolve(response);
        } else {
          reject(new Error(response?.error || 'Не удалось обновить счёт'));
        }
      });
    });
  }

  kickPlayer(lobbyId, targetPlayerId) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('Not connected to WebSocket server'));
        return;
      }

      this.socket.emit('kickPlayer', { lobbyId, targetPlayerId }, (response) => {
        if (response && response.success) {
          resolve(response);
        } else {
          reject(new Error(response?.error || 'Не удалось кикнуть игрока'));
        }
      });
    });
  }

}

// Export a singleton instance
export default new WebSocketService();
