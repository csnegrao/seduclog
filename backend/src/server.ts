import 'dotenv/config';
import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app';
import { setSocketServer } from './utils/socket';

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: process.env.FRONTEND_URL ?? '*' },
});

setSocketServer(io);

const PORT = process.env.PORT ?? 3001;

httpServer.listen(PORT, () => {
  console.log(`Seduclog API listening on http://localhost:${PORT}`);
});
