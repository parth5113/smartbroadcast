import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import API from '../api';
import toast from 'react-hot-toast';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  HiPaperAirplane, HiUsers, HiChartBar, HiCheckCircle, HiExclamation,
  HiClock, HiLightningBolt, HiEye, HiThumbUp, HiThumbDown,
  HiSparkles, HiSwitchHorizontal, HiInformationCircle, HiSearch,
  HiChevronDown, HiX, HiRefresh, HiShieldExclamation, HiBeaker,
  HiCalendar, HiBell, HiAnnotation, HiBookmark,
} from 'react-icons/hi';
import {
  extractLiveEntities, predictReach, getAudienceDistribution,
  explainAudience, getTextHints, getHighlightedWords, suggestPeakTime,
  compareVariants, suggestAudienceTweaks, getPriorityConfig, getCategoryConfig,
} from '../utils/adminML';

const COLORS = ['#6c5ce7', '#00cec9', '#fdcb6e', '#ff6b6b', '#74b9ff', '#a29bfe'];
const DEMO_PROFILES = [
  { label: 'Year 1 AIDS', year: 1, department: 'AIDS' },
  { label: 'Year 3 ECE', year: 3, department: 'ECE' },
  { label: 'Year 2 CSE', year: 2, department: 'CSE' },
];

