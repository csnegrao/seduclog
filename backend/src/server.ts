import http from 'http';
import app from './app';
import { initSocket } from './utils/socket';

const PORT = process.env.PORT || 3001;
const server = http.createServer(app);

initSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
