import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { errorHandler, notFound } from './middleware/errorHandler';
import { authLimiter, apiLimiter } from './middleware/rateLimiter';

import authRoutes from './routes/auth.routes';
import requestsRoutes from './routes/requests.routes';
import stockRoutes from './routes/stock.routes';

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/requests', apiLimiter, requestsRoutes);
app.use('/api/stock', apiLimiter, stockRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
