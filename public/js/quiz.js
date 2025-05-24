// Establish Socket.io connection
const socket = io();

// DOM elements
const loginSection = document.getElementById('login-section');
const userInfoSection = document.getElementById('user-info');
const usernameInput = document.getElementById('username');
const joinBtn = document.getElementById('join-btn');
const joinError = document.getElementById('join-error');
const currentUserSpan = document.getElementById('current-user');
const logoutBtn = document.getElementById('logout-btn');
const userListEl = document.getElementById('user-list');
const statusMessage = document.getElementById('status-message');

const gameWaiting = document.getElementById('game-waiting');
const challengeNotification = document.getElementById('challenge-notification');
const challengerNameSpan = document.getElementById('challenger-name');
const acceptBtn = document.getElementById('accept-btn');
const rejectBtn = document.getElementById('reject-btn');

const gameUI = document.getElementById('game-ui');
const questionNumberSpan = document.getElementById('question-number');
const totalQuestionsSpan = document.getElementById('total-questions');
const timerSpan = document.getElementById('timer');
const opponentNameSpan = document.getElementById('opponent-name');
const yourScoreSpan = document.getElementById('your-score');
const opponentScoreSpan = document.getElementById('opponent-score');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const answerFeedback = document.getElementById('answer-feedback');

const gameResult = document.getElementById('game-result');
const finalYourScore = document.getElementById('final-your-score');
const finalOpponentScore = document.getElementById('final-opponent-score');
const winnerDisplay = document.getElementById('winner-display');
const newGameBtn = document.getElementById('new-game-btn');

// Game status
let currentUser = null;
let currentGameId = null;
let currentChallenger = null;
let timerInterval = null;
let timeLeft = 15;
let hasTimedOut = false; // Add flag to judge if timeout already

// Event listen
joinBtn.addEventListener('click', joinGame);
logoutBtn.addEventListener('click', logoutGame);
acceptBtn.addEventListener('click', acceptChallenge);
rejectBtn.addEventListener('click', rejectChallenge);
newGameBtn.addEventListener('click', resetGameUI);

// Join game
function joinGame() {
  const username = usernameInput.value.trim();
  
  if (username === '') {
    showJoinError('Username cannot be empty');
    return;
  }
  
  socket.emit('userJoin', username);
}

// Logout game
function logoutGame() {
  // Refresh page to simulate logout
  window.location.reload();
}

// Show join error
function showJoinError(message) {
  joinError.textContent = message;
  joinError.classList.remove('d-none');
}

// Handle join game success
function handleJoinSuccess(username) {
  currentUser = username;
  currentUserSpan.textContent = username;
  
  // Show user info, hide login
  loginSection.classList.add('d-none');
  userInfoSection.classList.remove('d-none');
  
  joinError.classList.add('d-none');
}

// Update user list
function updateUserList(users) {
  if (!users || users.length <= 1) {
    userListEl.innerHTML = '<li class="list-group-item text-center text-muted">No other player online</li>';
    return;
  }
  
  userListEl.innerHTML = '';
  
  users.forEach(user => {
    if (user.username !== currentUser) {
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-center';
      
      if (user.status === 'busy') {
        li.classList.add('text-muted');
        li.innerHTML = `
          ${user.username}
          <span class="badge bg-secondary">In Game</span>
        `;
      } else {
        li.innerHTML = `
          ${user.username}
          <button class="btn btn-sm btn-outline-primary challenge-btn" data-id="${user.id}">Challenge</button>
        `;
      }
      
      userListEl.appendChild(li);
    }
  });
  
  // Add challenge button event listen
  document.querySelectorAll('.challenge-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-id');
      challengeUser(targetId);
    });
  });
}

// Challenge user
function challengeUser(targetId) {
  socket.emit('sendChallenge', targetId);
  statusMessage.textContent = 'Challenge sent, waiting for opponent accept...';
  statusMessage.className = 'alert alert-warning';
}

