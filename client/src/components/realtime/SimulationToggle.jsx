import React, { useState } from 'react';

export const SimulationToggle = ({ onToggle }) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [count, setCount] = useState(50);

  const handleToggle = () => {
    const newState = !isSimulating;
    setIsSimulating(newState);
    onToggle(newState, count);
  };

  return (
    <div className="card w-full mt-4 bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-[var(--accent-primary)]">Simulation Mode</h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">Inject mock Socket.io events for stress testing.</p>
        </div>
        <div className="flex items-center">
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={isSimulating}
              onChange={handleToggle}
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
          </label>
        </div>
      </div>
      
      {isSimulating && (
        <div className="mt-3 animate-in">
          <label className="block text-xs text-[var(--text-secondary)] mb-1">Simulated Users ({count})</label>
          <input 
            type="range" 
            min="10" 
            max="500" 
            step="10"
            value={count} 
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setCount(val);
              onToggle(true, val);
            }}
            className="w-full accent-[var(--accent-primary)] h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      )}
    </div>
  );
};
