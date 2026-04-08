const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const publicRoutes = require('./routes/publicRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const chatRoutes = require('./routes/chatRoutes');
const materialRoutes = require('./routes/materialRoutes');
const questionRoutes = require('./routes/questionRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || '*',
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'College Connect API is running',
  });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/public', publicRoutes);
app.use('/api/v1/announcements', announcementRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/materials', materialRoutes);
app.use('/api/v1/questions', questionRoutes);
app.use('/api/v1/leaderboard', leaderboardRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
