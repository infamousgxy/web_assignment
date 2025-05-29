// establish socket.io connection to server
const socket = io();

// dom elements get from page
const loginSection_el = document.getElementById('login-section');
const userInfoSection_el = document.getElementById('user-info');
const usernameInput_el = document.getElementById('username');
const joinBtn_el = document.getElementById('join-btn');
const joinError_el = document.getElementById('join-error');
const currentUserSpan_el = document.getElementById('current-user');
const logoutBtn_el = document.getElementById('logout-btn');
const userListEl_main = document.getElementById('user-list');
const statusMessage_el = document.getElementById('status-message');

const gameWaiting_section = document.getElementById('game-waiting');
const challengeNotification_el = document.getElementById('challenge-notification');
const challengerNameSpan_el = document.getElementById('challenger-name');
const acceptBtn_el = document.getElementById('accept-btn');
const rejectBtn_el = document.getElementById('reject-btn');

const gameUI_section = document.getElementById('game-ui');
const questionNumberSpan_el = document.getElementById('question-number');
const totalQuestionsSpan_el = document.getElementById('total-questions');
const timerSpan_el = document.getElementById('timer');
const opponentNameSpan_el = document.getElementById('opponent-name');
const yourScoreSpan_el = document.getElementById('your-score');
const opponentScoreSpan_el = document.getElementById('opponent-score');
const questionText_el = document.getElementById('question-text');
const optionsContainer_el = document.getElementById('options-container');
const answerFeedback_el = document.getElementById('answer-feedback');

const gameResult_section = document.getElementById('game-result');
const finalYourScore_el = document.getElementById('final-your-score');
const finalOpponentScore_el = document.getElementById('final-opponent-score');
const winnerDisplay_el = document.getElementById('winner-display');
const newGameBtn_el = document.getElementById('new-game-btn');

// game status variables define
let currentUser_name = null;
let currentGameId_str = null;
let currentChallenger_obj = null;
let timerInterval_var = null;
let timeLeft_count = 15;
let hasTimedOut_flag = false; // add flag to judge if timeout already happen

// event listen setup
joinBtn_el.addEventListener('click', joinGame_func);
logoutBtn_el.addEventListener('click', logoutGame_func);
acceptBtn_el.addEventListener('click', acceptChallenge_func);
rejectBtn_el.addEventListener('click', rejectChallenge_func);
newGameBtn_el.addEventListener('click', resetGameUI_func);

// join game function implement
function joinGame_func() {
  const username_input = usernameInput_el.value.trim();
  
  if (username_input === '') {
    showJoinError_func('Username cannot be empty');
    return;
  }
  
  socket.emit('userJoin', username_input);
}

// logout game function implement
function logoutGame_func() {
  // refresh page to simulate logout process
  window.location.reload();
}

// show join error message function
function showJoinError_func(message) {
  joinError_el.textContent = message;
  joinError_el.classList.remove('d-none');
}

// handle join game success process
function handleJoinSuccess_func(username) {
  currentUser_name = username;
  currentUserSpan_el.textContent = username;
  
  // show user info, hide login section
  loginSection_el.classList.add('d-none');
  userInfoSection_el.classList.remove('d-none');
  
  joinError_el.classList.add('d-none');
}

// update user list function implement
function updateUserList_func(users) {
  if (!users || users.length <= 1) {
    userListEl_main.innerHTML = '<li class="list-group-item text-center text-muted">No other player online</li>';
    return;
  }
  
  userListEl_main.innerHTML = '';
  
  users.forEach(user => {
    if (user.username !== currentUser_name) {
      const li_element = document.createElement('li');
      li_element.className = 'list-group-item d-flex justify-content-between align-items-center';
      
      if (user.status === 'busy') {
        li_element.classList.add('text-muted');
        li_element.innerHTML = `
          ${user.username}
          <span class="badge bg-secondary">In Game</span>
        `;
      } else {
        li_element.innerHTML = `
          ${user.username}
          <button class="btn btn-sm btn-outline-primary challenge-btn" data-id="${user.id}">Challenge</button>
        `;
      }
      
      userListEl_main.appendChild(li_element);
    }
  });
  
  // add challenge button event listen setup
  document.querySelectorAll('.challenge-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId_get = btn.getAttribute('data-id');
      challengeUser_func(targetId_get);
    });
  });
}