export default function AdminDashboard() {
  // ── Core state ──
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);

  // ── Spec states ──
  const [priority, setPriority] = useState('Gen');
  const [showWhyAudience, setShowWhyAudience] = useState(false);
  const [previewProfile, setPreviewProfile] = useState(null);
  const [abMode, setAbMode] = useState(false);
  const [variantB, setVariantB] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [undoTimer, setUndoTimer] = useState(null);
  const [lastSentId, setLastSentId] = useState(null);
  const [activeHistoryId, setActiveHistoryId] = useState(null);
  const undoRef = useRef(null);

  useEffect(() => { loadHistory(); loadStats(); }, []);

  const loadHistory = async () => {
    try { const res = await API.get('/broadcast/history'); setHistory(res.data.broadcasts); }
    catch (err) { console.error(err); }
  };
  const loadStats = async () => {
    try { const res = await API.get('/broadcast/stats'); setStats(res.data); }
    catch (err) { console.error(err); }
  };

  // ── Live entity extraction (Spec #1) ──
  const liveEntities = useMemo(() => extractLiveEntities(message), [message]);
  const reach = useMemo(() => predictReach(liveEntities), [liveEntities]);
  const audienceDist = useMemo(() => getAudienceDistribution(liveEntities), [liveEntities]);
  const textHints = useMemo(() => getTextHints(message), [message]);
  const highlightedWords = useMemo(() => getHighlightedWords(message), [message]);
  const audienceReasons = useMemo(() => explainAudience(liveEntities), [liveEntities]);
  const peakTime = useMemo(() => suggestPeakTime(), []);
  const categoryConfig = useMemo(() => getCategoryConfig(liveEntities.category), [liveEntities.category]);
  const priorityConfig = useMemo(() => getPriorityConfig(liveEntities.urgency), [liveEntities.urgency]);

  // A/B comparison (Spec #11)
  const abComparison = useMemo(() => {
    if (abMode && variantB.trim()) return compareVariants(message, variantB);
    return null;
  }, [abMode, message, variantB]);

  // Auto-set priority from urgency
  useEffect(() => {
    if (liveEntities.urgency === 'high') setPriority('Urg');
    else if (liveEntities.urgency === 'medium') setPriority('Imp');
    else setPriority('Gen');
  }, [liveEntities.urgency]);

  // ── Send handler with confirm modal (Spec #12) ──
  const handleSendClick = (e) => { e.preventDefault(); if (!message.trim()) return; setConfirmModal(true); };

  const confirmSend = async () => {
    setConfirmModal(false);
    setSending(true);
    setResult(null);
    try {
      const res = await API.post('/broadcast', { message });
      setResult(res.data);
      toast.success(`Broadcast sent to ${res.data.broadcast.matchedCount} users!`);
      setLastSentId(res.data.broadcast.id);
      // 10s undo window (Spec #12)
      const timer = setTimeout(() => { setLastSentId(null); setUndoTimer(null); }, 10000);
      setUndoTimer(timer);
      setMessage('');
      setVariantB('');
      setAbMode(false);
      loadHistory();
      loadStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Broadcast failed');
    } finally { setSending(false); }
  };

  const handleUndo = () => {
    if (undoTimer) clearTimeout(undoTimer);
    setLastSentId(null);
    setUndoTimer(null);
    toast.success('Broadcast undo requested (demo)');
  };

  const formatTime = (ts) => new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  // ── Entity chips from message ──
  const entityChips = useMemo(() => {
    const chips = [];
    if (liveEntities.year) chips.push({ label: `Year ${liveEntities.year}`, type: 'year' });
    if (liveEntities.department) chips.push({ label: liveEntities.department, type: 'dept' });
    liveEntities.interests.forEach(i => chips.push({ label: i, type: 'interest' }));
    if (liveEntities.location) chips.push({ label: liveEntities.location, type: 'location' });
    return chips;
  }, [liveEntities]);

  // ── Feedback suggestions for history items (Spec #6) ──
  const getTweaks = (broadcast) => suggestAudienceTweaks(broadcast.engagementStats);

  // ━━━━━━━ RENDER ━━━━━━━
  return (
    <div className="page-container">

      {/* Confirm Modal (Spec #12) */}
      {confirmModal && (
        <div className="ad-modal-overlay" onClick={() => setConfirmModal(false)}>
          <div className="ad-modal animate-in" onClick={e => e.stopPropagation()}>
            <div className="ad-modal-icon"><HiShieldExclamation size={28} /></div>
            <h3>Confirm Broadcast</h3>
            <p>This will send to ~<strong>{reach.reach}</strong> students with <strong>{priorityConfig.label}</strong> priority.</p>
            <div className="ad-modal-preview">"{message.substring(0, 100)}{message.length > 100 ? '...' : ''}"</div>
            <div className="ad-modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmSend}><HiPaperAirplane /> Send Now</button>
            </div>
          </div>
        </div>
      )}

      {/* Undo bar (Spec #12) */}
      {lastSentId && (
        <div className="ad-undo-bar animate-in">
          <span>✅ Broadcast sent successfully</span>
          <button className="btn btn-sm btn-ghost" onClick={handleUndo}><HiRefresh size={14} /> Undo (10s)</button>
        </div>
      )}

      {/* Header */}
      <div className="section-header animate-in">
        <div>
          <h1 className="section-title"><HiAnnotation style={{ verticalAlign: 'middle', marginRight: '0.5rem', color: 'var(--accent-secondary)' }} />Smart Admin Panel</h1>
          <p className="section-subtitle">AI-powered broadcast composer with closed-loop feedback</p>
        </div>
      </div>

      {/* Stats (Spec #8) */}
      {stats && (
        <div className="stats-grid animate-in">
          <div className="stat-card"><div className="stat-icon purple"><HiPaperAirplane size={22} /></div><div><div className="stat-value">{stats.totalBroadcasts}</div><div className="stat-label">Total Sent</div></div></div>
          <div className="stat-card"><div className="stat-icon teal"><HiCheckCircle size={22} /></div><div><div className="stat-value">{stats.sentBroadcasts}</div><div className="stat-label">Delivered</div></div></div>
          <div className="stat-card"><div className="stat-icon blue"><HiUsers size={22} /></div><div><div className="stat-value">{stats.totalTargeted}</div><div className="stat-label">Targeted</div></div></div>
          <div className="stat-card"><div className="stat-icon orange"><HiEye size={22} /></div><div><div className="stat-value">{stats.totalDelivered}</div><div className="stat-label">Real-time</div></div></div>
        </div>
      )}

      <div className="two-col">
        {/* ══ LEFT: Composer ══ */}
        <div>
          <div className="card composer-card animate-in">
            <div className="card-header">
              <h2 className="card-title">✍️ Compose Broadcast</h2>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {/* A/B Toggle (Spec #11) */}
                <button className={`btn btn-sm ${abMode ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setAbMode(!abMode)} title="A/B Test">
                  <HiBeaker size={14} /> A/B
                </button>
                {/* Schedule toggle (Spec #7) */}
                <button className={`btn btn-sm ${showSchedule ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setShowSchedule(!showSchedule)}>
                  <HiCalendar size={14} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSendClick}>
              {/* Textarea + char count (Spec #13) */}
              <div className="ad-textarea-wrap">
                <textarea
                  id="broadcast-input"
                  className="form-textarea composer-textarea"
                  placeholder='Try: "First-year AI&DS students interested in dance, please visit the auditorium"'
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={2000}
                  required
                />
                <span className="ad-char-count">{message.length}/2000</span>
              </div>

              {/* Live entity chips (Spec #1) */}
              {entityChips.length > 0 && (
                <div className="ad-chips-row">
                  {entityChips.map((c, i) => (
                    <span key={i} className={`ad-chip ad-chip-${c.type}`}>{c.label}</span>
                  ))}
                  {/* Category chip (Spec #2) */}
                  <span className="ad-chip ad-chip-cat" style={{ borderColor: categoryConfig.color }}>
                    {categoryConfig.icon} {categoryConfig.label}
                  </span>
                  {/* Priority chip (Spec #2) */}
                  <span className={`sn-priority-tag ${priorityConfig.cssClass}`} style={{ marginLeft: 'auto' }}>
                    {priorityConfig.label}
                  </span>
                </div>
              )}

              {/* Text hints (Spec #10) */}
              {textHints.map((h, i) => (
                <div key={i} className={`ad-hint ad-hint-${h.type}`}>{h.text}</div>
              ))}

              {/* Predicted reach (Spec #1) */}
              {message.trim() && (
                <div className="ad-reach-bar">
                  <div className="ad-reach-left">
                    <HiUsers size={16} />
                    <span><strong>{reach.reach}</strong> / {reach.total} students</span>
                    <span className="ad-reach-pct">{reach.relevancePct}% predicted relevance</span>
                  </div>
                  {/* Why this audience? (Spec #4) */}
                  <button type="button" className="sn-why-btn" onClick={() => setShowWhyAudience(!showWhyAudience)}>
                    <HiInformationCircle size={14} /> Why this audience?
                    <HiChevronDown size={14} className={showWhyAudience ? 'sn-chevron-open' : ''} />
                  </button>
                </div>
              )}
              {showWhyAudience && (
                <div className="sn-why-dropdown animate-in">
                  {audienceReasons.map((r, i) => (
                    <div key={i} className="sn-why-reason">{r.icon} {r.text}</div>
                  ))}
                </div>
              )}

              {/* Schedule (Spec #7) */}
              {showSchedule && (
                <div className="ad-schedule-row animate-in">
                  <input type="datetime-local" className="form-input" style={{ flex: 1 }} value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} />
                  <div className="ad-peak-hint">
                    <HiSparkles size={14} /> AI suggests: <strong>{peakTime.label}</strong> — {peakTime.reason}
                  </div>
                </div>
              )}

              {/* A/B Variant B (Spec #11) */}
              {abMode && (
                <div className="ad-ab-section animate-in">
                  <label className="form-label">Variant B</label>
                  <textarea className="form-textarea" rows={3} placeholder="Write an alternative message..." value={variantB} onChange={e => setVariantB(e.target.value)} />
                  {abComparison && (
                    <div className="ad-ab-comparison">
                      <div className="ad-ab-card"><strong>A</strong><span>Reach: {abComparison.a.reach}</span><span>Rel: {abComparison.a.relevance}%</span></div>
                      <div className="ad-ab-vs">VS</div>
                      <div className="ad-ab-card"><strong>B</strong><span>Reach: {abComparison.b.reach}</span><span>Rel: {abComparison.b.relevance}%</span></div>
                      <div className="ad-ab-insight">🏆 {abComparison.winner} wins — {abComparison.insight}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Preview as Student (Spec #5) */}
              <div className="ad-preview-row">
                <select className="form-select ad-preview-select" value={previewProfile ? JSON.stringify(previewProfile) : ''} onChange={e => setPreviewProfile(e.target.value ? JSON.parse(e.target.value) : null)}>
                  <option value="">👁️ Preview as Student...</option>
                  {DEMO_PROFILES.map((p, i) => <option key={i} value={JSON.stringify(p)}>🧪 {p.label}</option>)}
                </select>
                {previewProfile && (
                  <span className="ad-preview-badge">
                    {liveEntities.year === previewProfile.year || liveEntities.department === previewProfile.department
                      ? '✅ Would receive' : '❌ Would NOT receive'}
                  </span>
                )}
              </div>

              <div className="composer-actions">
                <span className="composer-hint">
                  {highlightedWords.length > 0
                    ? `AI detected: ${highlightedWords.slice(0, 5).join(', ')}`
                    : 'AI will extract audience filters automatically'}
                </span>
                <button id="broadcast-send" type="submit" className="btn btn-primary" disabled={sending || !message.trim()}>
                  {sending ? <><span className="spinner"></span> Analyzing...</> : <><HiPaperAirplane /> Send</>}
                </button>
              </div>
            </form>

            {/* Result */}
            {result?.broadcast && (
              <div className="entities-preview">
                <div className="entities-title">🧠 AI Extracted Entities</div>
                <div className="entities-grid">
                  {result.broadcast.entities?.year && <div className="entity-item"><span className="entity-label">Year</span><span className="entity-value">{result.broadcast.entities.year}</span></div>}
                  {result.broadcast.entities?.department && <div className="entity-item"><span className="entity-label">Department</span><span className="entity-value">{result.broadcast.entities.department}</span></div>}
                  {result.broadcast.entities?.interests?.length > 0 && <div className="entity-item"><span className="entity-label">Interests</span><span className="entity-value">{result.broadcast.entities.interests.join(', ')}</span></div>}
                  {result.broadcast.entities?.urgency && <div className="entity-item"><span className="entity-label">Urgency</span><span className="entity-value">{result.broadcast.entities.urgency}</span></div>}
                  <div className="entity-item"><span className="entity-label">Matched</span><span className="entity-value">{result.broadcast.matchedCount} users</span></div>
                </div>
              </div>
            )}
          </div>

          {/* Audience Charts (Spec #3) */}
          {message.trim() && (
            <div className="card animate-in" style={{ marginTop: '1rem' }}>
              <div className="card-header"><h2 className="card-title">📊 Live Audience Preview</h2></div>
              <div className="ad-charts-row">
                <div className="ad-chart-box">
                  <div className="ad-chart-label">By Year</div>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={audienceDist.yearDist}>
                      <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--text-primary)' }} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {audienceDist.yearDist.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="ad-chart-box">
                  <div className="ad-chart-label">By Department</div>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={audienceDist.deptDist.filter(d => d.value > 0)} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={2}>
                        {audienceDist.deptDist.filter(d => d.value > 0).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--text-primary)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ══ RIGHT: History + Feedback ══ */}
        <div>
          <div className="card animate-in">
            <div className="card-header"><h2 className="card-title">📋 Broadcast History</h2></div>
            {history.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon">📭</div><h3>No broadcasts yet</h3><p>Compose your first message</p></div>
            ) : (
              <div className="broadcast-list">
                {history.map(b => {
                  const readPct = b.deliveryStats?.targeted > 0 ? Math.round((b.engagementStats?.readCount || 0) / b.deliveryStats.targeted * 100) : 0;
                  const totalFb = (b.engagementStats?.relevantCount || 0) + (b.engagementStats?.irrelevantCount || 0);
                  const relPct = totalFb > 0 ? Math.round((b.engagementStats?.relevantCount || 0) / totalFb * 100) : null;
                  const irrelPct = relPct !== null ? 100 - relPct : null;
                  const tweaks = getTweaks(b);
                  const isExpanded = activeHistoryId === b._id;

                  return (
                    <div key={b._id} className={`broadcast-item ${isExpanded ? 'ad-expanded' : ''}`}>
                      <div className="broadcast-item-header">
                        <div className="broadcast-message">{b.rawMessage}</div>
                        <span className={`status-badge ${b.status}`}>{b.status}</span>
                      </div>
                      {/* Stats row (Spec #8) */}
                      <div className="broadcast-meta">
                        <span className="broadcast-stat"><HiUsers /> {b.deliveryStats?.targeted || 0}</span>
                        <span className="broadcast-stat"><HiEye /> {readPct}%</span>
                        {relPct !== null && <span className="broadcast-stat"><HiThumbUp /> {relPct}%</span>}
                        {irrelPct !== null && irrelPct > 30 && <span className="broadcast-stat" style={{ color: 'var(--danger)' }}><HiThumbDown /> {irrelPct}%</span>}
                        <span>{formatTime(b.createdAt)}</span>
                        <button className="sn-why-btn" onClick={() => setActiveHistoryId(isExpanded ? null : b._id)} style={{ marginLeft: 'auto' }}>
                          Details <HiChevronDown size={12} className={isExpanded ? 'sn-chevron-open' : ''} />
                        </button>
                      </div>
                      {/* Expanded: segment details + feedback loop (Spec #6, #9) */}
                      {isExpanded && (
                        <div className="ad-history-detail animate-in">
                          {b.extractedEntities && (
                            <div className="ad-chips-row" style={{ marginBottom: '0.5rem' }}>
                              {b.extractedEntities.year && <span className="ad-chip ad-chip-year">Year {b.extractedEntities.year}</span>}
                              {b.extractedEntities.department && <span className="ad-chip ad-chip-dept">{b.extractedEntities.department}</span>}
                              {b.extractedEntities.interests?.map((i, idx) => <span key={idx} className="ad-chip ad-chip-interest">{i}</span>)}
                            </div>
                          )}
                          <div className="ad-feedback-row">
                            <div className="ad-feedback-bar">
                              <div className="ad-fb-fill ad-fb-rel" style={{ width: `${relPct || 0}%` }}>{relPct}% Rel</div>
                              <div className="ad-fb-fill ad-fb-irrel" style={{ width: `${irrelPct || 0}%` }}>{irrelPct}% Irr</div>
                            </div>
                          </div>
                          {/* ML suggestions (Spec #6) */}
                          {tweaks.map((t, i) => (
                            <div key={i} className={`ad-hint ad-hint-${t.type}`}>{t.text}</div>
                          ))}
                          {b.deliveryStats?.failed > 0 && (
                            <div className="ad-hint ad-hint-warn">❌ {b.deliveryStats.failed} delivery failures detected.</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
