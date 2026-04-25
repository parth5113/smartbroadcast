import { useState, useEffect } from 'react';
import API from '../api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { HiCheckCircle, HiThumbUp, HiThumbDown } from 'react-icons/hi';

export default function StudentHome() {
  const { user } = useAuth();
  const { notifications: liveNotifs, unreadCount, setUnreadCount, clearUnread } = useSocket();
  const [dbNotifications, setDbNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadNotifications(); }, []);

  const loadNotifications = async () => {
    try {
      const res = await API.get('/users/notifications');
      setDbNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // Merge live + DB, deduplicate
  const allNotifications = [
    ...liveNotifs.map(n => ({ _id: n.broadcastId + '_live', title: n.title, body: n.body, urgency: n.urgency, read: false, relevant: null, createdAt: n.timestamp })),
    ...dbNotifications,
  ];
  const seen = new Set();
  const uniqueNotifications = allNotifications.filter(n => {
    const key = n._id?.replace('_live', '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const markAllRead = async () => {
    try {
      await API.put('/users/notifications/read-all');
      setDbNotifications(prev => prev.map(n => ({ ...n, read: true })));
      clearUnread();
    } catch (err) { console.error(err); }
  };

  const markRead = async (id) => {
    if (!id || id.includes('_live')) return;
    try {
      await API.put(`/users/notifications/${id}/read`);
      setDbNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) { console.error(err); }
  };

  const sendFeedback = async (id, relevant) => {
    if (!id || id.includes('_live')) return;
    try {
      await API.put(`/users/notifications/${id}/feedback`, { relevant });
      setDbNotifications(prev => prev.map(n => n._id === id ? { ...n, relevant } : n));
    } catch (err) { console.error(err); }
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    const diffMins = Math.floor((Date.now() - d) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="page-container">
      <div className="section-header animate-in">
        <div>
          <h1 className="section-title">Notifications</h1>
          <p className="section-subtitle">
            {user.department && `${user.department} • Year ${user.year}`}
            {user.interests?.length > 0 && ` • ${user.interests.join(', ')}`}
          </p>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={markAllRead}>
            <HiCheckCircle /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading-overlay"><span className="spinner"></span> Loading notifications...</div>
      ) : uniqueNotifications.length === 0 ? (
        <div className="card animate-in">
          <div className="empty-state">
            <div className="empty-state-icon">🔔</div>
            <h3>No notifications yet</h3>
            <p>You'll receive targeted broadcasts here based on your profile</p>
          </div>
        </div>
      ) : (
        <div className="notifications-feed">
          {uniqueNotifications.map((n, i) => (
            <div
              key={n._id || i}
              className={`notification-item animate-in ${!n.read ? 'unread' : ''} ${n.urgency ? `urgency-${n.urgency}` : ''}`}
              onClick={() => !n.read && markRead(n._id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div className="notification-title">{n.title}</div>
                  <div className="notification-body">{n.body}</div>
                  <div className="notification-time">{formatTime(n.createdAt)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0, marginLeft: '0.75rem' }}>
                  {n.relevant === null && !n._id?.includes('_live') ? (
                    <>
                      <button
                        className="btn btn-sm"
                        style={{ background: 'rgba(0,206,201,0.12)', color: '#00cec9', border: 'none', padding: '0.3rem 0.5rem' }}
                        onClick={(e) => { e.stopPropagation(); sendFeedback(n._id, true); }}
                        title="Relevant to me"
                      >
                        <HiThumbUp />
                      </button>
                      <button
                        className="btn btn-sm"
                        style={{ background: 'rgba(255,107,107,0.12)', color: '#ff6b6b', border: 'none', padding: '0.3rem 0.5rem' }}
                        onClick={(e) => { e.stopPropagation(); sendFeedback(n._id, false); }}
                        title="Not relevant to me"
                      >
                        <HiThumbDown />
                      </button>
                    </>
                  ) : n.relevant !== null ? (
                    <span style={{ fontSize: '0.7rem', color: n.relevant ? '#00cec9' : '#ff6b6b', padding: '0.2rem 0.5rem', borderRadius: 12, background: n.relevant ? 'rgba(0,206,201,0.1)' : 'rgba(255,107,107,0.1)' }}>
                      {n.relevant ? '👍 Relevant' : '👎 Irrelevant'}
                    </span>
                  ) : !n.read ? (
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-primary)' }}></span>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
