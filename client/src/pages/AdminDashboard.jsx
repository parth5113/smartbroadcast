import { useState, useEffect } from 'react';
import API from '../api';
import toast from 'react-hot-toast';
import { HiPaperAirplane, HiUsers, HiChartBar, HiCheckCircle, HiExclamation } from 'react-icons/hi';

export default function AdminDashboard() {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadHistory();
    loadStats();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await API.get('/broadcast/history');
      setHistory(res.data.broadcasts);
    } catch (err) { console.error(err); }
  };

  const loadStats = async () => {
    try {
      const res = await API.get('/broadcast/stats');
      setStats(res.data);
    } catch (err) { console.error(err); }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const res = await API.post('/broadcast', { message });
      setResult(res.data);
      toast.success(`Broadcast sent to ${res.data.broadcast.matchedCount} users!`);
      setMessage('');
      loadHistory();
      loadStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Broadcast failed');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="page-container">
      <div className="section-header animate-in">
        <div>
          <h1 className="section-title">Admin Dashboard</h1>
          <p className="section-subtitle">Compose and send intelligent broadcasts</p>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="stats-grid animate-in">
          <div className="stat-card">
            <div className="stat-icon purple"><HiPaperAirplane /></div>
            <div><div className="stat-value">{stats.totalBroadcasts}</div><div className="stat-label">Total Broadcasts</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon teal"><HiCheckCircle /></div>
            <div><div className="stat-value">{stats.sentBroadcasts}</div><div className="stat-label">Delivered</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue"><HiUsers /></div>
            <div><div className="stat-value">{stats.totalTargeted}</div><div className="stat-label">Users Targeted</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange"><HiChartBar /></div>
            <div><div className="stat-value">{stats.totalDelivered}</div><div className="stat-label">Real-time Delivered</div></div>
          </div>
        </div>
      )}

      <div className="two-col">
        {/* Composer */}
        <div>
          <div className="card composer-card animate-in">
            <div className="card-header">
              <h2 className="card-title">✍️ Compose Broadcast</h2>
            </div>
            <form onSubmit={handleSend}>
              <textarea
                id="broadcast-input"
                className="form-textarea composer-textarea"
                placeholder='Try: "First-year AI&DS students interested in dance, please visit the auditorium"'
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
              <div className="composer-actions">
                <span className="composer-hint">AI will extract audience filters automatically</span>
                <button id="broadcast-send" type="submit" className="btn btn-primary" disabled={sending || !message.trim()}>
                  {sending ? <><span className="spinner"></span> Analyzing...</> : <><HiPaperAirplane /> Send</>}
                </button>
              </div>
            </form>

            {/* Result Preview */}
            {result && result.broadcast && (
              <div className="entities-preview">
                <div className="entities-title">🧠 AI Extracted Entities</div>
                <div className="entities-grid">
                  {result.broadcast.entities?.year && (
                    <div className="entity-item"><span className="entity-label">Year</span><span className="entity-value">{result.broadcast.entities.year}</span></div>
                  )}
                  {result.broadcast.entities?.department && (
                    <div className="entity-item"><span className="entity-label">Department</span><span className="entity-value">{result.broadcast.entities.department}</span></div>
                  )}
                  {result.broadcast.entities?.interests?.length > 0 && (
                    <div className="entity-item"><span className="entity-label">Interests</span><span className="entity-value">{result.broadcast.entities.interests.join(', ')}</span></div>
                  )}
                  {result.broadcast.entities?.location && (
                    <div className="entity-item"><span className="entity-label">Location</span><span className="entity-value">{result.broadcast.entities.location.label}</span></div>
                  )}
                  {result.broadcast.entities?.urgency && (
                    <div className="entity-item"><span className="entity-label">Urgency</span><span className="entity-value">{result.broadcast.entities.urgency}</span></div>
                  )}
                  <div className="entity-item"><span className="entity-label">Matched</span><span className="entity-value">{result.broadcast.matchedCount} users</span></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* History */}
        <div>
          <div className="card animate-in">
            <div className="card-header">
              <h2 className="card-title">📋 Recent Broadcasts</h2>
            </div>
            {history.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <h3>No broadcasts yet</h3>
                <p>Compose your first message to get started</p>
              </div>
            ) : (
              <div className="broadcast-list">
                {history.map(b => (
                  <div key={b._id} className="broadcast-item">
                    <div className="broadcast-item-header">
                      <div className="broadcast-message">{b.rawMessage}</div>
                      <span className={`status-badge ${b.status}`}>{b.status}</span>
                    </div>
                    <div className="broadcast-meta">
                      <span className="broadcast-stat"><HiUsers /> {b.deliveryStats?.targeted || 0} targeted</span>
                      <span className="broadcast-stat"><HiCheckCircle /> {b.deliveryStats?.delivered || 0} delivered</span>
                      <span>{formatTime(b.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
