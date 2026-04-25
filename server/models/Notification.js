const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  broadcastId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Broadcast',
    required: true,
  },
  title: { type: String, required: true },
  body: { type: String, required: true },
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  read: { type: Boolean, default: false },
  readAt: { type: Date, default: null },
  deliveredVia: {
    type: String,
    enum: ['socket', 'stored'],
    default: 'stored',
  },
  // Relevance feedback: null = not voted, true = relevant, false = irrelevant
  relevant: { type: Boolean, default: null },
}, { timestamps: true });

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ broadcastId: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
