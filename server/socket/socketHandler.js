const User = require('../models/User');

const setupSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('authenticate', async (userId) => {
      try {
        await User.findByIdAndUpdate(userId, { socketId: socket.id, isOnline: true });
        socket.userId = userId;
        console.log(`User ${userId} online on ${socket.id}`);
      } catch (err) { console.error('Socket auth error:', err.message); }
    });

    socket.on('disconnect', async () => {
      if (socket.userId) {
        try {
          await User.findByIdAndUpdate(socket.userId, { socketId: null, isOnline: false });
        } catch (err) { console.error('Disconnect error:', err.message); }
      }
    });

    socket.on('update_location', async (data) => {
      if (!socket.userId) return;
      try {
        await User.findByIdAndUpdate(socket.userId, {
          location: { type: 'Point', coordinates: [data.longitude, data.latitude] },
          locationUpdatedAt: new Date(),
        });
      } catch (err) { console.error('Location error:', err.message); }
    });
  });
};

module.exports = setupSocket;
