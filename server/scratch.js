require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await User.findOne({}).select('+password +refreshToken');
  if (!user) {
    console.log('No user found');
    process.exit(0);
  }
  console.log('Found user:', user.email);
  try {
    user.refreshToken = 'test_token';
    await user.save();
    console.log('User saved successfully');
  } catch (err) {
    console.error('Save error:', err);
  }
  process.exit(0);
}

run();
