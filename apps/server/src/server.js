const express = require('express');
const cors = require('cors');

const trekRoutes = require('./routes/routes');

const app = express();

const PORT = 4000;

app.use(cors({
  origin: 'http://localhost:5173' || process.env.CLIENT_URL || 'http://localhost:5174',
  credentials: true,
}));

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Node.js server is running',
  });
});

app.use('/api', trekRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});