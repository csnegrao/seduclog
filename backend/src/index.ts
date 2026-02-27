import 'dotenv/config';
import http from 'http';
import app from './app';
import { env } from './config/env';
import { initSocket } from './services/socket.service';

const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.listen(env.PORT, () => {
  console.log(`🚀 Seduclog API running on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  process.exit(1);
});
