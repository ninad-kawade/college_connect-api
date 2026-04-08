const http = require('http');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

dotenv.config();

const app = require('./src/app');
const connectDB = require('./src/config/db');
const seedSuperAdmin = require('./src/services/seedSuperAdmin');
const initChatSocket = require('./src/socket/chatSocket');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  await seedSuperAdmin();

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      credentials: true,
    },
  });

  app.set('io', io);
  initChatSocket(io);

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
