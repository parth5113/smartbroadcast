import React from 'react';

export const AudiencePreview = ({ audience }) => {
  const displayLimit = 16;
  const displayed = audience.slice(0, displayLimit);
  const remaining = audience.length - displayLimit;

  return (
    <div className="card w-full mt-4">
      <h3 className="card-title text-lg mb-4 text-[var(--success)]">Active Participants</h3>
      {audience.length === 0 ? (
        <p className="text-[var(--text-muted)] text-sm">No one is here yet...</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {displayed.map((user) => (
            <div key={user.id} className="relative group cursor-pointer transition-transform hover:scale-110">
              <img 
                src={user.avatar} 
                alt={user.name} 
                className={`w-12 h-12 rounded-full border-2 ${user.isSimulated ? 'border-[#00cec9]' : 'border-[#6c5ce7]'}`} 
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-[var(--bg-primary)] rounded-full"></div>
              
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                {user.name}
              </div>
            </div>
          ))}
          
          {remaining > 0 && (
            <div className="w-12 h-12 rounded-full border-2 border-[var(--border-subtle)] bg-[var(--bg-glass)] flex items-center justify-center text-sm font-bold text-[var(--text-secondary)]">
              +{remaining}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
