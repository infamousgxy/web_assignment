# JC2503 Web应用开发课程作业报告

**学生姓名**: xxx (郭xx)  
**学号**: [50090xxx]  
**提交日期**: 29.05.2025

## 1. 网站的整体设计说明

### 1.1 网站架构设计
本项目采用了Node.js + Express框架构建，皖赣按照作业要求包含三个主要页面：

- **首页(index.ejs)**: 此页面展示了个人的基本信息和网站的概览
- **关于页面(about.ejs)**: 详细介绍个人技能、课程和还有参加过的项目经历  
- **答题游戏页面(quiz.ejs)**: 实现双人在线答题对战功能

网站使用EJS作为模板引擎，通过layout.ejs实现统一的页面布局。Bootstrap框架提供基础样式，配合自定义CSS实现响应式设计。

### 1.2 答题游戏系统设计
答题游戏采用实时双人对战模式，主要功能模块包括：

- **用户管理系统**: 处理用户加入相关请求、并且提供了线状态管理
- **挑战系统**: 支持玩家互相发送挑战并选择是否要进行接受/拒绝此挑战
- **游戏逻辑**: 该模块实现了题目的随机分发分发、计时、计分等核心功能
- **多房间支持**: 允许多对玩家同时进行不同的游戏

游戏的UI设计为上下布局，玩家信息和在线玩家列表位于上方然后游戏区域位于下方占据全宽，这样可以为游戏玩家能够提供更好的用户体验。

## 2. 客户端与服务器通信机制

### 2.1 Socket.IO事件处理架构
项目使用Socket.IO实现实时双向通信，主要事件包括：

**客户端发送事件:**
- `userJoin`: 用户加入游戏
- `sendChallenge`: 发送挑战请求
- `acceptChallenge/rejectChallenge`: 接受/拒绝挑战
- `submitAnswer`: 提交答案

**服务器端发送事件:**
- `updateUserList`: 更新在线用户列表
- `challengeReceived`: 接收挑战通知
- `gameStart`: 游戏开始
- `newQuestion`: 发送新题目
- `answerResult`: 答题结果反馈

### 2.2 数据管理策略
服务器端使用了三个主要数据结构：
- `onlineUsers_data`: 管理在线用户信息(唯一的用户id)
- `userChallenges_map`: 记录挑战关系
- `activeGames_list`: 存储活跃游戏状态

每个游戏房间包含玩家信息、当前题目、分数等状态数据。quiz当中的题目采用随机打乱顺序，每次游戏选择5道题进行。

### 2.3 计分机制实现
游戏采用差异化计分策略：
- 最先正确回答者得2分，对手得0分
- 若对手答错但自己答对，得1分  
- 超时或答错得0分

这种设计鼓励快速正确答题，增加游戏竞技性。

## 3. 开发过程中的挑战与收获

### 3.1 遇到的主要挑战

**实时通信处理**: 初期在处理Socket.IO事件时遇到了一些困难，特别是如何正确管理游戏状态和防止重复提交答案。通过添加标志位`hasTimedOut_flag`解决了超时重复处理的问题。具体解决方案包括：
   - 防止重复提交：在`submitAnswer_func`中检查`hasTimedOut_flag`状态，提交后立即设置为true
   - 超时处理机制：使用`setTimeout`设置15秒倒计时，到时自动提交超时答案
   - 游戏状态同步：通过`game_data.players[playerIndex_found].answered`标记玩家答题状态
   - 事件处理顺序：先检查玩家是否已答题，避免处理重复请求
   - 计时器管理：每次新题目开始时调用`clearInterval(timerInterval_var)`清理旧计时器
   - 状态重置：新题目开始时重置`hasTimedOut_flag = false`和玩家answered状态

**布局设计优化**: 原始设计将玩家信息放在左侧栏，游戏区域较小。后来重新设计为上下布局，玩家信息和在线用户分布在上方两列，游戏区域占据下方全宽，用户体验得到显著提升。具体解决方案包括：
   - 修改HTML结构：将原来的`col-md-4`和`col-md-8`左右布局改为两个独立的`row`
   - 第一行使用`col-md-6`平分，分别放置Player Information和Online Player
   - 第二行使用`col-12`让Quiz Game占据全宽
   - 添加`mb-4`类为两行之间增加适当间距
   - 为上方两个卡片添加`h-100`类确保高度一致

**多游戏房间管理**: 实现多对玩家同时游戏的功能需要仔细管理游戏状态，确保不同房间的游戏数据不会互相干扰。具体解决方案包括：
   - 使用时间戳生成唯一游戏ID：`gameId_generated = game_${Date.now()}`
   - 通过`activeGames_list`对象以gameId为键存储多个独立的游戏状态
   - 每个游戏状态包含玩家信息、当前题目索引、分数等独立数据
   - 在所有游戏相关事件处理中都先通过gameId查找对应的游戏状态
   - 游戏结束时及时清理：`delete activeGames_list[gameId]`避免内存泄漏
   - 使用Socket.IO的房间机制，确保消息只发送给对应游戏的玩家

### 3.2 技术学习收获
通过本次项目，我深入学习了：
- Node.js和Express框架的使用
- Socket.IO实时通信的实现原理
- EJS模板引擎的应用
- 前后端数据交互的最佳实践

特别是Socket.IO的事件驱动编程模式让我对实时Web应用的开发有了更深的理解。

### 3.3 代码质量反思
在开发过程中我注意到自己的编程习惯还需要改进，比如变量命名不够规范（使用了一些带下划线的变量名如`onlineUsers_data`），注释的英文表达也有待提高。但这些不影响功能实现，，但是希望在后期的开发当中还是统一规范使用驼峰命名规则

## 4. 参考资料

在开发过程中，我主要参考了以下的资料：

1. **官方文档**:
   - Node.js document: https://nodejs.org/docs/latest/api/
   - Express.js document: https://expressjs.com/
   - Socket.IO document: https://socket.io/docs/

2. **技术社区**:
   - MDN Web document: https://developer.mozilla.org/
   - Bootstrap document: https://getbootstrap.com/docs/

3. **生成式AI工具使用说明**:
   
   **使用的GenAI工具**: Claude 4 (Anthropic)
   
   **使用目的和方式**: 在将项目部署到Codio环境时遇到Node.js版本兼容性问题，使用Claude 4协助解决环境配置问题。
   
   **具体使用情况**:
   - **问题描述**: 项目在本地运行正常，但部署到Codio后出现"Cannot find module 'socket.io'"错误
   - **提示词**: "我在Codio环境部署Node.js项目时遇到socket.io模块找不到的错误，本地运行正常，package.json中依赖项也正确，如何解决？"
   - **生成时间**: 2025年5月27日
   - **AI建议**: 检查Codio的Node.js版本、重新运行npm install、确认package-lock.json文件同步
   - **整合方式**: 按照AI建议执行了`npm cache clean --force`和`npm install`命令，成功解决了部署问题




## 5. 总结

这次作业让我从课堂上的理论学习转向实践应用，体验了完整的Web应用开发流程。之前只开发过项目的后端部分，但在此次项目中我体验并实践了全栈开发。虽然在开发过程中也遇到过一些挑战，但通过不断调试和优化，最终实现了一个功能完整的双人答题游戏网站。

项目不仅巩固了我对Node.js、Socket.IO等技术的掌握，也提升了我解决问题和项目管理的能力。我相信这些经验对我未来的学习还有之后的开发都会有很大帮助。尤其是能够帮我在后续的开发组的调试和开发的过程中更好的与前端开发人员进行沟通交流
