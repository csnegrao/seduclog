require('dotenv').config();
const express = require('express');
const cors = require('cors');
const trackingRoutes = require('./routes/tracking');
const notificationRoutes = require('./routes/notifications');

const app = express();

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({ origin: frontendUrl, credentials: true }));
app.use(express.json());

app.use('/api/requests', trackingRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

module.exports = app;
