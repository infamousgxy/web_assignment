const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');

// create express app and http server    
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// static file middleware  
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// routes define
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/about', (req, res) => {
  res.render('about');
});

app.get('/quiz', (req, res) => {
  res.render('quiz');
});

// online user manage
const onlineUsers_data = {};
const userChallenges_map = {};
const activeGames_list = {};

// quiz questions data store
const quizQuestions_array = [
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

// socket.io connection handle process
io.on('connection', (socket) => {
  console.log('User connect:', socket.id);
  
  // user join process
  socket.on('userJoin', (username) => {
    // check if username already exist in system
    const userExists_check = Object.values(onlineUsers_data).some(user => user.username === username);
    
    if (userExists_check) {
      socket.emit('joinError', 'This username already used, please choose another one');
      return;
    }
    
    onlineUsers_data[socket.id] = {
      id: socket.id,
      username: username,
      status: 'online'  
      // online, busy status define
    };
    

    // send current online user list to all clients
    
    io.emit('updateUserList', Object.values(onlineUsers_data));
    console.log(`${username} join the game successfully`);
  });
  
  // sending challenge to other player
  socket.on('sendChallenge', (targetId) => {
    const challenger_user = onlineUsers_data[socket.id];
    const target_user = onlineUsers_data[targetId];
    
    if (!target_user || !challenger_user) return;
    
    console.log(`${challenger_user.username} send challenge to ${target_user.username}`);
    
    // record challenge information
    userChallenges_map[targetId] = {
      challengerId: socket.id,
      challengerName: challenger_user.username
    };
    
    // send challenge notification to target user
    io.to(targetId).emit('challengeReceived', {
      id: socket.id,
      username: challenger_user.username
    });
  });
  
  // accept challenge process
  socket.on('acceptChallenge', (challengerId) => {
    const player1_info = onlineUsers_data[challengerId];
    const player2_info = onlineUsers_data[socket.id];
    
    if (!player1_info || !player2_info) return;
    
    console.log(`${player2_info.username} accept the challenge from ${player1_info.username}`);
    
    // set both players status to busy
    player1_info.status = 'busy';
    player2_info.status = 'busy';
    
    // create game room id with timestamp
    const gameId_generated = `game_${Date.now()}`;
    
    // create game status object
    activeGames_list[gameId_generated] = {
      players: [
        { id: challengerId, username: player1_info.username, score: 0, answered: false },
        { id: socket.id, username: player2_info.username, score: 0, answered: false }
      ],
      currentQuestion: 0,
      questions: [...quizQuestions_array].sort(() => Math.random() - 0.5).slice(0, 5)
    };
    
    // add both players to game room
    io.to(challengerId).emit('gameStart', { 
      gameId: gameId_generated, 
      opponent: player2_info.username,
      questionCount: activeGames_list[gameId_generated].questions.length
    });
    
    io.to(socket.id).emit('gameStart', { 
      gameId: gameId_generated, 
      opponent: player1_info.username,
      questionCount: activeGames_list[gameId_generated].questions.length
    });
    
    // update user list to all clients
    io.emit('updateUserList', Object.values(onlineUsers_data));
    
    // start send first question after delay
    setTimeout(() => {
      sendQuestion_func(gameId_generated);
    }, 2000);
  });
  
  // reject challenge process
  socket.on('rejectChallenge', (challengerId) => {
    io.to(challengerId).emit('challengeRejected', onlineUsers_data[socket.id].username);
  });
  
  // receive answer from player
  socket.on('submitAnswer', ({ gameId, answerIndex, timeout }) => {
    const game_data = activeGames_list[gameId];
    if (!game_data) return;
    
    // find player index in game
    const playerIndex_found = game_data.players.findIndex(p => p.id === socket.id);
    if (playerIndex_found === -1) return;
    
    // if player already answered, ignore this request
    if (game_data.players[playerIndex_found].answered) return;
    
    // mark player has answered
    game_data.players[playerIndex_found].answered = true;
    
    // handle timeout separately case
    if (timeout) {
      console.log(`Player ${game_data.players[playerIndex_found].username} timeout not answer question ${game_data.currentQuestion + 1}`);
      
      // record timeout result for opponent to judge
      game_data.players[playerIndex_found].lastAnswerCorrect = false;
      
      // notify player answer result
      io.to(socket.id).emit('answerResult', {
        correct: false,
        score: game_data.players[playerIndex_found].score
      });
      
      // check if both players answered or time up
      checkAndProceed_func(gameId);
      return;
    }
    
    // check if answer correct or not
    const currentQ_data = game_data.questions[game_data.currentQuestion];
    const isCorrect_result = (answerIndex === currentQ_data.correctAnswer);
    
    console.log(`Player ${game_data.players[playerIndex_found].username} answer question ${game_data.currentQuestion + 1}, answer is ${isCorrect_result ? 'correct' : 'wrong'}`);
    
    // calculate score based on answer situation
    const otherPlayerIndex_calc = playerIndex_found === 0 ? 1 : 0;
    
    // if first player answer correct, get 2 points; opponent get 0
    if (isCorrect_result && !game_data.players[otherPlayerIndex_calc].answered) {
      game_data.players[playerIndex_found].score += 2;
    } 
    // if opponent answer wrong, but current player answer correct, current player get 1 point
    else if (isCorrect_result && game_data.players[otherPlayerIndex_calc].answered && 
             game_data.players[otherPlayerIndex_calc].lastAnswerCorrect === false) {
      game_data.players[playerIndex_found].score += 1;
    }
    
    // record this answer correct or not for opponent to judge
    game_data.players[playerIndex_found].lastAnswerCorrect = isCorrect_result;
    
    // notify player answer result
    io.to(socket.id).emit('answerResult', {
      correct: isCorrect_result,
      score: game_data.players[playerIndex_found].score
    });
    
    // check if both players answered or time up
    checkAndProceed_func(gameId);
  });
  
  // user disconnect event handle
  socket.on('disconnect', () => {
    const user_info = onlineUsers_data[socket.id];
    if (!user_info) return;
    
    console.log(`${user_info.username} leave the game`);
    
    // if user in game, notify opponent about this
    Object.keys(activeGames_list).forEach(gameId => {
      const game_check = activeGames_list[gameId];
      const playerIndex_check = game_check.players.findIndex(p => p.id === socket.id);
      
      if (playerIndex_check !== -1) {
        const opponentIndex_calc = playerIndex_check === 0 ? 1 : 0;
        const opponentId_get = game_check.players[opponentIndex_calc].id;
        
        // notify opponent game over because player left
        io.to(opponentId_get).emit('opponentLeft');
        
        // update opponent status back to online
        if (onlineUsers_data[opponentId_get]) {
          onlineUsers_data[opponentId_get].status = 'online';
        }
        
        // remove game from active list
        delete activeGames_list[gameId];
      }
    });
    
    // remove user from online list
    delete onlineUsers_data[socket.id];
    
    // remove related challenges if exist
    if (userChallenges_map[socket.id]) {
      delete userChallenges_map[socket.id];
    }
    
    // update user list to all clients
    io.emit('updateUserList', Object.values(onlineUsers_data));
  });
});

// send question function define
function sendQuestion_func(gameId) {
  const game_obj = activeGames_list[gameId];
  if (!game_obj) return;
  
  // if already ask all questions, end game now
  if (game_obj.currentQuestion >= game_obj.questions.length) {
    endGame_func(gameId);
    return;
  }
  
  const currentQ_obj = game_obj.questions[game_obj.currentQuestion];
  
  // reset player answer status for new question
  game_obj.players.forEach(player => {
    player.answered = false;
    delete player.lastAnswerCorrect;
  });
  
  // send question to both players in game
  game_obj.players.forEach(player => {
    io.to(player.id).emit('newQuestion', {
      question: currentQ_obj.question,
      options: currentQ_obj.options,
      questionNumber: game_obj.currentQuestion + 1,
      totalQuestions: game_obj.questions.length
    });
  });
  
  // set question timeout 15 seconds wait
  setTimeout(() => {
    checkAndProceed_func(gameId);
  }, 15000);
}

// check and proceed next step function
function checkAndProceed_func(gameId) {
  const game_obj = activeGames_list[gameId];
  if (!game_obj) return;
  
  // if both players answered, or time up already
  const allAnswered_check = game_obj.players.every(player => player.answered);
  
  if (allAnswered_check) {
    // short wait before next question start
    setTimeout(() => {
      game_obj.currentQuestion++;
      sendQuestion_func(gameId);
    }, 5000);
    
    // send current scores to players
    game_obj.players.forEach(player => {
      io.to(player.id).emit('updateScore', {
        yourScore: player.score,
        opponentScore: game_obj.players.find(p => p.id !== player.id).score
      });
    });
  }
}

// end game function define
function endGame_func(gameId) {
  const game_obj = activeGames_list[gameId];
  if (!game_obj) return;
  
  // determine winner of the game
  let winner_result = null;
  if (game_obj.players[0].score > game_obj.players[1].score) {
    winner_result = game_obj.players[0].username;
  } else if (game_obj.players[0].score < game_obj.players[1].score) {
    winner_result = game_obj.players[1].username;
  }
  
  // send game result to both players
  game_obj.players.forEach(player => {
    io.to(player.id).emit('gameEnd', {
      yourScore: player.score,
      opponentScore: game_obj.players.find(p => p.id !== player.id).score,
      winner: winner_result
    });
    
    // update player status back to online
    if (onlineUsers_data[player.id]) {
      onlineUsers_data[player.id].status = 'online';
    }
  });
  
  // remove game from active list
  delete activeGames_list[gameId];
  
  // update user list to all clients
  io.emit('updateUserList', Object.values(onlineUsers_data));
}

// start server on port
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 