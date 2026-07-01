const User = require('./User');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');

// Configure Email Transporter for sending OTP via Gmail
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS 
    }
});

// 1. REGISTER USER & SEND OTP
exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user already exists in database
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // Generate a random 6-digit OTP string
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes

        // Create new user instance
        user = new User({
            name,
            email,
            password,
            otp,
            otpExpires
        });

        // Save user to MongoDB database
        await user.save();

        // Email layout setup
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'RandomChat - Verify Your Account',
            text: `Hello ${user.name},\n\nYour OTP for account verification is: ${otp}. It is valid for 10 minutes.\n\nRegards,\nRandomChat Team`
        };

        // Send email to the user
        await transporter.sendMail(mailOptions);

        res.status(201).json({ success: true, message: 'Registration successful. OTP sent to email.' });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. VERIFY OTP & GENERATE LOGIN SESSION
exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        // Find user by email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Verify if OTP matches and has not expired
        if (user.otp !== otp || user.otpExpires < Date.now()) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
        }

        // Clear OTP values after successful verification
        user.isVerified = true;
        user.otp = null;
        user.otpExpires = null;
        await user.save();

        // Generate JWT Token for login session persistence
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(200).json({
            success: true,
            message: 'OTP verified successfully. Login approved.',
            token,
            user: { id: user._id, name: user.name, email: user.email }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
            
