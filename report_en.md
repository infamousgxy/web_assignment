# JC2503 report of Web Application Development

**Student Name**: Xinyi Guo (郭新溢)  
**ID**: [50090961]  
**Date**: 29.05.2025

## 1.The overall design of the website.


### 1.1 The Website architecture design
In my project, building using the Node.js + Express framework and includes three main pages as required by the assignment:

- **Homepage(index.ejs)**: This page show the basic personal information and an overview of the website.
- **Aboutpage(about.ejs)**: Provides detailed information about personal skills, coursework, and project experiences.  
- **Quizpage(quiz.ejs)**: This page implements a two-player online quiz battle feature.

The website uses EJS as the templating engine, with ​​layout.ejs​​ ensuring a consistent page layout and the Bootstrap framework provides foundational styling, supplemented by custom CSS for responsive design.



### 1.2 The Quiz Game System Design
The quiz game adopts a real-time two-player battle mode with the following main functional modules:

- **​​User Management System​​**: Handles user join requests and provides online status management.
- **​​Challenge System​​**: Allows players to send challenges to each others and choose whether to accept or disapprove them.
- **​​Game Logic​​**: This module implements core functions such as random question distribution, the timers, and scoring.
- **Multi-Room Support**: Enables multiple pairs of players to engage in separate games simultaneously.


The UI follows a top-bottom layout: player information and the online player list are positioned at the top and the game area occupies the full width below. This design can provide a better user experience for players.

## 2. ​​Client-Server Communication Mechanism

### 2.1 Socket.IO Event Handling Architecture
The project implements real-time bidirectional communication using Socket.IO, with the following core event types:

**Client-Sent Events**
- `userJoin`: User joins the game
- `sendChallenge`: Sending the challenge requests
- `acceptChallenge/rejectChallenge`: Accepts/rejects a challenge
- `submitAnswer`: Submits an answer

**Server-Sent Events**
- `updateUserList`: Updates the online user list
- `challengeReceived`: Notifies of a received challenges
- `gameStart`: Signals the start of the game
- `newQuestion`: Sending new questions
- `answerResult`: Provides feedback on answer correctness

### 2.2 Data Management Strategy
The server employs three primary data structures：
- `onlineUsers_data`: Manages online user information (the unique user IDs)
- `userChallenges_map`: Recording the relationships of challenge
- `activeGames_list`: Stores active game states

Each game room contains player information, current questions, scores, and other state data. The quiz questions are randomly shuffled, with 5 questions selected per game session.


### 2.3 Scoring Mechanism Implementation
The game features a differentiated scoring strategy：
- The first correct responder earns 2 points, while the opponent receives 0
- If the opponent answers incorrectly but the player answers correctly, 1 point you will award
- Timeouts or incorrect answers result in 0 points

This design encourages quick and accurate responses, enhancing the game's competitive nature.

## 3. Challenges and Lessons Learned During Development

### 3.1 Key Challenges Faced

**Real-Time Communication Handling**: Initial difficulties arose in managing Socket.IO events, particularly in maintaining game state and preventing duplicate answer submissions. These were resolved by implementing a hasTimedOut_flag to handle timeout-related problems. Specific solutions include:
   -​ ​Duplicate Submission Prevention: The submitAnswer_func checks the hasTimedOut_flag status and sets it to true immediately after submission.
   - Timeout Handling Mechanism​​: A 15-second countdown is enforced using setTimeout, automatically submitting a timeout response when triggered.
   - ​​Game State Synchronization​​: Player response status is tracked via game_data.players[playerIndex_found].answered.
   - Event Processing Order​​: Checks whether a player has already answered before processing requests to avoid duplicates.
   - ​​Timer Management​​: clearInterval(timerInterval_var) is called at the start of each new question to clear previous timers.
   - ​​State Reset​​: The hasTimedOut_flag and player answered status are reset (false) when a new question begins.

