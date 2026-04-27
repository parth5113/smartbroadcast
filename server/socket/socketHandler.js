const User = require('../models/User');

const activeAudience = new Map();
let simulationInterval = null;

const setupSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('authenticate', async (userData) => {
      // userData can be userId string or object { id, name, avatar }
      const id = typeof userData === 'string' ? userData : userData.id;
      const name = userData.name || `User-${id.substring(0, 4)}`;
      const avatar = userData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`;
      
      try {
        await User.findByIdAndUpdate(id, { socketId: socket.id, isOnline: true });
        socket.userId = id;
        
        activeAudience.set(socket.id, {
          id,
          name,
          avatar,
          lat: 0,
          lng: 0,
          isSimulated: false,
          joinedAt: Date.now()
        });
        
        console.log(`User ${id} online on ${socket.id}`);
        emitAudienceUpdate();
      } catch (err) { console.error('Socket auth error:', err.message); }
    });

    socket.on('disconnect', async () => {
      activeAudience.delete(socket.id);
      if (socket.userId) {
        try {
          await User.findByIdAndUpdate(socket.userId, { socketId: null, isOnline: false });
        } catch (err) { console.error('Disconnect error:', err.message); }
      }
      emitAudienceUpdate();
    });

    socket.on('update_location', async (data) => {
      if (activeAudience.has(socket.id)) {
        const user = activeAudience.get(socket.id);
        user.lat = data.latitude;
        user.lng = data.longitude;
      }
      
      if (!socket.userId) return;
      try {
        await User.findByIdAndUpdate(socket.userId, {
          location: { type: 'Point', coordinates: [data.longitude, data.latitude] },
          locationUpdatedAt: new Date(),
        });
      } catch (err) { console.error('Location error:', err.message); }
    });

    // --- SIMULATION MODE ---
    socket.on('toggle_simulation', (data) => {
      const { enabled, count = 50 } = data;
      if (enabled) {
        startSimulation(count);
      } else {
        stopSimulation();
      }
    });
  });

  const emitAudienceUpdate = () => {
    const audienceList = Array.from(activeAudience.values());
    io.emit('audience_update', {
      count: audienceList.length,
      audience: audienceList
    });
  };

  const startSimulation = (count) => {
    if (simulationInterval) clearInterval(simulationInterval);
    
    // Clear previously simulated
    for (const [key, val] of activeAudience.entries()) {
      if (val.isSimulated) activeAudience.delete(key);
    }
    
    // Generate static mock users
    for(let i = 0; i < count; i++) {
      const simId = `sim_${i}`;
      activeAudience.set(simId, {
        id: simId,
        name: `SimUser ${i}`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=sim${i}`,
        lat: 37.7749 + (Math.random() - 0.5) * 10, // Around US roughly
        lng: -122.4194 + (Math.random() - 0.5) * 20,
        isSimulated: true,
        joinedAt: Date.now() - Math.random() * 10000
      });
    }

    emitAudienceUpdate();
    
    // Interval to jitter their locations slightly
    simulationInterval = setInterval(() => {
      let changed = false;
      for (const [key, user] of activeAudience.entries()) {
        if (user.isSimulated) {
          user.lat += (Math.random() - 0.5) * 0.1;
          user.lng += (Math.random() - 0.5) * 0.1;
          changed = true;
        }
      }
      if(changed) emitAudienceUpdate();
    }, 3000);
  };

  const stopSimulation = () => {
    if (simulationInterval) {
      clearInterval(simulationInterval);
      simulationInterval = null;
    }
    for (const [key, val] of activeAudience.entries()) {
      if (val.isSimulated) activeAudience.delete(key);
    }
    emitAudienceUpdate();
  };

  // Periodic broadcast of real audience data
  setInterval(emitAudienceUpdate, 5000);
};

module.exports = setupSocket;
