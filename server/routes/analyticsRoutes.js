const express = require('express');
const { auth, adminOnly } = require('../middleware/auth');
const Broadcast = require('../models/Broadcast');
const Notification = require('../models/Notification');
const User = require('../models/User');

const router = express.Router();

// @route   GET /api/analytics/dashboard
// @desc    Aggregated analytics for admin
// @access  Private (Admin only)
router.get('/dashboard', auth, adminOnly, async (req, res) => {
  try {
    const totalBroadcasts = await Broadcast.countDocuments({ adminId: req.user._id });
    const sentBroadcasts = await Broadcast.countDocuments({ adminId: req.user._id, status: 'sent' });
    const totalStudents = await User.countDocuments({ role: 'student' });

    // Aggregated delivery + engagement stats
    const agg = await Broadcast.aggregate([
      { $match: { adminId: req.user._id, status: 'sent' } },
      {
        $group: {
          _id: null,
          totalTargeted: { $sum: '$deliveryStats.targeted' },
          totalDelivered: { $sum: '$deliveryStats.delivered' },
          totalRead: { $sum: '$engagementStats.readCount' },
          totalRelevant: { $sum: '$engagementStats.relevantCount' },
          totalIrrelevant: { $sum: '$engagementStats.irrelevantCount' },
        },
      },
    ]);
    const stats = agg[0] || { totalTargeted: 0, totalDelivered: 0, totalRead: 0, totalRelevant: 0, totalIrrelevant: 0 };

    const readRate = stats.totalTargeted > 0 ? Math.round((stats.totalRead / stats.totalTargeted) * 100) : 0;
    const totalFeedback = stats.totalRelevant + stats.totalIrrelevant;
    const relevanceScore = totalFeedback > 0 ? Math.round((stats.totalRelevant / totalFeedback) * 100) : 0;

    // Department distribution (which depts get targeted most)
    const deptDist = await Broadcast.aggregate([
      { $match: { adminId: req.user._id, status: 'sent', 'extractedEntities.department': { $ne: null } } },
      { $group: { _id: '$extractedEntities.department', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Recent broadcasts with engagement (last 10)
    const recentBroadcasts = await Broadcast.find({ adminId: req.user._id, status: 'sent' })
      .sort({ createdAt: -1 }).limit(10)
      .select('rawMessage extractedEntities deliveryStats engagementStats createdAt');

    res.json({
      totalBroadcasts,
      sentBroadcasts,
      totalStudents,
      totalTargeted: stats.totalTargeted,
      totalDelivered: stats.totalDelivered,
      readRate,
      relevanceScore,
      totalFeedback,
      departmentDistribution: deptDist.map(d => ({ department: d._id, count: d.count })),
      recentBroadcasts,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/analytics/broadcast/:id
// @desc    Per-broadcast analytics
// @access  Private (Admin only)
router.get('/broadcast/:id', auth, adminOnly, async (req, res) => {
  try {
    const broadcast = await Broadcast.findById(req.params.id).populate('matchedUsers', 'name email department year');
    if (!broadcast) return res.status(404).json({ message: 'Broadcast not found' });

    const notifications = await Notification.find({ broadcastId: broadcast._id })
      .populate('userId', 'name email department year');

    const readReceipts = notifications
      .filter(n => n.read)
      .map(n => ({ user: n.userId, readAt: n.readAt }));

    const feedbackBreakdown = {
      relevant: notifications.filter(n => n.relevant === true).length,
      irrelevant: notifications.filter(n => n.relevant === false).length,
      noFeedback: notifications.filter(n => n.relevant === null).length,
    };

    res.json({
      broadcast,
      readReceipts,
      feedbackBreakdown,
      totalNotifications: notifications.length,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
