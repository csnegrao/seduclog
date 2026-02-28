import express from 'express';
import helmet from 'helmet';
import authRouter from './routes/auth.routes';
import requestRouter from './routes/request.routes';
import warehouseRouter from './routes/warehouse.routes';
import driverRouter from './routes/driver.routes';
import reportsRouter from './routes/reports.routes';
import notificationsRouter from './routes/notifications.routes';
import messagesRouter from './routes/messages.routes';

const app = express();

// Security headers
app.use(helmet());

app.use(express.json({ limit: '2mb' }));

app.use('/api/auth', authRouter);
app.use('/api/requests', requestRouter);
app.use('/api/warehouse', warehouseRouter);
app.use('/api/driver', driverRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/messages', messagesRouter);

// Health-check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});
import cors from 'cors';
import { env } from './config/env';
import { errorHandler, notFound } from './middleware/errorHandler';
import { authLimiter, apiLimiter } from './middleware/rateLimiter';

import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import requestsRoutes from './routes/requests.routes';
import ordersRoutes from './routes/orders.routes';
import deliveriesRoutes from './routes/deliveries.routes';
import stockRoutes from './routes/stock.routes';

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' })); // large limit for signature data
app.use(express.urlencoded({ extended: true }));

// Health check (no rate limiting needed)
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', apiLimiter, usersRoutes);
app.use('/api/requests', apiLimiter, requestsRoutes);
app.use('/api/orders', apiLimiter, ordersRoutes);
app.use('/api/deliveries', apiLimiter, deliveriesRoutes);
app.use('/api/stock', apiLimiter, stockRoutes);

// 404 and error handling
app.use(notFound);
app.use(errorHandler);

export default app;
