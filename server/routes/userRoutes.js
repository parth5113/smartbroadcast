const express = require('express');
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { locationSchema, profileSchema, feedbackSchema } = require('../validators/broadcastSchemas');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Broadcast = require('../models/Broadcast');

const router = express.Router();

// @route   PUT /api/users/location
router.put('/location', auth, validate(locationSchema), async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    await User.findByIdAndUpdate(req.user._id, {
      location: { type: 'Point', coordinates: [longitude, latitude] },
      locationUpdatedAt: new Date(),
    });
    res.json({ message: 'Location updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/users/profile
router.put('/profile', auth, validate(profileSchema), async (req, res) => {
  try {
    const { name, year, department, interests } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (year) updates.year = year;
    if (department) updates.department = department;
    if (interests) updates.interests = interests;

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role, year: user.year, department: user.department, interests: user.interests },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/users/notifications
router.get('/notifications', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 }).limit(50);
    const unreadCount = await Notification.countDocuments({ userId: req.user._id, read: false });
    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/users/notifications/:id/read
router.put('/notifications/:id/read', auth, async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true, readAt: new Date() }
    );
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/users/notifications/read-all
router.put('/notifications/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, read: false },
      { read: true, readAt: new Date() }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/users/notifications/:id/feedback
// @desc    Rate notification relevance (👍/👎)
router.put('/notifications/:id/feedback', auth, validate(feedbackSchema), async (req, res) => {
  try {
    const { relevant } = req.body;
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { relevant },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Update broadcast engagement stats
    if (notification.broadcastId) {
      const relevantCount = await Notification.countDocuments({ broadcastId: notification.broadcastId, relevant: true });
      const irrelevantCount = await Notification.countDocuments({ broadcastId: notification.broadcastId, relevant: false });
      const readCount = await Notification.countDocuments({ broadcastId: notification.broadcastId, read: true });

      await Broadcast.findByIdAndUpdate(notification.broadcastId, {
        engagementStats: { readCount, relevantCount, irrelevantCount },
      });
    }

    res.json({ message: 'Feedback recorded', relevant });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
