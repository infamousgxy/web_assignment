const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Static file middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/about', (req, res) => {
  res.render('about');
});

app.get('/quiz', (req, res) => {
  res.render('quiz');
});

// Online user management
const onlineUsers = {};
const userChallenges = {};
const activeGames = {};

// Quiz questions data 
const quizQuestions = [
  {
    question: "Which product was designed by Apple ?",
    options: ["Mac", "Switch", "Thinkpad", "Kindle"],
    correctAnswer: 0
  },
  {
    question: "What is the capital of China?",
    options: ["Shanghai", "Guangzhou", "Beijing", "Shenzhen"],
    correctAnswer: 2
  },
  {
    question: "Which one is not programming language?",
    options: ["Java", "Python", "Banana", "JavaScript"],
    correctAnswer: 2
  },
  {
    question: "Earth is which number planet from sun?",
    options: ["First one", "Second one", "Third one", "Fourth one"],
    correctAnswer: 2
  },
  {
    question: "What does HTML stand for?",
    options: ["Hyper Text Markup Language", "High Tech Modern Language", "Home Tool Markup Language", "Hyper Technical Machine Learning"],
    correctAnswer: 0
  }
];

// Socket.io connection handle
io.on('connection', (socket) => {
  console.log('User connect:', socket.id);
  
  // User join
  socket.on('userJoin', (username) => {
// Check if username already exist
    const userExists = Object.values(onlineUsers).some(user => user.username === username);
    
    if (userExists) {
      socket.emit('joinError', 'This username already used, please choose another one');
      return;
    }
    
    onlineUsers[socket.id] = {
      id: socket.id,
      username: username,
      status: 'online'  
      // online, busy
    };
    

    // Send current online user list
    
    io.emit('updateUserList', Object.values(onlineUsers));
    console.log(`${username} join the game`);
  });
  
// Sending challenge
  socket.on('sendChallenge', (targetId) => {
    const challenger = onlineUsers[socket.id];
    const target = onlineUsers[targetId];
    
    if (!target || !challenger) return;
    
    console.log(`${challenger.username} send challenge to ${target.username}`);
    
    // Record challenge
    userChallenges[targetId] = {
      challengerId: socket.id,
      challengerName: challenger.username
    };
    
    // Send challenge notification to target user
    io.to(targetId).emit('challengeReceived', {
      id: socket.id,
      username: challenger.username
    });
  });
  
  // Accept challenge
  socket.on('acceptChallenge', (challengerId) => {
    const player1 = onlineUsers[challengerId];
    const player2 = onlineUsers[socket.id];
    
    if (!player1 || !player2) return;
    
    console.log(`${player2.username} accept the challenge from ${player1.username}`);
    
    // Set both players status to busy
    player1.status = 'busy';
    player2.status = 'busy';
    
    // Create game room ID
    const gameId = `game_${Date.now()}`;
    
    // Create game status
    activeGames[gameId] = {
      players: [
        { id: challengerId, username: player1.username, score: 0, answered: false },
        { id: socket.id, username: player2.username, score: 0, answered: false }
      ],
      currentQuestion: 0,
      questions: [...quizQuestions].sort(() => Math.random() - 0.5).slice(0, 5)
    };
    
    // Add both players to game room
    io.to(challengerId).emit('gameStart', { 
      gameId, 
      opponent: player2.username,
      questionCount: activeGames[gameId].questions.length
    });
    
    io.to(socket.id).emit('gameStart', { 
      gameId, 
      opponent: player1.username,
      questionCount: activeGames[gameId].questions.length
    });
    
    // Update user list
    io.emit('updateUserList', Object.values(onlineUsers));
    
    // Start send first question
    setTimeout(() => {
      sendQuestion(gameId);
    }, 2000);
  });
  
  // Reject challenge
  socket.on('rejectChallenge', (challengerId) => {
    io.to(challengerId).emit('challengeRejected', onlineUsers[socket.id].username);
  });
  
  // Receive answer
  socket.on('submitAnswer', ({ gameId, answerIndex, timeout }) => {
    const game = activeGames[gameId];
    if (!game) return;
    
    // Find player index
    const playerIndex = game.players.findIndex(p => p.id === socket.id);
    if (playerIndex === -1) return;
    
    // If player already answered, ignore
    if (game.players[playerIndex].answered) return;
    
    // Mark player has answered
    game.players[playerIndex].answered = true;
    
    // Handle timeout separately
    if (timeout) {
      console.log(`Player ${game.players[playerIndex].username} timeout not answer question ${game.currentQuestion + 1}`);
      
      // Record timeout (for opponent to judge)
      game.players[playerIndex].lastAnswerCorrect = false;
      
      // Notify player answer result
      io.to(socket.id).emit('answerResult', {
        correct: false,
        score: game.players[playerIndex].score
      });
      
      // Check if both players answered or time up
      checkAndProceed(gameId);
      return;
    }
    
    // Check if answer correct
    const currentQ = game.questions[game.currentQuestion];
    const isCorrect = (answerIndex === currentQ.correctAnswer);
    
    console.log(`Player ${game.players[playerIndex].username} answer question ${game.currentQuestion + 1}, answer is ${isCorrect ? 'correct' : 'wrong'}`);
    
    // Calculate score based on answer situation
    const otherPlayerIndex = playerIndex === 0 ? 1 : 0;
    
    // If first player answer correct, get 2 points; opponent get 0
    if (isCorrect && !game.players[otherPlayerIndex].answered) {
      game.players[playerIndex].score += 2;
    } 
    // If opponent answer wrong, but current player answer correct, current player get 1 point
    else if (isCorrect && game.players[otherPlayerIndex].answered && 
             game.players[otherPlayerIndex].lastAnswerCorrect === false) {
      game.players[playerIndex].score += 1;
    }
    
    // Record this answer correct or not (for opponent to judge)
    game.players[playerIndex].lastAnswerCorrect = isCorrect;
    
    // Notify player answer result
    io.to(socket.id).emit('answerResult', {
      correct: isCorrect,
      score: game.players[playerIndex].score
    });
    
    // Check if both players answered or time up
    checkAndProceed(gameId);
  });
  
  // User disconnect
  socket.on('disconnect', () => {
    const user = onlineUsers[socket.id];
    if (!user) return;
    
    console.log(`${user.username} leave the game`);
    
    // If user in game, notify opponent
    Object.keys(activeGames).forEach(gameId => {
      const game = activeGames[gameId];
      const playerIndex = game.players.findIndex(p => p.id === socket.id);
      
      if (playerIndex !== -1) {
        const opponentIndex = playerIndex === 0 ? 1 : 0;
        const opponentId = game.players[opponentIndex].id;
        
        // Notify opponent game over
        io.to(opponentId).emit('opponentLeft');
        
        // Update opponent status
        if (onlineUsers[opponentId]) {
          onlineUsers[opponentId].status = 'online';
        }
        
        // Remove game
        delete activeGames[gameId];
      }
    });
    
    // Remove user
    delete onlineUsers[socket.id];
    
    // Remove related challenges
    if (userChallenges[socket.id]) {
      delete userChallenges[socket.id];
    }
    
    // Update user list
    io.emit('updateUserList', Object.values(onlineUsers));
  });
});

