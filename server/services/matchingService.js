const User = require('../models/User');

/**
 * Builds a MongoDB query from extracted entities and finds matching users.
 * Only includes filter criteria for entities that were actually extracted (non-null).
 */
const findMatchingUsers = async (entities) => {
  const filter = { role: 'student' }; // Only target students

  // Year filter
  if (entities.year !== null && entities.year !== undefined) {
    filter.year = entities.year;
  }

  // Department filter
  if (entities.department !== null && entities.department !== undefined) {
    filter.department = entities.department;
  }

  // Interests filter — match users who have at least one matching interest
  if (entities.interests && entities.interests.length > 0) {
    filter.interests = { $in: entities.interests };
  }

  // Geospatial filter — find users near a location
  if (entities.location) {
    filter.location = {
      $nearSphere: {
        $geometry: {
          type: 'Point',
          coordinates: [entities.location.longitude, entities.location.latitude],
        },
        $maxDistance: (entities.location.radiusKm || 0.5) * 1000, // Convert km to meters
      },
    };
  }

  try {
    const users = await User.find(filter).select('_id name email socketId isOnline');
    return {
      users,
      query: filter,
      count: users.length,
    };
  } catch (error) {
    console.error('❌ Matching Engine Error:', error.message);
    
    // If geospatial query fails (e.g., no 2dsphere index), retry without location
    if (error.message.includes('2dsphere') || error.message.includes('near')) {
      console.log('⚠️ Retrying without geospatial filter...');
      delete filter.location;
      const users = await User.find(filter).select('_id name email socketId isOnline');
      return {
        users,
        query: filter,
        count: users.length,
      };
    }
    
    throw error;
  }
};

module.exports = { findMatchingUsers };
