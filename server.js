const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./db');
const { register, verifyOTP } = require('./authController');

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();
const server = http.createServer(app);

// Socket.io Setup with CORS configuration
const io = new Server(server, {
    cors: {
        origin: "*", // Allows connection from any frontend URL
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// Base Route
app.get('/', (req, res) => {
    res.send('RandomChat Realtime API is running successfully...');
});

// Authentication API Endpoints
app.post('/api/auth/register', register);
app.post('/api/auth/verify-otp', verifyOTP);

// Real-time Socket.io Logic for Chat & Notifications
let onlineUsers = {};

io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    // User joins with their user ID
    socket.on('join_user', (userId) => {
        onlineUsers[userId] = socket.id;
        io.emit('get_online_users', Object.keys(onlineUsers));
        console.log(`User ${userId} is now online.`);
    });

    // Send and Receive Private Message
    socket.on('send_message', (data) => {
        const { receiverId, senderId, text } = data;
        const receiverSocketId = onlineUsers[receiverId];
        
        if (receiverSocketId) {
            // Send live message to receiver
            io.to(receiverSocketId).emit('receive_message', data);
            // Send instant notification bar update
            io.to(receiverSocketId).emit('receive_notification', {
                senderId,
                text: `New message: ${text}`,
                type: 'message'
            });
        }
    });

    // Call Mute / Hold / Signaling status
    socket.on('call_signal', (data) => {
        const { receiverId, signalData, type } = data;
        const receiverSocketId = onlineUsers[receiverId];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('call_incoming', { signalData, from: data.senderId, type });
        }
    });

    // Disconnect User
    socket.on('disconnect', () => {
        for (let userId in onlineUsers) {
            if (onlineUsers[userId] === socket.id) {
                delete onlineUsers[userId];
                break;
            }
        }
        io.emit('get_online_users', Object.keys(onlineUsers));
        console.log(`User Disconnected: ${socket.id}`);
    });
});

// Update package.json scripts to use Server instead of app.listen
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Full-Stack Server running on port ${PORT}`);
});
                
