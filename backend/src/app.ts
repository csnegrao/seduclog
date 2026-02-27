import express from 'express';
import authRouter from './routes/auth.routes';
import requestRouter from './routes/request.routes';

const app = express();

app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/requests', requestRouter);

// Health-check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default app;
