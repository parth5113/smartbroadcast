import { useState, useEffect } from 'react';
import API from '../api';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { HiChartBar, HiUsers, HiCheckCircle, HiEye, HiThumbUp } from 'react-icons/hi';

const COLORS = ['#6c5ce7', '#00cec9', '#fdcb6e', '#ff6b6b', '#74b9ff', '#a29bfe'];

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/analytics/dashboard')
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-container"><div className="loading-overlay"><span className="spinner"></span> Loading analytics...</div></div>;
  if (!data) return <div className="page-container"><div className="empty-state"><h3>Could not load analytics</h3></div></div>;

  const feedbackData = [
    { name: 'Relevant', value: data.relevanceScore || 0 },
    { name: 'Irrelevant', value: data.totalFeedback > 0 ? 100 - data.relevanceScore : 0 },
  ];

  const deptData = data.departmentDistribution || [];

  return (
    <div className="page-container">
      <div className="section-header animate-in">
        <div>
          <h1 className="section-title">Analytics Dashboard</h1>
          <p className="section-subtitle">Engagement accuracy & broadcast performance</p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="stats-grid animate-in">
        <div className="stat-card">
          <div className="stat-icon purple"><HiChartBar /></div>
          <div><div className="stat-value">{data.sentBroadcasts}</div><div className="stat-label">Broadcasts Sent</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><HiUsers /></div>
          <div><div className="stat-value">{data.totalTargeted}</div><div className="stat-label">Total Targeted</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon teal"><HiEye /></div>
          <div><div className="stat-value">{data.readRate}%</div><div className="stat-label">Read Rate</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><HiThumbUp /></div>
          <div><div className="stat-value">{data.relevanceScore}%</div><div className="stat-label">AI Accuracy</div></div>
        </div>
      </div>

      <div className="two-col">
        {/* Relevance Pie Chart */}
        <div className="card animate-in">
          <div className="card-header">
            <h2 className="card-title">🎯 Engagement Accuracy</h2>
          </div>
          {data.totalFeedback > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem' }}>
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={feedbackData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4}>
                    <Cell fill="#00cec9" />
                    <Cell fill="#ff6b6b" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: '#00cec9', display: 'inline-block' }}></span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Relevant ({data.relevanceScore}%)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: '#ff6b6b', display: 'inline-block' }}></span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Irrelevant ({100 - data.relevanceScore}%)</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                  {data.totalFeedback} total votes
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p>No feedback data yet. Users can rate notifications as relevant/irrelevant.</p>
            </div>
          )}
        </div>

        {/* Department Distribution */}
        <div className="card animate-in">
          <div className="card-header">
            <h2 className="card-title">🏢 Department Targeting</h2>
          </div>
          {deptData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={deptData}>
                <XAxis dataKey="department" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--text-primary)' }} />
                <Bar dataKey="count" fill="#6c5ce7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state"><p>No department-specific broadcasts yet.</p></div>
          )}
        </div>
      </div>

      {/* Recent Broadcasts with Engagement */}
      <div className="card animate-in" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <h2 className="card-title">📊 Recent Broadcast Performance</h2>
        </div>
        <div className="broadcast-list">
          {data.recentBroadcasts?.map(b => {
            const readPct = b.deliveryStats?.targeted > 0 ? Math.round((b.engagementStats?.readCount || 0) / b.deliveryStats.targeted * 100) : 0;
            const totalFb = (b.engagementStats?.relevantCount || 0) + (b.engagementStats?.irrelevantCount || 0);
            const accPct = totalFb > 0 ? Math.round((b.engagementStats?.relevantCount || 0) / totalFb * 100) : null;

            return (
              <div key={b._id} className="broadcast-item">
                <div className="broadcast-message">{b.rawMessage}</div>
                <div className="broadcast-meta" style={{ marginTop: '0.5rem' }}>
                  <span className="broadcast-stat"><HiUsers /> {b.deliveryStats?.targeted || 0} targeted</span>
                  <span className="broadcast-stat"><HiEye /> {readPct}% read</span>
                  <span className="broadcast-stat"><HiThumbUp /> {accPct !== null ? `${accPct}% accurate` : 'No votes'}</span>
                  <span>{new Date(b.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
