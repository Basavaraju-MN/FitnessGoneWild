const express = require('express');
const cors = require('cors');

const trekRoutes = require('./routes/routes');

const app = express();
const path = require('path');

//Third-party libraries
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const routes = require('./routes/routes');
const app = express();
// Routes
app.use('/api/phonepe', routes);

app.use(cors({
  origin: 'http://localhost:5173',
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
