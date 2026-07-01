const User = require('./User');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');

// Configure Email Transporter (Use your Gmail or SMTP settings)
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER, // Your Gmail address in .env
        pass: process.env.EMAIL_PASS  // Your Gmail App Password in .env
    }
});

// 1. REGISTER & SEND OTP
exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes

        // Create new user (Password hashing can be added later using bcrypt)
        user = new User({
            name,
            email,
            password, // Storing plain text for now, will hash later
            otp,
            otpExpires
        });

        await user.save();

        // Send OTP via Email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'RandomChat - Verify Your Account',
            text: `Hello ${user.name},\n\nYour OTP for account verification is: ${otp}. It is valid for 10 minutes.\n\nRegards,\nRandomChat Team`
        };

        await transporter.sendMail(mailOptions);

        res.status(201).json({ success: true, message: 'Registration successful. OTP sent to email.' });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. VERIFY OTP & LOGIN
exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Check if OTP matches and is not expired
        if (user.otp !== otp || user.otpExpires < Date.now()) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
        }

        // Clear OTP after successful verification
        user.isVerified = true;
        user.otp = null;
        user.otpExpires = null;
        await user.save();

        // Generate JWT Token for login session
        const token = jwt.sign({ id: user._index }, process.env.JWT_SECRET, { expiresIn: '7d' });

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
          
