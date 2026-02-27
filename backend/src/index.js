require('dotenv').config();
const http = require('http');
const createApp = require('./app');
const setupSocket = require('./socket');

const app = createApp();
const server = http.createServer(app);
const io = setupSocket(server);

// Make io accessible in route handlers via req.app.get('io')
app.set('io', io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
