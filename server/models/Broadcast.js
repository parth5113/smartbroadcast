const mongoose = require('mongoose');

const broadcastSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  rawMessage: {
    type: String,
    required: [true, 'Message is required'],
  },
  extractedEntities: {
    year: Number,
    department: String,
    interests: [String],
    location: {
      label: String,
      latitude: Number,
      longitude: Number,
      radiusKm: Number,
    },
    urgency: { type: String, enum: ['low', 'medium', 'high'] },
    summary: String,
  },
  mongoQuery: { type: Object },
  matchedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  deliveryStats: {
    targeted: { type: Number, default: 0 },
    delivered: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
  },
  engagementStats: {
    readCount: { type: Number, default: 0 },
    relevantCount: { type: Number, default: 0 },
    irrelevantCount: { type: Number, default: 0 },
  },
  status: {
    type: String,
    enum: ['processing', 'sent', 'failed', 'no_matches'],
    default: 'processing',
  },
}, { timestamps: true });

broadcastSchema.index({ adminId: 1, createdAt: -1 });

module.exports = mongoose.model('Broadcast', broadcastSchema);
