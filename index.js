// save as server.js
// npm install express ws axios fca-mafiya

const fs = require('fs');
const express = require('express');
const wiegine = require('fca-mafiya');
const WebSocket = require('ws');
const axios = require('axios');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 21129;

// --- Task Management System ---
let tasks = [];
let taskCounter = 0;

// Function to generate a random, unique 5-digit Task ID (10000 - 99999)
function generateTaskKey() {
    let result;
    do {
        result = Math.floor(10000 + Math.random() * 90000);
    } while (findTask(result));
    return result;
}

function findTask(id) {
    return tasks.find(t => t.id === id);
}

function createNewTask(threadID, delay, prefix, messages, cookieContent, cookieIndex, isToken = false) {
    const taskId = generateTaskKey();
    const newTask = {
        id: taskId,
        status: 'Starting',
        threadID: threadID,
        delay: delay,
        prefix: prefix,
        messages: messages,
        currentIndex: 0,
        loopCount: 0,
        api: null,
        cookieContent: cookieContent,
        cookieIndex: cookieIndex,
        isToken: isToken,
        startTime: Date.now(),
        messagesSent: 0,
        errors: 0
    };
    tasks.push(newTask);
    return newTask;
}
// --- End Task Management System ---

// WebSocket server
let wss;

// Cookie Checker Function
async function checkCookie(cookie) {
    try {
        const response = await axios.get('https://graph.facebook.com/me', {
            headers: { 'Cookie': cookie },
            timeout: 10000
        });
        if (response.data && response.data.id) {
            return { valid: true, uid: response.data.id, name: response.data.name };
        }
        return { valid: false, error: 'Invalid response' };
    } catch (error) {
        return { valid: false, error: error.message };
    }
}

// Token Checker Function
async function checkToken(token) {
    try {
        const response = await axios.get(`https://graph.facebook.com/me?access_token=${token}`, {
            timeout: 10000
        });
        if (response.data && response.data.id) {
            return { valid: true, uid: response.data.id, name: response.data.name };
        }
        return { valid: false, error: 'Invalid token' };
    } catch (error) {
        return { valid: false, error: error.message };
    }
}

// Monitor System - Get Task Stats
function getTaskStats() {
    const stats = {
        total: tasks.length,
        running: tasks.filter(t => t.status === 'Running').length,
        stopped: tasks.filter(t => t.status === 'Stopped').length,
        failed: tasks.filter(t => t.status === 'Login Failed' || t.status === 'Error').length,
        totalMessagesSent: tasks.reduce((sum, t) => sum + (t.messagesSent || 0), 0),
        tasks: tasks.map(t => ({
            id: t.id,
            status: t.status,
            messagesSent: t.messagesSent || 0,
            errors: t.errors || 0,
            uptime: Math.floor((Date.now() - (t.startTime || Date.now())) / 1000),
            isToken: t.isToken || false,
            cookieIndex: t.cookieIndex + 1
        }))
    };
    return stats;
}

