const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const apiRouter = require('./routes/api');

const app = express();
const PORT = 3001;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors());
app.use(express.json());
app.use('/api', limiter);
app.use('/api', apiRouter);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
