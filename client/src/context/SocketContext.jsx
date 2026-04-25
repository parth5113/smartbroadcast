import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef(null);

  useEffect(() => {
    if (user) {
      const s = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

      s.on('connect', () => {
        console.log('Socket connected:', s.id);
        s.emit('authenticate', user.id);
      });

      s.on('notification', (data) => {
        setNotifications(prev => [data, ...prev]);
        setUnreadCount(prev => prev + 1);

        // Native push notification if tab is not focused
        if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(data.title, {
            body: data.body,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-72.png',
            tag: data.broadcastId,
          });
        }
      });

      socketRef.current = s;
      setSocket(s);

      return () => { s.disconnect(); };
    }
  }, [user]);

  const clearUnread = () => setUnreadCount(0);

  return (
    <SocketContext.Provider value={{ socket, notifications, setNotifications, unreadCount, setUnreadCount, clearUnread }}>
      {children}
    </SocketContext.Provider>
  );
}