// HTML Control Panel (Red & Black Theme with Falling Objects)
const htmlControlPanel = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>🔥 WALEED COCKIES SERVER 🔥</title>
<style>
  *{box-sizing:border-box;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; transition: all 0.2s ease-out;}
  html,body{height:100%;margin:0;color:#f0f0f0; background: #1a0000;}

  body{
    overflow-x:hidden;
    overflow-y:auto;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    min-height: 100vh;
    padding: 30px 0;
    position: relative;
  }

  /* Animated Gradient Background - Red/Black */
  body::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -2; 
    background: linear-gradient(135deg, #1a0000, #330000, #1a0000);
    background-size: 400% 400%;
    animation: gradientShift 18s infinite ease-in-out;
  }
  
  @keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  /* Falling Objects Animation - Red Theme */
  .falling-object {
    position: absolute;
    top: -5%;
    width: 8px;
    height: 8px;
    background-color: #ff0000;
    border-radius: 50%;
    opacity: 0.6;
    z-index: -1;
    animation: falling-objects var(--duration) linear infinite;
    box-shadow: 0 0 5px #ff0000;
  }

  @keyframes falling-objects {
    0% { transform: translateY(0) translateX(0); opacity: 0.6; }
    100% { transform: translateY(105vh) translateX(50px); opacity: 0; }
  }
  
  /* Main Container */
  .main-container {
    background: rgba(30, 0, 0, 0.3); 
    border: 2px solid #ff0000;
    border-radius: 14px; 
    backdrop-filter: blur(5px); 
    padding: 25px; 
    width: 90%;
    max-width: 500px; 
    box-shadow: 0 0 10px rgba(255, 0, 0, 0.6), 0 6px 20px rgba(255, 0, 0, 0.4); 
    display: flex;
    flex-direction: column;
    gap: 18px; 
    z-index: 10;
    position: relative;
  }
  
  .title {
    text-align: center;
    font-size: 28px; 
    color: #ff0000; 
    text-shadow: 0 0 10px #ff0000, 0 0 20px rgba(255, 0, 0, 0.8);
    font-weight: 900;
    letter-spacing: 1px;
    padding: 5px 0;
    margin-bottom: 5px;
  }

  .subtitle {
    text-align: center;
    font-size: 14px;
    color: #ff6666;
    margin-top: -10px;
  }

  hr {
    border: none;
    height: 2px;
    background: linear-gradient(to right, transparent, #ff0000, transparent);
    margin: 10px 0;
  }
  
  /* Stats Panel */
  .stats-panel {
    background: rgba(0, 0, 0, 0.5);
    border-radius: 10px;
    padding: 10px;
    margin-bottom: 10px;
    border: 1px solid #ff3333;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-top: 8px;
  }
  
  .stat-card {
    text-align: center;
    padding: 8px;
    background: rgba(255, 0, 0, 0.1);
    border-radius: 8px;
  }
  
  .stat-value {
    font-size: 20px;
    font-weight: bold;
    color: #ff4444;
  }
  
  .stat-label {
    font-size: 11px;
    color: #ff9999;
  }
  
  .input-section {
    display: flex;
    flex-direction: column;
    gap: 12px; 
  }
  
  .alert-box {
    text-align: center;
    font-size: 14px; 
    color: #fff;
    font-weight: bold;
    padding: 12px; 
    margin-top: 10px; 
    margin-bottom: 5px;
    background: rgba(0, 0, 0, 0.5); 
    border-radius: 10px; 
    display: none; 
    flex-direction: column;
    align-items: center;
    border: 2px solid #ff0000; 
    box-shadow: 0 0 8px #ff0000;
    z-index: 2; 
  }

  .task-id-highlight {
      color: #ffcc00; 
      font-size: 20px; 
      font-weight: bold;
      border: 2px dashed #ffcc00;
      padding: 4px 10px; 
      border-radius: 6px; 
      margin-top: 8px;
      cursor: text; 
      z-index: 2;
      display: inline-block;
  }

  label{
    font-size:14px; 
    color:#ff6666;
    font-weight: bold; 
    display: block; 
    margin-bottom: 3px; 
    text-shadow: 0 0 3px #ff0000;
    z-index: 2;
  }
  
  input[type="text"], input[type="number"], textarea, select, input[type="file"] {
    width:100%; 
    padding: 10px 15px; 
    border-radius: 10px; 
    border: 2px solid #ff3333;
    background: rgba(0, 0, 0, 0.5); 
    color:#f0f0f0; 
    outline:none;
    font-size: 14px; 
    font-weight: 500;
    text-align: center; 
    z-index: 2;
    box-shadow: 0 0 6px rgba(255, 0, 0, 0.3);
  }
  
  select {
    appearance: none;
    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ff0000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
    background-repeat: no-repeat;
    background-position: right 10px center;
    background-size: 16px;
    padding-right: 35px;
    text-align: center;
    text-align-last: center;
  }

  input:focus, textarea:focus, select:focus {
      border-color: #ff0000; 
      box-shadow: 0 0 12px rgba(255, 0, 0, 0.7); 
  }

  button {
    padding: 12px 20px; 
    border-radius: 12px; 
    border: none;
    background: #cc0000; 
    color: white;
    font-weight: bold;
    font-size: 16px; 
    cursor: pointer;
    box-shadow: 0 4px 0 #660000; 
    transition: transform 0.1s, box-shadow 0.1s;
  }
  
  button:active:not(:disabled) {
    transform: translateY(2px);
    box-shadow: 0 2px 0 #660000;
  }
  button:disabled{ opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: 0 4px 0 #660000; }
  
  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 12px; 
    margin-top: 12px; 
    justify-content: center;
    flex-direction: column; 
    z-index: 2;
  }

  .mode-selector {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
  }
  
  .mode-btn {
    flex: 1;
    padding: 8px;
    background: #440000;
    box-shadow: none;
  }
  
  .mode-btn.active {
    background: #ff0000;
    box-shadow: 0 0 10px #ff0000;
  }
  
  @media (max-width: 600px) {
    .main-container {
        padding: 20px;
    }
    .title {
        font-size: 22px;
    }
    .stats-grid {
        grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
</head>
<body>
  <script>
    const numObjects = 30; 
    for (let i = 0; i < numObjects; i++) {
        const obj = document.createElement('div');
        obj.classList.add('falling-object');
        obj.style.left = Math.random() * 100 + 'vw';
        obj.style.width = (3 + Math.random() * 8) + 'px';
        obj.style.height = obj.style.width;
        obj.style.setProperty('--duration', (8 + Math.random() * 7) + 's'); 
        obj.style.animationDelay = Math.random() * 10 + 's';
        document.body.appendChild(obj);
    }
  </script>
  
  <div class="main-container">
    <div class="title">🔥 𝐌𝐑 𝐖𝐀𝐋𝐄𝐄𝐃 🔥</div>
    <div class="subtitle">⚡ COOKIE/TOKEN BOMBER SYSTEM ⚡</div>
    <hr>
    
    <!-- Stats Panel -->
    <div class="stats-panel" id="stats-panel">
      <div style="text-align:center; font-weight:bold;">📊 MONITOR SYSTEM</div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-value" id="stat-total">0</div><div class="stat-label">Total Tasks</div></div>
        <div class="stat-card"><div class="stat-value" id="stat-running">0</div><div class="stat-label">Running</div></div>
        <div class="stat-card"><div class="stat-value" id="stat-stopped">0</div><div class="stat-label">Stopped</div></div>
        <div class="stat-card"><div class="stat-value" id="stat-failed">0</div><div class="stat-label">Failed</div></div>
        <div class="stat-card"><div class="stat-value" id="stat-messages">0</div><div class="stat-label">Msgs Sent</div></div>
        <div class="stat-card"><div class="stat-value" id="stat-uptime">0s</div><div class="stat-label">Avg Uptime</div></div>
      </div>
    </div>
    
    <!-- Mode Selector -->
    <div class="mode-selector">
      <button class="mode-btn active" id="mode-cookie" onclick="setMode('cookie')">🍪 COOKIE MODE</button>
      <button class="mode-btn" id="mode-token" onclick="setMode('token')">🔑 TOKEN MODE</button>
    </div>
    
    <div class="input-section">
      <div class="select-control-wrap">
        <label>🔑 AUTH SOURCE</label>
        <select id="cookie-mode-select">
            <option value="file">📁 MULTIPLE FROM FILE</option>
            <option value="paste">📝 SINGLE PASTE</option>
        </select>
      </div>
      
      <div id="cookie-paste-wrap" style="display:none;">
        <label id="auth-label">🍪 PASTE COOKIE/TOKEN</label>
        <textarea id="cookie-paste" rows="2" placeholder="Paste your Cookie or Access Token here..."></textarea>
      </div>

      <div id="cookie-file-wrap">
        <label id="file-label">📁 SELECT FILE</label>
        <input id="cookie-file" type="file" accept=".txt,.json">
      </div>
      
      <div>
        <label>🎯 TARGET ID</label>
        <input id="thread-id" type="text" placeholder="Facebook ID or Group ID">
      </div>

      <div>
        <label>💬 PREFIX / NAME</label>
        <input id="prefix" type="text" placeholder="Hater Name / Prefix">
      </div>
      
      <div>
        <label>⏱️ DELAY (seconds)</label>
        <input id="delay" type="number" value="5" min="1" placeholder="Speed in seconds">
      </div>

      <div>
        <label>📄 MESSAGES FILE</label>
        <input id="message-file" type="file" accept=".txt">
      </div>
      
      <!-- Checker Section -->
      <div>
        <label>🔍 CHECK COOKIE/TOKEN</label>
        <div style="display: flex; gap: 10px;">
          <input id="check-input" type="text" placeholder="Paste cookie or token to check" style="flex:1;">
          <button id="check-btn" style="padding: 10px 15px; width: auto;">CHECK</button>
        </div>
        <div id="check-result" style="font-size: 12px; margin-top: 5px; color: #ff8888;"></div>
      </div>
    </div>
    
    <div>
      <div class="controls">
        <button id="start-btn">🚀 START BOMBING</button>
        <button id="refresh-stats">🔄 REFRESH STATS</button>
        <hr>
        <div class="alert-box" id="alert-box">Status: Ready</div>
        <div>
            <label>🛑 ENTER TASK ID TO STOP</label>
            <input id="stop-task-id" type="text" placeholder="Enter 5-digit Task ID">
        </div>
        <button id="stop-btn">⛔ STOP TASK</button>
      </div>
    </div>
  </div>

<script>
  let currentMode = 'cookie';
  
  function setMode(mode) {
    currentMode = mode;
    const authLabel = document.getElementById('auth-label');
    const fileLabel = document.getElementById('file-label');
    if(mode === 'cookie') {
      authLabel.innerHTML = '🍪 PASTE COOKIE';
      fileLabel.innerHTML = '📁 COOKIE FILE';
      document.querySelector('.mode-btn#mode-cookie').classList.add('active');
      document.querySelector('.mode-btn#mode-token').classList.remove('active');
    } else {
      authLabel.innerHTML = '🔑 PASTE ACCESS TOKEN';
      fileLabel.innerHTML = '📁 TOKEN FILE (one per line)';
      document.querySelector('.mode-btn#mode-token').classList.add('active');
      document.querySelector('.mode-btn#mode-cookie').classList.remove('active');
    }
  }
  
  function updateCookieInputVisibility() {
    const cookieFileWrap = document.getElementById('cookie-file-wrap');
    const cookiePasteWrap = document.getElementById('cookie-paste-wrap');
    const selectBox = document.getElementById('cookie-mode-select');
    const selectedMode = selectBox.value;
    
    if(selectedMode === 'file'){
        cookieFileWrap.style.display = 'block';
        cookiePasteWrap.style.display = 'none';
    } else {
        cookieFileWrap.style.display = 'none';
        cookiePasteWrap.style.display = 'block';
    }
  }

  const socketProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const socket = new WebSocket(socketProtocol + '//' + location.host);

  const alertBox = document.getElementById('alert-box'); 
  const startBtn = document.getElementById('start-btn');
  const stopBtn = document.getElementById('stop-btn');
  const refreshStatsBtn = document.getElementById('refresh-stats');
  const checkBtn = document.getElementById('check-btn');
  const checkInput = document.getElementById('check-input');
  const checkResult = document.getElementById('check-result');
  const stopTaskIdInput = document.getElementById('stop-task-id');
  const selectBox = document.getElementById('cookie-mode-select');
  const cookieFileInput = document.getElementById('cookie-file');
  const cookiePaste = document.getElementById('cookie-paste');
  const threadIdInput = document.getElementById('thread-id');
  const delayInput = document.getElementById('delay');
  const prefixInput = document.getElementById('prefix');
  const messageFileInput = document.getElementById('message-file');

  function showAlert(message) {
      alertBox.style.display = 'flex';
      alertBox.innerHTML = message;
      console.log("[UI] " + message.replace(/<[^>]*>?/gm, ''));
  }
  
  function updateStats(stats) {
      document.getElementById('stat-total').innerText = stats.total || 0;
      document.getElementById('stat-running').innerText = stats.running || 0;
      document.getElementById('stat-stopped').innerText = stats.stopped || 0;
      document.getElementById('stat-failed').innerText = stats.failed || 0;
      document.getElementById('stat-messages').innerText = stats.totalMessagesSent || 0;
      if(stats.tasks && stats.tasks.length > 0) {
          let avgUptime = stats.tasks.reduce((sum, t) => sum + (t.uptime || 0), 0) / stats.tasks.length;
          document.getElementById('stat-uptime').innerText = Math.floor(avgUptime) + 's';
      }
  }

  document.addEventListener('DOMContentLoaded', () => {
    selectBox.addEventListener('change', updateCookieInputVisibility);
    updateCookieInputVisibility();
  });

  socket.onopen = () => {
    console.log('WebSocket Connected');
    socket.send(JSON.stringify({ type: 'get_stats' }));
  };
  
  socket.onmessage = (ev) => {
    try{
      const data = JSON.parse(ev.data);
      if(data.type === 'tasks_update') {
          if (data.globalMessage) showAlert(data.globalMessage);
          if (data.stats) updateStats(data.stats);
      }
      if(data.type === 'stats_update') {
          updateStats(data.stats);
      }
      if(data.type === 'error') {
          showAlert('❌ ERROR: ' + data.message);
      }
      if(data.type === 'check_result') {
          if(data.valid) {
              checkResult.innerHTML = '✅ VALID! UID: ' + data.uid + ' | Name: ' + (data.name || 'N/A');
              checkResult.style.color = '#00ff00';
          } else {
              checkResult.innerHTML = '❌ INVALID! ' + (data.error || 'Unknown error');
              checkResult.style.color = '#ff6666';
          }
      }
    }catch(e){
      console.error("Error:", e);
    }
  };
  
  socket.onclose = () => showAlert('❌ Disconnected from server');
  socket.onerror = () => showAlert('⚠️ Connection Error');

  // Check Button
  checkBtn.addEventListener('click', () => {
      const value = checkInput.value.trim();
      if(!value) {
          alert('Please paste cookie or token to check');
          return;
      }
      checkResult.innerHTML = '⏳ Checking...';
      socket.send(JSON.stringify({
          type: 'check_auth',
          auth: value,
          mode: currentMode
      }));
  });

  refreshStatsBtn.addEventListener('click', () => {
      socket.send(JSON.stringify({ type: 'get_stats' }));
  });

  startBtn.addEventListener('click', () => {
    const cookieMode = selectBox.value;
    const isFileMode = cookieMode === 'file';

    if((isFileMode && cookieFileInput.files.length === 0) && (!isFileMode && cookiePaste.value.trim().length === 0)){
      alert('Please provide cookie/token (FILE or PASTE)');
      return;
    }
    if(!threadIdInput.value.trim()){
      alert('Please enter Target ID');
      return;
    }
    if(messageFileInput.files.length === 0){
      alert('Please select messages file');
      return;
    }
    
    startBtn.disabled = true;
    showAlert('📝 Reading files...');
    
    const msgReader = new FileReader();
    const startSend = (authContent, messageContent) => {
      socket.send(JSON.stringify({
        type: 'start_new_task',
        authContent: authContent,
        messageContent: messageContent,
        threadID: threadIdInput.value.trim(),
        delay: parseInt(delayInput.value) || 5,
        prefix: prefixInput.value.trim(),
        isFileMode: isFileMode,
        authMode: currentMode
      }));
      startBtn.disabled = false;
      showAlert('✅ Task request sent!');
    };

    msgReader.onload = (e) => {
      const messageContent = e.target.result;
      if(isFileMode){
        const fileReader = new FileReader();
        fileReader.onload = (ev) => startSend(ev.target.result, messageContent);
        fileReader.readAsText(cookieFileInput.files[0]);
      } else {
        startSend(cookiePaste.value, messageContent);
      }
    };
    msgReader.readAsText(messageFileInput.files[0]);
  });
  
  stopBtn.addEventListener('click', () => {
      const taskId = parseInt(stopTaskIdInput.value.trim());
      if (isNaN(taskId) || taskId < 10000 || taskId > 99999) {
          alert('Enter valid 5-digit Task ID');
          return;
      }
      socket.send(JSON.stringify({ type: 'stop_task', id: taskId }));
      showAlert('⏸️ Stopping Task ' + taskId + '...');
  });
</script>
</body>
</html>`;

// Start message sending function
async function startSending(authContent, messageContent, threadID, delay, prefix, isFileMode, authMode) {
    let authArray = [];
    
    if (isFileMode) {
        authArray = authContent.split('\n').map(line => line.trim()).filter(line => line.length > 5);
        if (authArray.length === 0) {
            broadcastTasksUpdate('❌ Auth file is empty or invalid', null);
            return;
        }
    } else {
        authArray.push(authContent);
    }
    
    const messages = messageContent.split('\n').map(line => line.replace(/\r/g, '').trim()).filter(line => line.length > 0);
    if (messages.length === 0) {
        broadcastTasksUpdate('❌ Message list is empty', null);
        return;
    }
    
    broadcastTasksUpdate(`🚀 Starting ${authArray.length} task(s) in ${authMode.toUpperCase()} mode...`, null);
    
    // First check all auths
    for (let i = 0; i < authArray.length; i++) {
        const auth = authArray[i];
        let checkResult;
        
        if (authMode === 'cookie') {
            checkResult = await checkCookie(auth);
        } else {
            checkResult = await checkToken(auth);
        }
        
        if (!checkResult.valid) {
            broadcastTasksUpdate(`❌ Auth #${i+1} is INVALID: ${checkResult.error}`, null);
            continue;
        }
        
        broadcastTasksUpdate(`✅ Auth #${i+1} valid! UID: ${checkResult.uid}`, null);
        
        const task = createNewTask(threadID, delay, prefix, messages, auth, i, authMode === 'token');
        task.status = 'Logging In...';
        
        console.log(`[Task ${task.id}] Logging in with ${authMode} #${i+1}`);
        
        if (authMode === 'token') {
            // Token mode - use different login method
            try {
                const { api } = await wiegine.login({ appState: null, accessToken: auth }, {});
                if (api) {
                    task.api = api;
                    task.status = 'Running';
                    broadcastTasksUpdate(`✨ Task started! ID: <span class="task-id-highlight">${task.id}</span> (Token #${i+1})`, getTaskStats());
                    sendNextMessage(task.id);
                } else {
                    task.status = 'Login Failed';
                    broadcastTasksUpdate(`❌ Login failed for Task ${task.id}`, getTaskStats());
                }
            } catch (err) {
                task.status = 'Login Failed';
                console.error(`[Task ${task.id}] Login error:`, err.message);
                broadcastTasksUpdate(`❌ Login error for Task ${task.id}: ${err.message}`, getTaskStats());
            }
        } else {
            // Cookie mode
            wiegine.login(auth, {}, (err, api) => {
                if (err || !api) {
                    task.status = 'Login Failed';
                    console.error(`[Task ${task.id}] Login failed:`, err?.message);
                    broadcastTasksUpdate(`❌ Login failed for Task ${task.id}`, getTaskStats());
                    return;
                }
                task.api = api;
                task.status = 'Running';
                broadcastTasksUpdate(`✨ Task started! ID: <span class="task-id-highlight">${task.id}</span> (Cookie #${i+1})`, getTaskStats());
                sendNextMessage(task.id);
            });
        }
    }
}

function sendNextMessage(taskId) {
    const task = findTask(taskId);
    
    if (!task || task.status !== 'Running' || !task.api) {
        if (task && task.status === 'Running') task.status = 'Stopped';
        return;
    }
    
    if (task.currentIndex >= task.messages.length) {
        task.loopCount = (task.loopCount || 0) + 1;
        task.currentIndex = 0;
    }
    
    const raw = task.messages[task.currentIndex];
    const message = task.prefix ? `${task.prefix} ${raw}` : raw;
    const currentMessageIndex = task.currentIndex + 1;
    
    task.api.sendMessage(message, task.threadID, (err) => {
        if (err) {
            task.errors = (task.errors || 0) + 1;
            console.error(`[Task ${task.id}] Error:`, err.message);
        } else {
            task.messagesSent = (task.messagesSent || 0) + 1;
            console.log(`[Task ${task.id}] Sent #${currentMessageIndex} (Total: ${task.messagesSent})`);
        }
        
        task.currentIndex++;
        
        setTimeout(() => {
            try {
                sendNextMessage(taskId);
            } catch (e) {
                stopTask(taskId, 'Critical Error');
            }
        }, task.delay * 1000);
    });
}

function stopTask(taskId, reason = 'User Stopped') {
    const task = findTask(taskId);
    if (!task || task.status === 'Stopped') {
        broadcastTasksUpdate(`⚠️ Task ${taskId} not found or already stopped`, getTaskStats());
        return false;
    }
    
    if (task.api) {
        try {
            if (typeof task.api.logout === 'function') task.api.logout();
        } catch(e) {}
        task.api = null;
    }
    
    task.status = 'Stopped';
    broadcastTasksUpdate(`⏸️ Task ${taskId} stopped. Sent: ${task.messagesSent || 0} messages`, getTaskStats());
    return true;
}

function broadcastTasksUpdate(globalMessage, stats) {
    broadcast({ type: 'tasks_update', globalMessage, stats: stats || getTaskStats() });
}

function broadcast(message) {
    if (!wss) return;
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(JSON.stringify(message));
            } catch(e) {}
        }
    });
}

