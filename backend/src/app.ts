import express from 'express';
import authRouter from './routes/auth.routes';

const app = express();

app.use(express.json());

app.use('/api/auth', authRouter);

// Health-check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default app;