// Send question
function sendQuestion(gameId) {
  const game = activeGames[gameId];
  if (!game) return;
  
  // If already ask all questions, end game
  if (game.currentQuestion >= game.questions.length) {
    endGame(gameId);
    return;
  }
  
  const currentQ = game.questions[game.currentQuestion];
  
  // Reset player answer status
  game.players.forEach(player => {
    player.answered = false;
    delete player.lastAnswerCorrect;
  });
  
  // Send question to both players
  game.players.forEach(player => {
    io.to(player.id).emit('newQuestion', {
      question: currentQ.question,
      options: currentQ.options,
      questionNumber: game.currentQuestion + 1,
      totalQuestions: game.questions.length
    });
  });
  
  // Set question timeout (15 seconds)
  setTimeout(() => {
    checkAndProceed(gameId);
  }, 15000);
}

// Check and proceed next step
function checkAndProceed(gameId) {
  const game = activeGames[gameId];
  if (!game) return;
  
  // If both players answered, or time up
  const allAnswered = game.players.every(player => player.answered);
  
  if (allAnswered) {
    // Short wait before next question
    setTimeout(() => {
      game.currentQuestion++;
      sendQuestion(gameId);
    }, 5000);
    
    // Send current scores
    game.players.forEach(player => {
      io.to(player.id).emit('updateScore', {
        yourScore: player.score,
        opponentScore: game.players.find(p => p.id !== player.id).score
      });
    });
  }
}

// End game
function endGame(gameId) {
  const game = activeGames[gameId];
  if (!game) return;
  
  // Determine winner
  let winner = null;
  if (game.players[0].score > game.players[1].score) {
    winner = game.players[0].username;
  } else if (game.players[0].score < game.players[1].score) {
    winner = game.players[1].username;
  }
  
  // Send game result
  game.players.forEach(player => {
    io.to(player.id).emit('gameEnd', {
      yourScore: player.score,
      opponentScore: game.players.find(p => p.id !== player.id).score,
      winner: winner
    });
    
    // Update player status
    if (onlineUsers[player.id]) {
      onlineUsers[player.id].status = 'online';
    }
  });
  
  // Remove game
  delete activeGames[gameId];
  
  // Update user list
  io.emit('updateUserList', Object.values(onlineUsers));
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 