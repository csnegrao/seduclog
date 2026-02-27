const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const notificationRoutes = require('./routes/notifications');
const messageRoutes = require('./routes/messages');
const requestRoutes = require('./routes/requests');
const orderRoutes = require('./routes/orders');
const stockRoutes = require('./routes/stock');

// General API rate limiter: 100 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// Stricter limiter for auth endpoints to slow brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' },
});

function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
  app.use(express.json());

  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/notifications', apiLimiter, notificationRoutes);
  app.use('/api/messages', apiLimiter, messageRoutes);
  app.use('/api/requests', apiLimiter, requestRoutes);
  app.use('/api/orders', apiLimiter, orderRoutes);
  app.use('/api/stock', apiLimiter, stockRoutes);

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  return app;
}

module.exports = createApp;
