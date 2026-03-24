const socket = io();

// DOM Elements
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const currentUserSpan = document.getElementById('current-user');
const waitingMessage = document.getElementById('waiting-message');
const typingIndicator = document.getElementById('typing-indicator');
const typingUserSpan = document.getElementById('typing-user');

// State variables
let currentUser = null;
let typingTimeout = null;
let isTyping = false;

// Socket event handlers
socket.on('user-assigned', (data) => {
    currentUser = data;
    currentUserSpan.textContent = `👤 ${data.name}`;
    console.log(`You are: ${data.name}`);
});

socket.on('room-full', (data) => {
    alert(data.message);
    document.body.innerHTML = '<div style="text-align:center;padding:50px"><h2>❌ Chat Room Full</h2><p>Only 2 users are allowed.</p></div>';
});

socket.on('users-update', (data) => {
    updateConnectionStatus(data.count);
    
    if (data.count === 2) {
        waitingMessage.style.display = 'none';
        messageInput.disabled = false;
        sendBtn.disabled = false;
        messageInput.focus();
    } else if (data.count === 1 && currentUser) {
        waitingMessage.style.display = 'block';
        messageInput.disabled = true;
        sendBtn.disabled = true;
    }
});

socket.on('system-message', (data) => {
    addSystemMessage(data.text, data.type);
});

socket.on('previous-messages', (messages) => {
    messages.forEach(message => {
        displayMessage(message);
    });
});

socket.on('new-message', (message) => {
    displayMessage(message);
});

socket.on('user-typing', (data) => {
    if (data.isTyping) {
        typingUserSpan.textContent = data.username;
        typingIndicator.style.display = 'block';
    } else {
        typingIndicator.style.display = 'none';
    }
});

// Display message
function displayMessage(message) {
    const isOwnMessage = message.userId === socket.id;
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwnMessage ? 'sent' : 'received'}`;
    
    const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <span class="message-username">${isOwnMessage ? 'You' : message.username}</span>
            <span class="message-time">${time}</span>
        </div>
        <div class="message-text">${escapeHtml(message.text)}</div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

function addSystemMessage(text, type = 'info') {
    const systemDiv = document.createElement('div');
    systemDiv.className = `system-message ${type}`;
    systemDiv.textContent = text;
    messagesContainer.appendChild(systemDiv);
    scrollToBottom();
}

function updateConnectionStatus(userCount) {
    if (userCount === 2) {
        statusIndicator.className = 'status-dot online';
        statusText.textContent = '2 users connected 🟢';
    } else if (userCount === 1) {
        statusIndicator.className = 'status-dot online';
        statusText.textContent = 'Waiting for second user... 🟡';
    } else {
        statusIndicator.className = 'status-dot';
        statusText.textContent = 'Disconnected ⚫';
    }
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Send message
function sendMessage() {
    const text = messageInput.value.trim();
    if (text && messageInput.disabled === false) {
        socket.emit('send-message', { text });
        messageInput.value = '';
        messageInput.focus();
        
        if (isTyping) {
            socket.emit('typing', false);
            isTyping = false;
        }
    }
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Typing indicator
messageInput.addEventListener('input', () => {
    if (!isTyping && messageInput.value.length > 0 && messageInput.disabled === false) {
        isTyping = true;
        socket.emit('typing', true);
    }
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        if (isTyping) {
            isTyping = false;
            socket.emit('typing', false);
        }
    }, 1000);
});

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}