// challenge user function implement
function challengeUser_func(targetId) {
  socket.emit('sendChallenge', targetId);
  statusMessage_el.textContent = 'Challenge sent, waiting for opponent accept...';
  statusMessage_el.className = 'alert alert-warning';
}

// show challenge notification function
function showChallengeNotification_func(challenger) {
  currentChallenger_obj = challenger;
  challengerNameSpan_el.textContent = challenger.username;
  challengeNotification_el.classList.remove('d-none');
}

// accept challenge function implement
function acceptChallenge_func() {
  if (!currentChallenger_obj) return;
  
  socket.emit('acceptChallenge', currentChallenger_obj.id);
  challengeNotification_el.classList.add('d-none');
}

// reject challenge function implement
function rejectChallenge_func() {
  if (!currentChallenger_obj) return;
  
  socket.emit('rejectChallenge', currentChallenger_obj.id);
  challengeNotification_el.classList.add('d-none');
  currentChallenger_obj = null;
}

// start game function implement
function startGame_func(data) {
  currentGameId_str = data.gameId;
  
  // update ui elements display
  gameWaiting_section.classList.add('d-none');
  gameUI_section.classList.remove('d-none');
  gameResult_section.classList.add('d-none');
  
  opponentNameSpan_el.textContent = data.opponent;
  totalQuestionsSpan_el.textContent = data.questionCount;
  yourScoreSpan_el.textContent = '0';
  opponentScoreSpan_el.textContent = '0';
  
  // update status message display
  statusMessage_el.textContent = `Game playing, opponent: ${data.opponent}`;
  statusMessage_el.className = 'alert alert-success';
}

// show new question function implement
function showQuestion_func(data) {
  clearInterval(timerInterval_var);
  hasTimedOut_flag = false; // reset timeout flag status
  
  questionNumberSpan_el.textContent = data.questionNumber;
  questionText_el.textContent = data.question;
  
  // create option buttons for answer
  optionsContainer_el.innerHTML = '';
  data.options.forEach((option, index) => {
    const button_element = document.createElement('button');
    button_element.className = 'btn btn-outline-primary option-btn';
    button_element.textContent = option;
    button_element.setAttribute('data-index', index);
    button_element.addEventListener('click', () => {
      submitAnswer_func(index);
      disableAllOptions_func();
    });
    optionsContainer_el.appendChild(button_element);
  });
  
  // hide answer feedback section
  answerFeedback_el.classList.add('d-none');
  
  // start timer for question
  startTimer_func();
}

// disable all options function implement
function disableAllOptions_func() {
  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.disabled = true;
    btn.classList.remove('btn-outline-primary');
    btn.classList.add('btn-secondary');
  });
}

// start timer function implement
function startTimer_func() {
  timeLeft_count = 15;
  updateTimerDisplay_func();
  
  timerInterval_var = setInterval(() => {
    timeLeft_count--;
    updateTimerDisplay_func();
    
    if (timeLeft_count <= 0) {
      clearInterval(timerInterval_var);
      
      // check if not timeout already happen
      if (!hasTimedOut_flag) {
        hasTimedOut_flag = true;
        
        // disable all options when timeout
        disableAllOptions_func();
        
        // submit timeout answer to server
        if (currentGameId_str) {
          socket.emit('submitAnswer', {
            gameId: currentGameId_str,
            answerIndex: -1,
            timeout: true
          });
        }
        
        // show timeout feedback message
        showAnswerFeedback_func(false, 'Time up! You not answer in time.');
      }
    }
  }, 1000);
}

// update timer display function
function updateTimerDisplay_func() {
  timerSpan_el.textContent = timeLeft_count;
  
  if (timeLeft_count <= 5) {
    timerSpan_el.classList.remove('bg-warning');
    timerSpan_el.classList.add('bg-danger');
  } else {
    timerSpan_el.classList.remove('bg-danger');
    timerSpan_el.classList.add('bg-warning');
  }
}

// submit answer function implement
function submitAnswer_func(answerIndex) {
  if (!currentGameId_str || hasTimedOut_flag) return;
  
  // prevent multiple answer submit
  hasTimedOut_flag = true;
  
  socket.emit('submitAnswer', {
    gameId: currentGameId_str,
    answerIndex: answerIndex,
    timeout: false
  });
}

