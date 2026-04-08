const Message = require('../models/Message');

const initChatSocket = (io) => {
  io.on('connection', (socket) => {
    socket.on('join_section', ({ branchId, year }) => {
      if (!branchId || !year) {
        return;
      }

      socket.join(`${branchId}_${year}`);
    });

    socket.on('send_message', async (payload) => {
      try {
        const { branchId, year, senderId, content, type = 'text', fileUrl = '', fileName = '' } = payload;

        if (!branchId || !year || !senderId || (!content && !fileUrl)) {
          return;
        }

        const message = await Message.create({
          branch: branchId,
          year: Number(year),
          sender: senderId,
          content: content || '',
          type,
          fileUrl,
          fileName,
        });

        const populatedMessage = await Message.findById(message._id).populate('sender', 'name email role');
        io.to(`${branchId}_${year}`).emit('receive_message', populatedMessage);
      } catch (error) {
        socket.emit('chat_error', { message: 'Unable to send message' });
      }
    });
  });
};

module.exports = initChatSocket;
