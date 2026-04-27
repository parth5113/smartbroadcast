import React from 'react';

export const BroadcastAnimation = ({ isLive }) => {
  if (!isLive) return null;

  return (
    <div className="flex items-center justify-center p-4">
      <div className="relative flex items-center justify-center w-32 h-32">
        {/* Waves */}
        <div className="absolute inset-0 rounded-full border-2 border-[var(--accent-primary)] animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-75"></div>
        <div className="absolute inset-4 rounded-full border-2 border-[var(--success)] animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite] opacity-50 delay-150"></div>
        
        {/* Core */}
        <div className="relative z-10 w-16 h-16 rounded-full bg-[var(--danger)] flex items-center justify-center shadow-[0_0_30px_rgba(255,107,107,0.6)]">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center animate-pulse">
            <div className="w-4 h-4 bg-[var(--danger)] rounded-full"></div>
          </div>
        </div>
        
        <div className="absolute -bottom-8 font-bold text-[var(--danger)] tracking-widest uppercase text-sm animate-pulse">
          LIVE
        </div>
      </div>
    </div>
  );
};