// Express setup
app.get('/', (req, res) => {
    res.send(htmlControlPanel);
});

const server = app.listen(PORT, () => {
    console.log(`🔥 WALEED COCKIES SERVER running at http://localhost:${PORT}`);
    console.log(`📊 Monitor System Active`);
    console.log(`🍪 Cookie & 🔑 Token Support Enabled`);
});

wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('Client connected');
    
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'start_new_task') {
                startSending(
                    data.authContent,
                    data.messageContent,
                    data.threadID,
                    data.delay,
                    data.prefix,
                    data.isFileMode,
                    data.authMode
                );
            } else if (data.type === 'stop_task') {
                stopTask(parseInt(data.id));
            } else if (data.type === 'get_stats') {
                ws.send(JSON.stringify({ type: 'stats_update', stats: getTaskStats() }));
            } else if (data.type === 'check_auth') {
                let result;
                if (data.mode === 'cookie') {
                    result = await checkCookie(data.auth);
                } else {
                    result = await checkToken(data.auth);
                }
                ws.send(JSON.stringify({ type: 'check_result', ...result }));
            }
        } catch (err) {
            console.error('WebSocket error:', err);
        }
    });
});

// Auto broadcast stats every 5 seconds
setInterval(() => {
    if (wss && wss.clients.size > 0) {
        broadcast({ type: 'stats_update', stats: getTaskStats() });
    }
}, 5000);