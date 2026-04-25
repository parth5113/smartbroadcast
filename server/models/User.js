const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false, // Don't return password by default
  },
  role: {
    type: String,
    enum: ['student', 'admin'],
    default: 'student',
  },

  // Refresh token for secure rotation
  refreshToken: {
    type: String,
    select: false,
  },

  // Academic profile
  year: {
    type: Number,
    enum: [1, 2, 3, 4],
  },
  department: {
    type: String,
    enum: ['CSE', 'AIML', 'AIDS', 'ECE', 'ME', 'CE', 'EEE', 'IT', 'BioTech'],
  },

  // Interests (lowercase tags)
  interests: [{
    type: String,
    lowercase: true,
    trim: true,
  }],

  // Geolocation — GeoJSON Point for $nearSphere queries
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      default: [0, 0], // [longitude, latitude]
    },
  },
  locationUpdatedAt: {
    type: Date,
  },

  // Socket.io session
  socketId: {
    type: String,
    default: null,
  },
  isOnline: {
    type: Boolean,
    default: false,
  },

}, { timestamps: true });

// 2dsphere index for geospatial queries
userSchema.index({ location: '2dsphere' });
// Compound index for fast attribute filtering
userSchema.index({ year: 1, department: 1 });

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
