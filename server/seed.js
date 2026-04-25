const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./models/User');

const seedUsers = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clear existing
  await User.deleteMany({});
  console.log('Cleared users');

  const users = [
    // Admin
    { name: 'Admin User', email: 'admin@smart.edu', password: 'admin123', role: 'admin', year: null, department: null, interests: [] },
    // Students
    { name: 'Aarav Sharma', email: 'aarav@smart.edu', password: 'pass123', role: 'student', year: 1, department: 'AIDS', interests: ['dance', 'music'], location: { type: 'Point', coordinates: [80.0424, 12.9716] } },
    { name: 'Priya Patel', email: 'priya@smart.edu', password: 'pass123', role: 'student', year: 1, department: 'AIDS', interests: ['coding', 'dance'], location: { type: 'Point', coordinates: [80.0425, 12.9717] } },
    { name: 'Rohan Gupta', email: 'rohan@smart.edu', password: 'pass123', role: 'student', year: 2, department: 'CSE', interests: ['robotics', 'coding'], location: { type: 'Point', coordinates: [80.0418, 12.9710] } },
    { name: 'Sneha Reddy', email: 'sneha@smart.edu', password: 'pass123', role: 'student', year: 1, department: 'AIDS', interests: ['photography', 'dance'], location: { type: 'Point', coordinates: [80.0430, 12.9720] } },
    { name: 'Vikram Singh', email: 'vikram@smart.edu', password: 'pass123', role: 'student', year: 3, department: 'ECE', interests: ['sports', 'music'], location: { type: 'Point', coordinates: [80.0410, 12.9725] } },
    { name: 'Ananya Das', email: 'ananya@smart.edu', password: 'pass123', role: 'student', year: 2, department: 'AIML', interests: ['dance', 'coding'], location: { type: 'Point', coordinates: [80.0435, 12.9712] } },
    { name: 'Karthik Nair', email: 'karthik@smart.edu', password: 'pass123', role: 'student', year: 4, department: 'ME', interests: ['sports', 'robotics'], location: { type: 'Point', coordinates: [80.0422, 12.9718] } },
    { name: 'Divya Iyer', email: 'divya@smart.edu', password: 'pass123', role: 'student', year: 1, department: 'CSE', interests: ['music', 'photography'], location: { type: 'Point', coordinates: [80.0426, 12.9714] } },
    { name: 'Arjun Kumar', email: 'arjun@smart.edu', password: 'pass123', role: 'student', year: 3, department: 'AIDS', interests: ['coding', 'dance'], location: { type: 'Point', coordinates: [80.0428, 12.9708] } },
  ];

  for (const u of users) {
    await User.create(u);
  }

  console.log(`Seeded ${users.length} users`);
  console.log('Admin login: admin@smart.edu / admin123');
  await mongoose.disconnect();
};

seedUsers().catch(err => { console.error(err); process.exit(1); });
