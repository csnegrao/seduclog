import express from 'express';
import authRouter from './routes/auth.routes';
import requestRouter from './routes/request.routes';
import warehouseRouter from './routes/warehouse.routes';
import driverRouter from './routes/driver.routes';

const app = express();

app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/requests', requestRouter);
app.use('/api/warehouse', warehouseRouter);
app.use('/api/driver', driverRouter);

// Health-check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default app;