// Show challenge notice
function showChallengeNotification(challenger) {
  currentChallenger = challenger;
  challengerNameSpan.textContent = challenger.username;
  challengeNotification.classList.remove('d-none');
}

// Accept challenge
function acceptChallenge() {
  if (!currentChallenger) return;
  
  socket.emit('acceptChallenge', currentChallenger.id);
  challengeNotification.classList.add('d-none');
}

// Reject challenge
function rejectChallenge() {
  if (!currentChallenger) return;
  
  socket.emit('rejectChallenge', currentChallenger.id);
  challengeNotification.classList.add('d-none');
  currentChallenger = null;
}

// Start game
function startGame(data) {
  currentGameId = data.gameId;
  
  // Update UI
  gameWaiting.classList.add('d-none');
  gameUI.classList.remove('d-none');
  gameResult.classList.add('d-none');
  
  opponentNameSpan.textContent = data.opponent;
  totalQuestionsSpan.textContent = data.questionCount;
  yourScoreSpan.textContent = '0';
  opponentScoreSpan.textContent = '0';
  
  // Update status message
  statusMessage.textContent = `Game playing, opponent: ${data.opponent}`;
  statusMessage.className = 'alert alert-success';
}

// Show new question
function showQuestion(data) {
  clearInterval(timerInterval);
  hasTimedOut = false; // Reset timeout flag
  
  questionNumberSpan.textContent = data.questionNumber;
  questionText.textContent = data.question;
  
  // Create option buttons
  optionsContainer.innerHTML = '';
  data.options.forEach((option, index) => {
    const button = document.createElement('button');
    button.className = 'btn btn-outline-primary option-btn';
    button.textContent = option;
    button.setAttribute('data-index', index);
    button.addEventListener('click', () => {
      submitAnswer(index);
      disableAllOptions();
    });
    optionsContainer.appendChild(button);
  });
  
  // Hide answer feedback
  answerFeedback.classList.add('d-none');
  
  // Start countdown
  startTimer();
}

// Disable all options
function disableAllOptions() {
  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.disabled = true;
    btn.classList.add('disabled');
  });
}

// Start countdown
function startTimer() {
  timeLeft = 15;
  updateTimerDisplay();
  
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    
    if (timeLeft <= 0) {
      // Do not immediately stop the timer, just disable options and show feedback
      disableAllOptions();
      showAnswerFeedback(false, 'Time up! ');
      
      // Mark as timed out and send timed out information
      if (!hasTimedOut) {
        hasTimedOut = true;
        socket.emit('submitAnswer', {
          gameId: currentGameId,
          answerIndex: -1, // -1 means timed out without answering
          timeout: true
        });
      }
      
      // Set timer to 0 and keep it at 0
      timeLeft = 0;
      updateTimerDisplay();
    }
  }, 1000);
}

// Update timer display
function updateTimerDisplay() {
  // Display both Chinese and English countdown
  timerSpan.textContent = `${timeLeft}s (${timeLeft} seconds left)`;
  
  // Change color based on remaining time
  if (timeLeft <= 5) {
    timerSpan.className = 'badge bg-danger';
  } else if (timeLeft <= 10) {
    timerSpan.className = 'badge bg-warning';
  } else {
    timerSpan.className = 'badge bg-primary';
  }
}

// Submit answer
function submitAnswer(answerIndex) {
  // Do not clear the timer, let it continue running
  // clearInterval(timerInterval);
  
  // Disable options but keep countdown running
  disableAllOptions();
  
  socket.emit('submitAnswer', {
    gameId: currentGameId,
    answerIndex: answerIndex
  });
}

// Show answer feedback
function showAnswerFeedback(correct, message) {
  // Add English hint
  let feedback = '';
  if (message) {
    feedback = message;
  } else if (correct) {
    feedback = 'Correct answer! (答对了!)';
  } else {
    feedback = 'Wrong answer! (答错了!)';
  }
  
  answerFeedback.textContent = feedback;
  answerFeedback.className = `alert mt-3 ${correct ? 'alert-success' : 'alert-danger'}`;
  answerFeedback.classList.remove('d-none');
  
  // Do not operate the timer, let it continue running until server decides next step
}

