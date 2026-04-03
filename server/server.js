const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/pricing', require('./routes/pricing'));

app.get('/api/health', (req, res) => {
  const readyStateLabels = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  res.json({
    status: readyStateLabels[require('mongoose').connection.readyState] === 'connected' ? 'ok' : 'degraded',
    message: 'User profile and role management API is running',
    database: readyStateLabels[require('mongoose').connection.readyState] || 'unknown'
  });
});

const PORT = process.env.PORT || 5001;
const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(
          `Port ${PORT} is already in use. Stop the existing process or change PORT in server/.env before restarting.`
        );
        process.exit(1);
      }

      throw error;
    });
  } catch (error) {
    console.error(`Startup failed: ${error.message}`);
    process.exit(1);
  }
};

startServer();


