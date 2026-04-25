const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const setupSocket = require('./socket/socketHandler');
const { generalLimiter } = require('./middleware/rateLimiter');
const { sanitize } = require('./middleware/sanitize');

// Routes
const authRoutes = require('./routes/authRoutes');
const broadcastRoutes = require('./routes/broadcastRoutes');
const userRoutes = require('./routes/userRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();
const server = http.createServer(app);

// Dynamic CORS origin
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const io = new Server(server, {
  cors: { origin: CLIENT_URL, methods: ['GET', 'POST', 'PUT'], credentials: true },
});

app.set('io', io);

// ===== SECURITY MIDDLEWARE =====
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));
app.use(sanitize()); // Custom NoSQL injection sanitizer (Express 5 compatible)
app.use(generalLimiter);

// Trust proxy (Render/Vercel behind a reverse proxy)
app.set('trust proxy', 1);

// ===== ROUTES =====
app.use('/api/auth', authRoutes);
app.use('/api/broadcast', broadcastRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV || 'development', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// Socket.io
setupSocket(io);

// Start
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });
});