// show answer feedback function
function showAnswerFeedback_func(correct, message) {
  answerFeedback_el.classList.remove('d-none', 'alert-success', 'alert-danger');
  
  if (correct) {
    answerFeedback_el.classList.add('alert-success');
    answerFeedback_el.textContent = message || 'Correct answer! Well done!';
  } else {
    answerFeedback_el.classList.add('alert-danger');
    answerFeedback_el.textContent = message || 'Wrong answer! Try better next time.';
  }
}

// update score display function
function updateScore_func(data) {
  yourScoreSpan_el.textContent = data.yourScore;
  opponentScoreSpan_el.textContent = data.opponentScore;
}

// show game result function implement
function showGameResult_func(data) {
  // hide game ui, show result section
  gameUI_section.classList.add('d-none');
  gameResult_section.classList.remove('d-none');
  
  finalYourScore_el.textContent = data.yourScore;
  finalOpponentScore_el.textContent = data.opponentScore;
  
  // determine winner and show message
  let winnerMessage_str = '';
  if (data.winner === null) {
    winnerMessage_str = 'It is a tie game! Good job both!';
    winnerDisplay_el.className = 'alert alert-info my-3';
  } else if (data.winner === currentUser_name) {
    winnerMessage_str = 'Congratulations! You win the game!';
    winnerDisplay_el.className = 'alert alert-success my-3';
  } else {
    winnerMessage_str = `${data.winner} win the game. Try again next time!`;
    winnerDisplay_el.className = 'alert alert-warning my-3';
  }
  
  winnerDisplay_el.textContent = winnerMessage_str;
  
  // update status message back
  statusMessage_el.textContent = 'Game finished! You can start new game or challenge other player.';
  statusMessage_el.className = 'alert alert-info';
}

// handle opponent left function
function handleOpponentLeft_func() {
  alert('Your opponent leave the game. Game will end now.');
  resetGameUI_func();
}

// reset game ui function implement
function resetGameUI_func() {
  // clear game status variables
  currentGameId_str = null;
  currentChallenger_obj = null;
  hasTimedOut_flag = false;
  
  if (timerInterval_var) {
    clearInterval(timerInterval_var);
    timerInterval_var = null;
  }
  
  // show waiting section, hide others
  gameWaiting_section.classList.remove('d-none');
  gameUI_section.classList.add('d-none');
  gameResult_section.classList.add('d-none');
  challengeNotification_el.classList.add('d-none');
  
  // reset status message
  statusMessage_el.textContent = 'Waiting for challenge or choose a player to challenge';
  statusMessage_el.className = 'alert alert-info';
}

// socket event listeners setup
socket.on('joinError', (message) => {
  showJoinError_func(message);
});

socket.on('updateUserList', (users) => {
  if (currentUser_name) {
    updateUserList_func(users);
  }
});

socket.on('challengeReceived', (challenger) => {
  showChallengeNotification_func(challenger);
});

socket.on('challengeRejected', (username) => {
  statusMessage_el.textContent = `${username} reject your challenge. Try challenge other player.`;
  statusMessage_el.className = 'alert alert-warning';
});

socket.on('gameStart', (data) => {
  startGame_func(data);
});

socket.on('newQuestion', (data) => {
  showQuestion_func(data);
});

socket.on('answerResult', ({ correct, score }) => {
  yourScoreSpan_el.textContent = score;
  showAnswerFeedback_func(correct);
});

socket.on('updateScore', (data) => {
  updateScore_func(data);
});

socket.on('gameEnd', (data) => {
  showGameResult_func(data);
});

socket.on('opponentLeft', () => {
  handleOpponentLeft_func();
});

// when page load, check if user already login
document.addEventListener('DOMContentLoaded', () => {
  // auto focus username input
  usernameInput_el.focus();
  
  // allow enter key to join game
  usernameInput_el.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      joinGame_func();
    }
  });
});

// handle successful user join
socket.on('updateUserList', (users) => {
  const userExists_check = users.find(user => user.username === usernameInput_el.value.trim());
  if (userExists_check && !currentUser_name) {
    handleJoinSuccess_func(userExists_check.username);
  }
  
  if (currentUser_name) {
    updateUserList_func(users);
  }
}); 