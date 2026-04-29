const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth, generateAccessToken, generateRefreshToken } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../validators/authSchemas');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Helper: set refresh token as httpOnly cookie
const setRefreshCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
};

// Helper: format user response
const formatUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  year: user.year,
  department: user.department,
  interests: user.interests,
});

// @route   POST /api/auth/register
// @access  Public
router.post('/register', authLimiter, validate(registerSchema), async (req, res) => {
  try {
    const { name, email, password, role, year, department, interests } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const user = await User.create({
      name, email, password,
      role: role || 'student',
      year, department,
      interests: interests || [],
    });

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Store refresh token in DB for revocation
    await User.findByIdAndUpdate(user._id, { refreshToken });

    setRefreshCookie(res, refreshToken);

    res.status(201).json({
      accessToken,
      user: formatUser(user),
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/auth/login
// @access  Public
router.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password +refreshToken');
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    await User.findByIdAndUpdate(user._id, { refreshToken });

    setRefreshCookie(res, refreshToken);

    res.json({
      accessToken,
      user: formatUser(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/auth/refresh
// @desc    Get new access token using refresh token cookie
// @access  Public (cookie-based)
router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ message: 'No refresh token' });
    }

    // Verify the refresh token
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh');

    // Check it matches the one in DB (prevents reuse of old tokens)
    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== token) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Rotate: issue new tokens
    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    await User.findByIdAndUpdate(user._id, { refreshToken: newRefreshToken });

    setRefreshCookie(res, newRefreshToken);

    res.json({ accessToken: newAccessToken, user: formatUser(user) });
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
});

// @route   POST /api/auth/logout
// @desc    Clear refresh token
// @access  Private
router.post('/logout', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    res.clearCookie('refreshToken', { path: '/' });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/auth/me
// @access  Private
router.get('/me', auth, async (req, res) => {
  res.json({ user: formatUser(req.user) });
});

module.exports = router;
