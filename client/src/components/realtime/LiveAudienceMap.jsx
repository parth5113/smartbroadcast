import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for leaflet marker icons in React
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

export const LiveAudienceMap = ({ audience }) => {
  return (
    <div className="w-full h-full min-h-[400px] rounded-xl overflow-hidden border border-[var(--border-subtle)] shadow-lg relative z-0">
      <MapContainer 
        center={[20, 0]} 
        zoom={2} 
        style={{ height: '100%', width: '100%', background: '#0a0a0f' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">Carto</a>'
        />
        {audience.map((user) => {
          if (user.lat && user.lng) {
            return (
              <CircleMarker
                key={user.id}
                center={[user.lat, user.lng]}
                radius={6}
                pathOptions={{ 
                  color: user.isSimulated ? '#00cec9' : '#6c5ce7', 
                  fillColor: user.isSimulated ? '#00cec9' : '#6c5ce7',
                  fillOpacity: 0.7 
                }}
              >
                <Popup className="dark-popup">
                  <div className="flex items-center gap-2 p-1">
                    <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
                    <div>
                      <p className="font-bold text-sm m-0">{user.name}</p>
                      {user.isSimulated && <span className="text-xs text-[#00cec9]">Simulated</span>}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          }
          return null;
        })}
      </MapContainer>
      
      <style>{`
        .leaflet-popup-content-wrapper { background: var(--bg-card); color: white; border: 1px solid var(--border-subtle); backdrop-filter: blur(10px); }
        .leaflet-popup-tip { background: var(--bg-card); }
      `}</style>
    </div>
  );
};
