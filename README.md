# Personal Website and Two-Player Quiz Game 个人网站与双人答题游戏

## Introduction 简介

This is my homework project for Web Application Development course. It include personal info page and real-time two player quiz game function. This project help me learn web development technology and real-time communication.

这是我为Web应用开发课程创建的项目作业。包含个人简介页面和实时双人答题游戏功能。这个项目帮助我学习了网页开发技术和实时通信技术。

## Project Structure 项目结构

- `/public` - Static resource files 静态资源文件
  - `/css` - Style files 样式文件
  - `/js` - Client JavaScript files 客户端JavaScript文件
  - `/images` - Image resources 图片资源
- `/views` - EJS view templates EJS视图模板
- `server.js` - Server entry file 服务器入口文件

## Features 功能特点

- Responsive design, fit different devices 响应式设计，适配不同设备
- Home page and About Me page show personal information 首页和关于我页面展示个人信息
- Real-time two-player quiz game function 实时双人答题游戏功能:
  - Support multiple users online at same time 支持多用户同时在线
  - Real-time challenge between users 用户间实时挑战对战
  - Quick answer system and score system 抢答机制和计分系统
  - Multiple round quiz challenge 多轮题目挑战

## Technology Stack 技术栈

- Frontend 前端: HTML5, CSS3, JavaScript, Bootstrap 5
- Backend 后端: Node.js, Express
- View Engine 视图引擎: EJS
- Real-time Communication 实时通信: Socket.IO

## How to Run 如何运行

1. Make sure Node.js installed (recommend v14 and above) 确保已安装Node.js（推荐v14以上版本）
2. Install dependencies 安装依赖:
   ```
   npm install
   ```
3. Start server 启动服务器:
   ```
   npm start
   ```
4. Access in browser 在浏览器中访问 `http://localhost:3000`

## Development Mode 开发模式

Run following command to start development mode, support auto restart server 运行以下命令启动开发模式，支持自动重启服务器:

```
npm run dev
```

## Project Structure Description 项目结构说明

- `server.js` - Main server file, include Express config and Socket.IO implement 服务器主文件，包含Express配置和Socket.IO实现
- `views/layout.ejs` - Main layout template 主布局模板
- `views/index.ejs` - Home page view 首页视图
- `views/about.ejs` - About Me page view 关于我页面视图
- `views/quiz.ejs` - Quiz game page view 答题游戏页面视图
- `public/js/quiz.js` - Quiz game client logic 答题游戏客户端逻辑
- `public/css/style.css` - Custom styles 自定义样式


