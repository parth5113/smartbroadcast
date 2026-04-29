import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import API from '../api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import {
  HiCheckCircle, HiThumbUp, HiThumbDown,
  HiSearch, HiBell, HiLightningBolt, HiClock,
  HiBookmark, HiVolumeOff, HiEye, HiSparkles,
  HiChartBar, HiSwitchHorizontal, HiInformationCircle,
  HiChevronDown, HiX, HiRefresh,
} from 'react-icons/hi';
import {
  computeRelevance,
  explainWhy,
  tunePreferences,
  generateDigest,
  getPriorityTag,
  semanticSearch,
  getTimeGroup,
  formatRelativeTime,
} from '../utils/smartML';

// ─── Demo profile presets (Spec #11) ───
const DEMO_PROFILES = [
  { id: 'p1', name: 'Aarav (AI/HPC)', interests: ['AI', 'HPC', 'coding'], department: 'AIDS', year: 1 },
  { id: 'p2', name: 'Vikram (Sports)', interests: ['sports', 'music'], department: 'ECE', year: 3 },
  { id: 'p3', name: 'Priya (Dance/Code)', interests: ['coding', 'dance'], department: 'AIDS', year: 1 },
];

export default function StudentHome() {
  const { user } = useAuth();
  const { notifications: liveNotifs, unreadCount, setUnreadCount, clearUnread } = useSocket();

  // ─── Core state ───
  const [dbNotifications, setDbNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');           // Spec #1
  const [search, setSearch] = useState('');               // Spec #8
  const [smartMode, setSmartMode] = useState(true);       // Spec #11
  const [demoProfile, setDemoProfile] = useState(null);   // Spec #11
  const [expandedWhy, setExpandedWhy] = useState(null);   // Spec #2
  const [savedIds, setSavedIds] = useState(new Set());    // Spec #3
  const [mutedIds, setMutedIds] = useState(new Set());    // Spec #3
  const [undoAction, setUndoAction] = useState(null);     // Spec #3
  const [toasts, setToasts] = useState([]);               // Spec #9
  const undoTimerRef = useRef(null);

  // Active profile: real user or demo sim
  const profile = useMemo(() => {
    if (demoProfile) return demoProfile;
    return {
      id: user?.id,
      name: user?.name,
      interests: user?.interests || [],
      department: user?.department,
      year: user?.year,
    };
  }, [user, demoProfile]);

  // ─── Load notifications from DB ───
  useEffect(() => { loadNotifications(); }, []);

  const loadNotifications = async () => {
    try {
      const res = await API.get('/users/notifications');
      setDbNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // ─── Merge live + DB, deduplicate ───
  const allNotifications = useMemo(() => {
    const merged = [
      ...liveNotifs.map(n => ({
        _id: n.broadcastId + '_live',
        title: n.title,
        body: n.body,
        urgency: n.urgency,
        read: false,
        relevant: null,
        createdAt: n.timestamp,
        _isLive: true,
      })),
      ...dbNotifications,
    ];
    const seen = new Set();
    return merged.filter(n => {
      const key = n._id?.toString().replace('_live', '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [liveNotifs, dbNotifications]);

  // ─── Enrich with ML relevance (Spec #2) ───
  const enrichedNotifications = useMemo(() => {
    return allNotifications
      .filter(n => !mutedIds.has(n._id))
      .map(n => {
        const { score, matchedInterests } = computeRelevance(profile, n);
        return {
          ...n,
          _relevance: score,
          _matchedInterests: matchedInterests,
          _priorityTag: getPriorityTag(n.urgency),
          _timeGroup: getTimeGroup(n.createdAt),
          _relativeTime: formatRelativeTime(n.createdAt),
        };
      });
  }, [allNotifications, profile, mutedIds]);

  // ─── Filter + Search pipeline (Spec #1, #8) ───
  const filteredNotifications = useMemo(() => {
    let result = [...enrichedNotifications];

    // Smart mode: sort by relevance (Spec #11)
    if (smartMode) {
      result.sort((a, b) => b._relevance - a._relevance);
    }

    // Tab filters
    switch (filter) {
      case 'Relevant': result = result.filter(n => n._relevance >= 60); break;
      case 'Unread':   result = result.filter(n => !n.read); break;
      case 'Urgent':   result = result.filter(n => n.urgency === 'high'); break;
      case 'Saved':    result = result.filter(n => savedIds.has(n._id)); break;
    }

    // Semantic search
    if (search.trim()) {
      result = semanticSearch(result, search);
    }

    return result;
  }, [enrichedNotifications, filter, search, smartMode, savedIds]);

  // ─── Group by time (Spec #1, #5) ───
  const groupedNotifications = useMemo(() => {
    const groups = {};
    const timeOrder = ['Upcoming Today', 'Tomorrow', 'This Week', 'Later', 'Just Now', 'Today', 'Yesterday', 'Earlier'];
    filteredNotifications.forEach(n => {
      const group = n._timeGroup;
      if (!groups[group]) groups[group] = [];
      groups[group].push(n);
    });
    // Sort groups by predefined order
    const ordered = {};
    timeOrder.forEach(key => {
      if (groups[key]) ordered[key] = groups[key];
    });
    return ordered;
  }, [filteredNotifications]);

  // ─── Dashboard stats (Spec #6) ───
  const stats = useMemo(() => {
    const total = enrichedNotifications.length;
    const newCount = enrichedNotifications.filter(n => !n.read).length;
    const urgCount = enrichedNotifications.filter(n => n.urgency === 'high' && !n.read).length;
    const withFeedback = enrichedNotifications.filter(n => n.relevant !== null).length;
    const relevantFeedback = enrichedNotifications.filter(n => n.relevant === true).length;
    const accuracy = withFeedback > 0 ? Math.round((relevantFeedback / withFeedback) * 100) : 0;
    return { total, newCount, urgCount, accuracy };
  }, [enrichedNotifications]);

  // ─── AI Digest (Spec #12) ───
  const digest = useMemo(() => {
    return generateDigest(enrichedNotifications, profile);
  }, [enrichedNotifications, profile]);

  // ─── Toast system (Spec #9) ───
  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  // ─── Interaction handlers (Spec #3) ───
  const markRead = async (id) => {
    if (!id || id.includes('_live')) return;
    try {
      await API.put(`/users/notifications/${id}/read`);
      setDbNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      tunePreferences(profile.id, 'read', allNotifications.find(n => n._id === id));
    } catch (err) { console.error(err); }
  };

  const markAllRead = async () => {
    try {
      await API.put('/users/notifications/read-all');
      setDbNotifications(prev => prev.map(n => ({ ...n, read: true })));
      clearUnread();
      showToast('All marked as read', 'success');
    } catch (err) { console.error(err); }
  };

  const sendFeedback = async (id, relevant) => {
    if (!id || id.includes('_live')) return;
    const notif = allNotifications.find(n => n._id === id);
    try {
      await API.put(`/users/notifications/${id}/feedback`, { relevant });
      setDbNotifications(prev => prev.map(n => n._id === id ? { ...n, relevant } : n));
      tunePreferences(profile.id, relevant ? 'relevant' : 'irrelevant', notif);
      showToast(relevant ? 'Marked as relevant 👍' : 'Marked as irrelevant', relevant ? 'success' : 'info');
    } catch (err) { console.error(err); }
  };

  const toggleSave = (id) => {
    setSavedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); showToast('Removed from saved'); }
      else { next.add(id); showToast('Saved for later', 'success'); }
      return next;
    });
    const notif = allNotifications.find(n => n._id === id);
    if (notif) tunePreferences(profile.id, 'save', notif);
  };

  const muteNotification = (id) => {
    const notif = allNotifications.find(n => n._id === id);
    setMutedIds(prev => new Set([...prev, id]));
    tunePreferences(profile.id, 'mute', notif);
    showToast('Notification muted', 'info');

    // Undo support
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoAction({ type: 'mute', id });
    undoTimerRef.current = setTimeout(() => setUndoAction(null), 5000);
  };

  const handleUndo = () => {
    if (!undoAction) return;
    if (undoAction.type === 'mute') {
      setMutedIds(prev => {
        const next = new Set(prev);
        next.delete(undoAction.id);
        return next;
      });
      showToast('Undo successful', 'success');
    }
    setUndoAction(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  };

  // ─── Filter tabs ───
  const FILTERS = ['All', 'Relevant', 'Unread', 'Urgent', 'Saved'];

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RENDER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  return (
    <div className="page-container">

      {/* ── Toast notifications (Spec #9) ── */}
      <div className="sn-toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`sn-toast sn-toast-${t.type}`}>
            <span>{t.message}</span>
            <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}>
              <HiX size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* ── Undo bar (Spec #3) ── */}
      {undoAction && (
        <div className="sn-undo-bar animate-in">
          <span>Notification muted</span>
          <button className="btn btn-sm btn-ghost" onClick={handleUndo}>
            <HiRefresh size={14} /> Undo
          </button>
        </div>
      )}

      {/* ── Header ── */}
      <div className="section-header animate-in">
        <div>
          <h1 className="section-title">
            <HiBell style={{ verticalAlign: 'middle', marginRight: '0.5rem', color: 'var(--accent-secondary)' }} />
            Smart Notifications
          </h1>
          <p className="section-subtitle">
            {profile.department && `${profile.department} • Year ${profile.year}`}
            {profile.interests?.length > 0 && ` • ${profile.interests.join(', ')}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {stats.newCount > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={markAllRead}>
              <HiCheckCircle /> Mark all read
            </button>
          )}
        </div>
      </div>

      {/* ── AI Digest Banner (Spec #12) ── */}
      {!loading && enrichedNotifications.length > 0 && (
        <div className="sn-digest-banner animate-in">
          <div className="sn-digest-icon"><HiSparkles size={20} /></div>
          <div className="sn-digest-text">
            <span className="sn-digest-line1">{digest.line1}</span>
            <span className="sn-digest-line2">{digest.line2}</span>
          </div>
        </div>
      )}

      {/* ── Dashboard Stats (Spec #6) ── */}
      <div className="stats-grid animate-in">
        <div className="stat-card">
          <div className="stat-icon purple"><HiBell size={22} /></div>
          <div><div className="stat-value">{stats.newCount}</div><div className="stat-label">New</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><HiLightningBolt size={22} /></div>
          <div><div className="stat-value">{stats.urgCount}</div><div className="stat-label">Urgent</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon teal"><HiChartBar size={22} /></div>
          <div><div className="stat-value">{stats.accuracy}%</div><div className="stat-label">Accuracy</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><HiEye size={22} /></div>
          <div><div className="stat-value">{stats.total}</div><div className="stat-label">Total</div></div>
        </div>
      </div>

      {/* ── Controls: Demo toggle + Search (Spec #8, #11) ── */}
      <div className="sn-controls animate-in">
        {/* Smart vs Raw Toggle */}
        <div className="sn-toggle-group">
          <button
            className={`sn-toggle-btn ${smartMode ? 'active' : ''}`}
            onClick={() => setSmartMode(true)}
          >
            <HiSparkles size={14} /> Smart
          </button>
          <button
            className={`sn-toggle-btn ${!smartMode ? 'active' : ''}`}
            onClick={() => setSmartMode(false)}
          >
            <HiSwitchHorizontal size={14} /> Raw
          </button>
        </div>

        {/* Demo profile switcher */}
        <div className="sn-profile-switcher">
          <select
            className="form-select sn-demo-select"
            value={demoProfile?.id || ''}
            onChange={(e) => {
              const p = DEMO_PROFILES.find(p => p.id === e.target.value);
              setDemoProfile(p || null);
            }}
          >
            <option value="">Your Profile</option>
            {DEMO_PROFILES.map(p => (
              <option key={p.id} value={p.id}>🧪 {p.name}</option>
            ))}
          </select>
        </div>

        {/* Semantic search bar */}
        <div className="sn-search-wrap">
          <HiSearch className="sn-search-icon" />
          <input
            type="text"
            className="form-input sn-search-input"
            placeholder="Semantic search… e.g. 'workshop tomorrow'"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="sn-search-clear" onClick={() => setSearch('')}>
              <HiX size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── Filter Tabs (Spec #1) ── */}
      <div className="sn-filter-tabs animate-in">
        {FILTERS.map(f => (
          <button
            key={f}
            className={`sn-filter-tab ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
            {f === 'Unread' && stats.newCount > 0 && (
              <span className="sn-tab-badge">{stats.newCount}</span>
            )}
            {f === 'Urgent' && stats.urgCount > 0 && (
              <span className="sn-tab-badge sn-tab-badge-urg">{stats.urgCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Notification Feed ── */}
      {loading ? (
        /* Skeleton loading (Spec #12) */
        <div className="notifications-feed">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="sn-skeleton-item animate-in" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="sn-skeleton-line sn-skeleton-title"></div>
              <div className="sn-skeleton-line sn-skeleton-body"></div>
              <div className="sn-skeleton-line sn-skeleton-meta"></div>
            </div>
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="card animate-in">
          <div className="empty-state">
            <div className="empty-state-icon">{filter === 'Saved' ? '🔖' : '🔔'}</div>
            <h3>{filter === 'All' ? 'No notifications yet' : `No ${filter.toLowerCase()} notifications`}</h3>
            <p>{filter === 'All' ? "You'll receive targeted broadcasts here based on your profile" : 'Try changing your filter'}</p>
          </div>
        </div>
      ) : (
        <div className="notifications-feed">
          {Object.entries(groupedNotifications).map(([group, notifs]) => (
            <div key={group} className="sn-time-group">
              {/* ── Time group header (Spec #1, #5) ── */}
              <div className="sn-time-group-header">
                <HiClock size={13} />
                <span>{group}</span>
                <span className="sn-time-group-count">{notifs.length}</span>
              </div>

              {notifs.map((n, i) => (
                <div
                  key={n._id || i}
                  className={`sn-notif-card animate-in ${!n.read ? 'sn-unread' : ''} ${n.urgency === 'high' ? 'sn-urg-glow' : ''}`}
                  style={{ animationDelay: `${i * 0.04}s` }}
                  onClick={() => !n.read && markRead(n._id)}
                >
                  {/* Top row: priority tag + title + time */}
                  <div className="sn-notif-top">
                    <div className="sn-notif-left">
                      {/* Priority tag (Spec #1) */}
                      <span className={`sn-priority-tag ${n._priorityTag.color}`}>
                        {n._priorityTag.label}
                      </span>
                      {/* Title (Spec #4: bold msg) */}
                      <span className="sn-notif-title">{n.title}</span>
                    </div>
                    <div className="sn-notif-right">
                      {/* Relevance badge (Spec #2) */}
                      {smartMode && (
                        <span className={`sn-relevance-badge ${n._relevance >= 70 ? 'high' : n._relevance >= 40 ? 'mid' : 'low'}`}>
                          {n._relevance}%
                        </span>
                      )}
                      {/* Relative time (Spec #9) */}
                      <span className="sn-notif-time">{n._relativeTime}</span>
                    </div>
                  </div>

                  {/* Body (Spec #4: small meta) */}
                  <div className="sn-notif-body">{n.body}</div>

                  {/* Match labels (Spec #2) */}
                  {smartMode && n._matchedInterests.length > 0 && (
                    <div className="sn-match-labels">
                      {n._matchedInterests.map(interest => (
                        <span key={interest} className="sn-match-tag">Match: {interest}</span>
                      ))}
                    </div>
                  )}

                  {/* "Why this?" expandable (Spec #2) */}
                  {smartMode && (
                    <button
                      className="sn-why-btn"
                      onClick={(e) => { e.stopPropagation(); setExpandedWhy(expandedWhy === n._id ? null : n._id); }}
                    >
                      <HiInformationCircle size={14} />
                      Why this?
                      <HiChevronDown size={14} className={expandedWhy === n._id ? 'sn-chevron-open' : ''} />
                    </button>
                  )}
                  {expandedWhy === n._id && (
                    <div className="sn-why-dropdown animate-in">
                      {explainWhy(profile, n).map((reason, idx) => (
                        <div key={idx} className="sn-why-reason">{reason}</div>
                      ))}
                    </div>
                  )}

                  {/* Action bar (Spec #3): feedback, save, mute */}
                  <div className="sn-notif-actions">
                    {/* Feedback */}
                    {n.relevant === null && !n._id?.includes('_live') ? (
                      <>
                        <button
                          className="sn-action-btn sn-action-relevant"
                          onClick={(e) => { e.stopPropagation(); sendFeedback(n._id, true); }}
                          title="Relevant to me"
                        >
                          <HiThumbUp size={15} />
                        </button>
                        <button
                          className="sn-action-btn sn-action-irrelevant"
                          onClick={(e) => { e.stopPropagation(); sendFeedback(n._id, false); }}
                          title="Not relevant"
                        >
                          <HiThumbDown size={15} />
                        </button>
                      </>
                    ) : n.relevant !== null ? (
                      <span className={`sn-feedback-badge ${n.relevant ? 'positive' : 'negative'}`}>
                        {n.relevant ? '👍 Relevant' : '👎 Not for me'}
                      </span>
                    ) : null}

                    {/* Save */}
                    <button
                      className={`sn-action-btn ${savedIds.has(n._id) ? 'sn-action-saved' : ''}`}
                      onClick={(e) => { e.stopPropagation(); toggleSave(n._id); }}
                      title={savedIds.has(n._id) ? 'Unsave' : 'Save'}
                    >
                      <HiBookmark size={15} />
                    </button>

                    {/* Mute */}
                    <button
                      className="sn-action-btn sn-action-mute"
                      onClick={(e) => { e.stopPropagation(); muteNotification(n._id); }}
                      title="Mute this notification"
                    >
                      <HiVolumeOff size={15} />
                    </button>

                    {/* Unread dot */}
                    {!n.read && (
                      <span className="sn-unread-dot" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
