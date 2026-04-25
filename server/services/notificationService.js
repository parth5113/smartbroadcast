const Notification = require('../models/Notification');

/**
 * Sends notifications to matched users via Socket.io (real-time)
 * and stores all notifications in DB (for offline users to fetch later).
 */
const dispatchNotifications = async (io, matchedUsers, broadcast) => {
  const stats = { targeted: matchedUsers.length, delivered: 0, failed: 0 };

  const notificationPayload = {
    broadcastId: broadcast._id,
    title: `📢 ${broadcast.extractedEntities.urgency === 'high' ? 'URGENT: ' : ''}Broadcast`,
    body: broadcast.extractedEntities.summary || broadcast.rawMessage,
    urgency: broadcast.extractedEntities.urgency || 'medium',
    timestamp: new Date().toISOString(),
  };

  // Store notifications in DB for all users (persistent)
  const notificationDocs = matchedUsers.map(user => ({
    userId: user._id,
    broadcastId: broadcast._id,
    title: notificationPayload.title,
    body: notificationPayload.body,
    urgency: notificationPayload.urgency,
    deliveredVia: user.isOnline && user.socketId ? 'socket' : 'stored',
  }));

  try {
    await Notification.insertMany(notificationDocs);
  } catch (error) {
    console.error('❌ Failed to store notifications:', error.message);
  }

  // Send real-time notifications to online users via Socket.io
  for (const user of matchedUsers) {
    if (user.isOnline && user.socketId) {
      try {
        io.to(user.socketId).emit('notification', notificationPayload);
        stats.delivered++;
      } catch (error) {
        console.error(`❌ Socket delivery failed for ${user.name}:`, error.message);
        stats.failed++;
      }
    }
  }

  return stats;
};

module.exports = { dispatchNotifications };