// Update score
function updateScore(data) {
  yourScoreSpan.textContent = data.yourScore;
  opponentScoreSpan.textContent = data.opponentScore;
}

// Show game result
function showGameResult(data) {
  // Stop the timer
  clearInterval(timerInterval);
  
  // Hide game interface, show result
  gameUI.classList.add('d-none');
  gameResult.classList.remove('d-none');
  
  // Update final scores
  finalYourScore.textContent = data.yourScore;
  finalOpponentScore.textContent = data.opponentScore;
  
  // Show winner, add English hint
  if (data.winner) {
    if (data.winner === currentUser) {
      winnerDisplay.textContent = 'Congratulations, you win! (恭喜获胜!)';
      winnerDisplay.className = 'alert alert-success my-3';
    } else {
      winnerDisplay.textContent = `${data.winner} wins! (${data.winner} 获胜!)`;
      winnerDisplay.className = 'alert alert-warning my-3';
    }
  } else {
    winnerDisplay.textContent = 'It\'s a tie! (平局!)';
    winnerDisplay.className = 'alert alert-info my-3';
  }
  
  // Update status
  statusMessage.textContent = 'Game Over (游戏结束)';
  statusMessage.className = 'alert alert-info';
}

// Handle opponent left
function handleOpponentLeft() {
  clearInterval(timerInterval);
  
  // If in game, show interruption information
  if (currentGameId) {
    showAnswerFeedback(false, 'Opponent left the game! (对手离开了游戏!)');
    setTimeout(() => {
      resetGameUI();
    }, 2000);
  }
}

// Reset game interface
function resetGameUI() {
  // Ensure to clear the timer
  clearInterval(timerInterval);
  
  gameResult.classList.add('d-none');
  gameWaiting.classList.remove('d-none');
  
  statusMessage.textContent = 'Waiting for challenge or select a player to challenge (等待挑战或选择玩家挑战)';
  statusMessage.className = 'alert alert-info';
  
  currentGameId = null;
  hasTimedOut = false;
}

// Socket event listen
socket.on('joinError', (message) => {
  showJoinError(message);
});

socket.on('updateUserList', (users) => {
  if (currentUser) {
    updateUserList(users);
  } else if (users.find(user => user.id === socket.id)) {
    // If user in list but currentUser not set, means just joined successfully
    const user = users.find(user => user.id === socket.id);
    handleJoinSuccess(user.username);
    updateUserList(users);
  }
});

socket.on('challengeReceived', (challenger) => {
  showChallengeNotification(challenger);
});

socket.on('challengeRejected', (username) => {
  statusMessage.textContent = `${username} rejected your challenge (${username} 拒绝了您的挑战)`;
  statusMessage.className = 'alert alert-danger';
});

socket.on('gameStart', (data) => {
  startGame(data);
});

socket.on('newQuestion', (data) => {
  // Ensure to clear timer before new question starts
  clearInterval(timerInterval);
  showQuestion(data);
});

socket.on('answerResult', (data) => {
  showAnswerFeedback(data.correct);
  yourScoreSpan.textContent = data.score;
});

socket.on('updateScore', (data) => {
  // When updating scores, means question answered, should stop timer
  clearInterval(timerInterval);
  updateScore(data);
});

socket.on('gameEnd', (data) => {
  showGameResult(data);
});

socket.on('opponentLeft', () => {
  handleOpponentLeft();
});

// When user successfully connects
socket.on('connect', () => {
  console.log('Connected to server');
});

// Handle server disconnect
socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

// When username input changes, clear error hint
usernameInput.addEventListener('input', () => {
  joinError.classList.add('d-none');
});

// Username input box Enter key triggers join
usernameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    joinGame();
  }
}); 