**​Layout Design Optimization**: The original design placed player information in a left sidebar, leaving limited space for the game area. This was later redesigned into a top-bottom layout, significantly improving user experience. Key adjustments include:
   - HTML Structure Modification​​: Replaced the original col-md-4 and col-md-8 side-by-side layout with two separate row sections.
   - ​​Top Row​​: Uses col-md-6 to evenly split space for "Player Information" and "Online Players."
   - Bottom Row​​: Uses col-12 to allow the "Quiz Game" section to occupy full width.
   - ​​Spacing​​: Added mb-4 class to create proper spacing between rows.
   - Card Height Consistency​​: Applied h-100 to the top cards to ensure uniform height.

**Multi-Game Room Management​​:**: Supporting simultaneous gameplay for multiple player pairs required careful state management to prevent cross-room interference. Solutions implemented:
   - ​​Unique Game ID Generation​​: gameId_generated = game_${Date.now()} ensures distinct identifiers.
   - State Isolation​​: The activeGames_list object stores independent game states keyed by gameId.
   - Per-Game Data​​: Each entry contains player details, current question index, scores, etc.
   - ​​Event Handling​​: All game-related events first retrieve the correct state via gameId.
   - Cleanup​​: Completed games are removed (delete activeGames_list[gameId]) to prevent memory leaks.
   - Targeted Messaging​​: Socket.IO's room mechanism ensures messages are sent only to participating players.

### 3.2 Technical Learning Gains
Through this project, I have deeply studied:
- The usage of Node.js and Express framework
- Implementation principles of Socket.IO real-time communication
- Application of EJS template engine
- Best practices for frontend-backend data interaction

Especially, the event-driven programming pattern of Socket.IO gave me a deeper understanding of real-time web application development.

### 3.3 Code Quality Reflection
During development, I noticed that my programming habits still need improvement. For example: Variable naming is not standardized enough (some variables with underscores like onlineUsers_data were used) and The English expression in comments could be better. Although these issues do not affect functionality implementation, I hope to unify the naming convention in later development by consistently using camelCase rules.

## 4. References

During the development process, I primarily consulted the following resources:

1. **​​Official Documentation**:
   - Node.js document: https://nodejs.org/docs/latest/api/
   - Express.js document: https://expressjs.com/
   - Socket.IO document: https://socket.io/docs/

2. **​​Technical Communities​​**:
   - MDN Web document: https://developer.mozilla.org/
   - Bootstrap document: https://getbootstrap.com/docs/

3. **​​Generative AI Tools Usage Notes​​**:
   
   **GenAI Tool Used**: Claude 4 (Anthropic)​​
   
   **Purpose and Method of Use**: When deploying the project to the Codio environment, encountered Node.js version compatibility issues and used Claude 4 to assist in resolving environment configuration problems.​​
   
   **Specific Usage Description**:
   - **Problem Description​​**: The project ran normally locally but encountered a "Cannot find module 'socket.io'" error after deployment to Codio
   - **Prompt**: "I'm getting a 'socket.io module not found' error when deploying my Node.js project to Codio environment. It works fine locally and dependencies in package.json are correct. How to resolve this?"
   - **Generation Date​​**: May 27, 2025
   - **​​AI Suggestions​​:**: Check Node.js version on Codio, re-run npm install, verify package-lock.json file synchronization
   - **​​Implementation​​**: Followed AI's advice to execute npm cache clean --force and npm install commands, successfully resolving the deployment issue.


## 5. Conclusion

This assignment marked my transition from theoretical classroom learning to practical application, allowing me to experience the complete web application development lifecycle. While I had previously only worked on backend development for projects, this time I engaged in full-stack development through hands-on practice. Although I encountered several challenges during development, persistent debugging and optimization ultimately resulted in a fully functional two-player quiz game website.

The project not only strengthened my mastery of technologies like Node.js and Socket.IO but also enhanced my problem-solving and project management skills. I believe these experiences will prove invaluable for my future studies and subsequent development work. Most importantly, they will enable me to communicate and collaborate more effectively with frontend developers during debugging and development processes in future team projects.
