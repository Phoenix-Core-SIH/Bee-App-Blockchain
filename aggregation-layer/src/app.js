const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middleware/error');
const authRoutes = require('./routes/auth');
const kvicRoutes = require('./routes/kvic');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/kvic', kvicRoutes);

// Error Handling
app.use(errorHandler);

module.exports = app;
