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

  // Priority & Category tags (Spec #2)
  priority: {
    type: String,
    enum: ['Urg', 'Imp', 'Gen'],
    default: 'Gen',
  },
  category: {
    type: String,
    enum: ['Academic', 'Event', 'Club', 'Alert', 'General'],
    default: 'General',
  },

  // Scheduling (Spec #7)
  scheduledAt: { type: Date, default: null },
  isScheduled: { type: Boolean, default: false },

  // A/B Testing (Spec #11)
  variantB: {
    rawMessage: { type: String, default: null },
    extractedEntities: { type: Object, default: null },
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
  },
  isABTest: { type: Boolean, default: false },

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
    enum: ['processing', 'sent', 'failed', 'no_matches', 'scheduled', 'cancelled'],
    default: 'processing',
  },
}, { timestamps: true });

broadcastSchema.index({ adminId: 1, createdAt: -1 });
broadcastSchema.index({ isScheduled: 1, scheduledAt: 1 });

module.exports = mongoose.model('Broadcast', broadcastSchema);
