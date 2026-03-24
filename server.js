const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Store connected users and messages
let connectedUsers = [];
let messages = [];

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Simple chat page without login
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    // Assign user number
    let userNumber = null;
    
    if (connectedUsers.length === 0) {
        userNumber = 1;
        socket.user = { id: socket.id, name: 'User 1', number: 1 };
        connectedUsers.push(socket.user);
        socket.emit('user-assigned', { name: 'User 1', number: 1 });
    } else if (connectedUsers.length === 1) {
        userNumber = 2;
        socket.user = { id: socket.id, name: 'User 2', number: 2 };
        connectedUsers.push(socket.user);
        socket.emit('user-assigned', { name: 'User 2', number: 2 });
    } else {
        // Room is full
        socket.emit('room-full', { message: 'Chat room is full. Only 2 users allowed.' });
        socket.disconnect();
        return;
    }
    
    console.log(`${socket.user.name} joined. Total users: ${connectedUsers.length}`);
    
    // Notify both users about who is connected
    io.emit('users-update', {
        users: connectedUsers.map(u => ({ name: u.name, id: u.id })),
        count: connectedUsers.length
    });
    
    // Send welcome message
    if (connectedUsers.length === 2) {
        io.emit('system-message', { 
            text: '🎉 Both users are connected! Start chatting!',
            type: 'success'
        });
    } else {
        socket.emit('system-message', { 
            text: '✨ Welcome! Waiting for the other user to connect...',
            type: 'info'
        });
    }
    
    // Send previous messages to new user
    if (messages.length > 0) {
        socket.emit('previous-messages', messages);
    }
    
    // Handle messages
    socket.on('send-message', (messageData) => {
        if (connectedUsers.length === 2) {
            const message = {
                id: Date.now(),
                text: messageData.text,
                username: socket.user.name,
                timestamp: new Date().toISOString(),
                userId: socket.user.id
            };
            
            messages.push(message);
            io.emit('new-message', message);
            console.log(`${socket.user.name}: ${messageData.text}`);
        } else {
            socket.emit('system-message', { 
                text: '⚠️ Waiting for second user to connect...',
                type: 'warning'
            });
        }
    });
    
    // Handle typing indicator
    socket.on('typing', (isTyping) => {
        if (connectedUsers.length === 2) {
            socket.broadcast.emit('user-typing', {
                username: socket.user.name,
                isTyping: isTyping
            });
        }
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
        const index = connectedUsers.findIndex(u => u.id === socket.id);
        if (index !== -1) {
            const disconnectedUser = connectedUsers[index];
            connectedUsers.splice(index, 1);
            
            console.log(`${disconnectedUser.name} disconnected`);
            
            io.emit('system-message', { 
                text: `⚠️ ${disconnectedUser.name} has left the chat. Waiting for reconnection...`,
                type: 'warning'
            });
            
            io.emit('users-update', {
                users: connectedUsers.map(u => ({ name: u.name, id: u.id })),
                count: connectedUsers.length
            });
            
            // Clear messages when both users disconnect
            if (connectedUsers.length === 0) {
                messages = [];
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Simple 2-User Chat - No Login Required');
});