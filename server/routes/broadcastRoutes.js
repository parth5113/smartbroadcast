const express = require('express');
const { auth, adminOnly } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { broadcastMessageSchema, entitySchema } = require('../validators/broadcastSchemas');
const { broadcastLimiter } = require('../middleware/rateLimiter');
const { extractEntities } = require('../services/intelligenceService');
const { findMatchingUsers } = require('../services/matchingService');
const { dispatchNotifications } = require('../services/notificationService');
const Broadcast = require('../models/Broadcast');

const router = express.Router();

// @route   POST /api/broadcast
// @desc    Admin sends a natural language broadcast
// @access  Private (Admin only)
router.post('/', auth, adminOnly, broadcastLimiter, validate(broadcastMessageSchema), async (req, res) => {
  try {
    const { message } = req.body;

    // Step 1: Extract entities using AI
    console.log('🧠 Extracting entities from:', message);
    const { entities, mode } = await extractEntities(message);

    // Validate AI output with Zod (prevent malformed data from crashing matching)
    const parsed = entitySchema.safeParse(entities);
    const safeEntities = parsed.success ? parsed.data : {
      year: null, department: null, interests: [], location: null, urgency: 'medium', summary: message.substring(0, 120),
    };

    console.log(`📋 Entities (${mode}):`, JSON.stringify(safeEntities, null, 2));

    // Step 2: Create broadcast record
    const broadcast = await Broadcast.create({
      adminId: req.user._id,
      rawMessage: message,
      extractedEntities: safeEntities,
      status: 'processing',
    });

    // Step 3: Find matching users
    const { users: matchedUsers, query, count } = await findMatchingUsers(safeEntities);
    console.log(`👥 Found ${count} matching users`);

    broadcast.mongoQuery = query;
    broadcast.matchedUsers = matchedUsers.map(u => u._id);

    if (count === 0) {
      broadcast.status = 'no_matches';
      broadcast.deliveryStats = { targeted: 0, delivered: 0, failed: 0 };
      await broadcast.save();

      return res.json({
        message: 'No matching users found for this broadcast',
        broadcast: { id: broadcast._id, entities: safeEntities, matchedCount: 0, status: 'no_matches' },
      });
    }

    // Step 4: Dispatch notifications
    const io = req.app.get('io');
    const stats = await dispatchNotifications(io, matchedUsers, broadcast);

    // Step 5: Save final stats
    broadcast.deliveryStats = stats;
    broadcast.status = 'sent';
    await broadcast.save();

    console.log(`✅ Broadcast sent: ${stats.targeted} targeted, ${stats.delivered} delivered real-time`);

    res.json({
      message: 'Broadcast sent successfully',
      broadcast: { id: broadcast._id, entities: safeEntities, matchedCount: count, deliveryStats: stats, status: 'sent' },
    });
  } catch (error) {
    console.error('❌ Broadcast error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/broadcast/history
router.get('/history', auth, adminOnly, async (req, res) => {
  try {
    const broadcasts = await Broadcast.find({ adminId: req.user._id })
      .sort({ createdAt: -1 }).limit(50).populate('adminId', 'name email');
    res.json({ broadcasts });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/broadcast/stats
router.get('/stats', auth, adminOnly, async (req, res) => {
  try {
    const totalBroadcasts = await Broadcast.countDocuments({ adminId: req.user._id });
    const sentBroadcasts = await Broadcast.countDocuments({ adminId: req.user._id, status: 'sent' });
    const failedBroadcasts = await Broadcast.countDocuments({ adminId: req.user._id, status: 'failed' });

    const aggregation = await Broadcast.aggregate([
      { $match: { adminId: req.user._id } },
      { $group: { _id: null, totalTargeted: { $sum: '$deliveryStats.targeted' }, totalDelivered: { $sum: '$deliveryStats.delivered' } } },
    ]);

    const stats = aggregation[0] || { totalTargeted: 0, totalDelivered: 0 };

    res.json({ totalBroadcasts, sentBroadcasts, failedBroadcasts, totalTargeted: stats.totalTargeted, totalDelivered: stats.totalDelivered });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
