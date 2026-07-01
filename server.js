const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./db');
const { register, verifyOTP } = require('./authController');

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Base Route to check if server is running
app.get('/', (req, res) => {
    res.send('RandomChat API is running successfully...');
});

// Authentication API Endpoints
app.post('/api/auth/register', register);
app.post('/api/auth/verify-otp', verifyOTP);

// Server Port Configuration
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
