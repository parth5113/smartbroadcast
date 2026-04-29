/**
 * Smart ML Engine — Client-side mock for relevance scoring,
 * explainability, feedback-loop tuning, and AI digest.
 *
 * In production this would call a backend ML microservice.
 */

// ── Keyword associations for contextual matching ──
const KEYWORD_MAP = {
  HPC: ['hpc', 'high performance', 'computing', 'cluster', 'parallel', 'gpu'],
  AI: ['ai', 'artificial intelligence', 'machine learning', 'deep learning', 'neural', 'model'],
  coding: ['coding', 'hackathon', 'code', 'programming', 'competitive', 'dsa', 'leetcode'],
  robotics: ['robotics', 'robot', 'arduino', 'iot', 'embedded', 'drone'],
  dance: ['dance', 'choreography', 'cultural', 'fest', 'performance'],
  music: ['music', 'band', 'concert', 'singing', 'instrument'],
  sports: ['sports', 'cricket', 'football', 'basketball', 'athletics', 'tournament'],
  photography: ['photography', 'photo', 'camera', 'exhibition', 'visual'],
};

// ── Per-session preference weights (simulates learned prefs) ──
const prefWeights = {};

function getUserWeights(userId) {
  if (!prefWeights[userId]) {
    prefWeights[userId] = {};
  }
  return prefWeights[userId];
}

// ─────────────────────────────────────────────
// 1) Relevance scoring with confidence %
// ─────────────────────────────────────────────
export function computeRelevance(profile, notification) {
  let score = 25; // base
  const text = `${notification.title} ${notification.body}`.toLowerCase();
  const weights = getUserWeights(profile.id);
  const matchedInterests = [];

  // Interest matching
  (profile.interests || []).forEach((interest) => {
    const keywords = KEYWORD_MAP[interest.toLowerCase()] || [interest.toLowerCase()];
    const hit = keywords.some((kw) => text.includes(kw));
    if (hit) {
      const boost = weights[interest] || 0;
      score += 25 + boost;
      matchedInterests.push(interest);
    }
  });

  // Department matching
  if (
    notification.department &&
    profile.department &&
    notification.department === profile.department
  ) {
    score += 15;
  }

  // Year matching
  if (notification.year && profile.year && notification.year === profile.year) {
    score += 10;
  }

  // Urgency boost
  if (notification.urgency === 'high') score += 15;
  else if (notification.urgency === 'medium') score += 5;

  return {
    score: Math.min(Math.max(score, 5), 99),
    matchedInterests,
  };
}

// ─────────────────────────────────────────────
// 2) "Why this?" explainability
// ─────────────────────────────────────────────
export function explainWhy(profile, notification) {
  const { matchedInterests } = computeRelevance(profile, notification);
  const reasons = [];

  if (notification.urgency === 'high') {
    reasons.push('⚡ Flagged as urgent by administration — requires immediate attention.');
  }

  if (matchedInterests.length > 0) {
    reasons.push(
      `🎯 Matches your interests: ${matchedInterests.map((i) => `"${i}"`).join(', ')}.`
    );
  }

  if (
    notification.department &&
    profile.department &&
    notification.department === profile.department
  ) {
    reasons.push(`🏛️ Targeted to your department (${profile.department}).`);
  }

  if (notification.year && profile.year && notification.year === profile.year) {
    reasons.push(`📅 Relevant to Year ${profile.year} students.`);
  }

  if (reasons.length === 0) {
    reasons.push('📊 Trending topic with high engagement across campus.');
  }

  return reasons;
}

// ─────────────────────────────────────────────
// 3) Feedback loop — tune per-session weights
// ─────────────────────────────────────────────
export function tunePreferences(userId, action, notification) {
  const weights = getUserWeights(userId);
  const text = `${notification.title} ${notification.body}`.toLowerCase();

  // Find which interests were in this notification
  Object.entries(KEYWORD_MAP).forEach(([interest, keywords]) => {
    const hit = keywords.some((kw) => text.includes(kw));
    if (hit) {
      if (!weights[interest]) weights[interest] = 0;
      if (action === 'relevant' || action === 'save') {
        weights[interest] = Math.min(weights[interest] + 5, 30);
      } else if (action === 'irrelevant' || action === 'mute') {
        weights[interest] = Math.max(weights[interest] - 8, -30);
      } else if (action === 'read') {
        weights[interest] = Math.min(weights[interest] + 2, 30);
      }
    }
  });

  console.log(`[SmartML] Tuned preferences for user ${userId}:`, { ...weights });
}

// ─────────────────────────────────────────────
// 4) AI Digest — 2-line summary
// ─────────────────────────────────────────────
export function generateDigest(notifications, profile) {
  const unread = notifications.filter((n) => !n.read);
  const urgent = notifications.filter((n) => n.urgency === 'high' && !n.read);

  // Find top relevant match
  let topMatch = null;
  let topScore = 0;
  unread.forEach((n) => {
    const { score } = computeRelevance(profile, n);
    if (score > topScore) {
      topScore = score;
      topMatch = n;
    }
  });

  const line1 = urgent.length > 0
    ? `🔴 ${urgent.length} urgent alert${urgent.length > 1 ? 's' : ''} requiring attention.`
    : `You have ${unread.length} new notification${unread.length !== 1 ? 's' : ''}.`;

  const line2 = topMatch
    ? `Top match: "${topMatch.title}" (${topScore}% relevant).`
    : 'All caught up — no high-priority items right now.';

  return { line1, line2 };
}

// ─────────────────────────────────────────────
// 5) Priority mapping
// ─────────────────────────────────────────────
export function getPriorityTag(urgency) {
  switch (urgency) {
    case 'high': return { label: 'URG', color: 'priority-urg' };
    case 'medium': return { label: 'IMP', color: 'priority-imp' };
    default: return { label: 'GEN', color: 'priority-gen' };
  }
}

// ─────────────────────────────────────────────
// 6) Semantic search (client-side fuzzy)
// ─────────────────────────────────────────────
export function semanticSearch(notifications, query) {
  if (!query.trim()) return notifications;
  const q = query.toLowerCase().trim();
  const terms = q.split(/\s+/);

  return notifications
    .map((n) => {
      const text = `${n.title} ${n.body} ${n.urgency || ''} ${n.department || ''}`.toLowerCase();
      let matchCount = terms.filter((t) => text.includes(t)).length;
      return { ...n, _searchScore: matchCount / terms.length };
    })
    .filter((n) => n._searchScore > 0)
    .sort((a, b) => b._searchScore - a._searchScore);
}

// ─────────────────────────────────────────────
// 7) Time grouping helpers
// ─────────────────────────────────────────────
export function getTimeGroup(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = d - now;
  const diffMins = Math.floor(Math.abs(diffMs) / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Future events
  if (diffMs > 0) {
    if (diffDays === 0) return 'Upcoming Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return 'This Week';
    return 'Later';
  }

  // Past events
  if (diffMins < 60) return 'Just Now';
  if (diffHours < 24) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays <= 7) return 'This Week';
  return 'Earlier';
}

export function formatRelativeTime(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;

  // Future
  if (diffMs < 0) {
    const futureMins = Math.floor(Math.abs(diffMs) / 60000);
    if (futureMins < 60) return `in ${futureMins}m`;
    const futureHrs = Math.floor(futureMins / 60);
    if (futureHrs < 24) return `in ${futureHrs}h`;
    const futureDays = Math.floor(futureHrs / 24);
    return `in ${futureDays}d`;
  }

  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays <= 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
