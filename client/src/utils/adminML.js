/**
 * Admin-side Smart ML Engine — Client-side mock for:
 * - Live entity extraction from text (chips)
 * - Audience reach prediction
 * - Text quality hints (tone, missing info)
 * - A/B variant comparison
 * - Peak engagement time suggestion
 * - "Why this audience?" explainability
 * - Feedback-loop audience tweak suggestions
 *
 * In production, the heavy extraction is done server-side via OpenAI.
 * This client-side mock enables live preview as the admin types.
 */

// ── Department & keyword maps ──
const DEPT_MAP = {
  'ai&ds': 'AIDS', 'aids': 'AIDS', 'ai and ds': 'AIDS',
  'ai&ml': 'AIML', 'aiml': 'AIML', 'ai and ml': 'AIML',
  'cse': 'CSE', 'computer science': 'CSE',
  'ece': 'ECE', 'electronics': 'ECE',
  'me': 'ME', 'mechanical': 'ME',
  'ce': 'CE', 'civil': 'CE',
  'eee': 'EEE', 'electrical': 'EEE',
  'it': 'IT', 'information technology': 'IT',
  'biotech': 'BioTech', 'biotechnology': 'BioTech',
};

const INTEREST_KEYWORDS = [
  'dance', 'coding', 'robotics', 'music', 'sports', 'photography',
  'art', 'drama', 'singing', 'gaming', 'chess', 'debate', 'quiz',
  'hackathon', 'workshop', 'seminar', 'cultural', 'tech',
];

const LOCATION_KEYWORDS = [
  'auditorium', 'library', 'cafeteria', 'lab', 'sports complex',
  'hostel', 'seminar hall', 'main gate', 'campus', 'ground',
];

const URGENCY_MAP = {
  high: ['urgent', 'immediately', 'asap', 'right now', 'emergency', 'critical'],
  low: ['whenever', 'convenience', 'no rush', 'leisure', 'optional'],
};

// ── Student population mock (for reach prediction) ──
const STUDENT_POPULATION = {
  total: 500,
  byYear: { 1: 150, 2: 130, 3: 120, 4: 100 },
  byDept: { CSE: 80, AIDS: 70, AIML: 60, ECE: 55, ME: 50, CE: 40, EEE: 35, IT: 30, BioTech: 20 },
  byInterest: { dance: 85, coding: 120, robotics: 45, music: 70, sports: 95, photography: 40, hackathon: 60, workshop: 50 },
};

// ─────────────────────────────────────────────
// 1) Live entity extraction from text (Spec #1)
// ─────────────────────────────────────────────
export function extractLiveEntities(text) {
  const lower = text.toLowerCase();
  const entities = {
    year: null,
    department: null,
    interests: [],
    location: null,
    urgency: 'medium',
    category: 'General',
  };

  // Year
  if (/first[- ]?year|1st[- ]?year|\byear 1\b/.test(lower)) entities.year = 1;
  else if (/second[- ]?year|2nd[- ]?year|\byear 2\b/.test(lower)) entities.year = 2;
  else if (/third[- ]?year|3rd[- ]?year|\byear 3\b/.test(lower)) entities.year = 3;
  else if (/fourth[- ]?year|4th[- ]?year|final[- ]?year|\byear 4\b/.test(lower)) entities.year = 4;

  // Department
  for (const [key, val] of Object.entries(DEPT_MAP)) {
    if (lower.includes(key)) { entities.department = val; break; }
  }

  // Interests
  entities.interests = INTEREST_KEYWORDS.filter(k => lower.includes(k));

  // Location
  const foundLocation = LOCATION_KEYWORDS.find(k => lower.includes(k));
  if (foundLocation) entities.location = foundLocation;

  // Urgency
  if (URGENCY_MAP.high.some(k => lower.includes(k))) entities.urgency = 'high';
  else if (URGENCY_MAP.low.some(k => lower.includes(k))) entities.urgency = 'low';

  // Category auto-detect
  if (/exam|test|assignment|deadline|submission|grade|marks|result/.test(lower)) {
    entities.category = 'Academic';
  } else if (/event|fest|competition|tournament|concert|show|exhibition/.test(lower)) {
    entities.category = 'Event';
  } else if (/club|society|membership|registration/.test(lower)) {
    entities.category = 'Club';
  } else if (/urgent|emergency|critical|safety/.test(lower)) {
    entities.category = 'Alert';
  }

  return entities;
}

// ─────────────────────────────────────────────
// 2) Predict reach & relevance (Spec #1)
// ─────────────────────────────────────────────
export function predictReach(entities) {
  let reach = STUDENT_POPULATION.total;
  const filters = [];

  if (entities.year) {
    reach = Math.min(reach, STUDENT_POPULATION.byYear[entities.year] || 100);
    filters.push(`Year ${entities.year}`);
  }
  if (entities.department) {
    reach = Math.min(reach, STUDENT_POPULATION.byDept[entities.department] || 50);
    filters.push(entities.department);
  }
  if (entities.interests.length > 0) {
    const interestReach = entities.interests.reduce((sum, i) =>
      sum + (STUDENT_POPULATION.byInterest[i] || 20), 0);
    reach = Math.min(reach, interestReach);
    filters.push(...entities.interests);
  }

  // Cross-filter reduction
  if (filters.length > 1) reach = Math.max(Math.floor(reach * 0.6), 3);

  const relevancePct = entities.year || entities.department || entities.interests.length > 0
    ? Math.min(75 + Math.floor(Math.random() * 20), 95)
    : 40 + Math.floor(Math.random() * 15);

  return { reach, relevancePct, filters, total: STUDENT_POPULATION.total };
}

// ─────────────────────────────────────────────
// 3) Audience distribution for charts (Spec #3)
// ─────────────────────────────────────────────
export function getAudienceDistribution(entities) {
  const yearDist = Object.entries(STUDENT_POPULATION.byYear).map(([yr, count]) => ({
    name: `Year ${yr}`,
    value: entities.year ? (parseInt(yr) === entities.year ? count : 0) : count,
    fill: parseInt(yr) === entities.year ? '#6c5ce7' : '#2d2d4a',
  }));

  const deptDist = Object.entries(STUDENT_POPULATION.byDept).map(([dept, count]) => ({
    name: dept,
    value: entities.department ? (dept === entities.department ? count : 0) : count,
    fill: dept === entities.department ? '#00cec9' : '#2d2d4a',
  }));

  return { yearDist, deptDist };
}

// ─────────────────────────────────────────────
// 4) "Why this audience?" (Spec #4)
// ─────────────────────────────────────────────
export function explainAudience(entities) {
  const reasons = [];

  if (entities.year) {
    reasons.push({ icon: '📅', text: `Year ${entities.year} detected — filtering to ${STUDENT_POPULATION.byYear[entities.year] || '?'} students.` });
  }
  if (entities.department) {
    reasons.push({ icon: '🏛️', text: `Department "${entities.department}" matched — ${STUDENT_POPULATION.byDept[entities.department] || '?'} students in pool.` });
  }
  if (entities.interests.length > 0) {
    reasons.push({ icon: '🎯', text: `Interest tags [${entities.interests.join(', ')}] matched against student profiles.` });
  }
  if (entities.location) {
    reasons.push({ icon: '📍', text: `Location "${entities.location}" detected — geo-filter applied (0.5km radius).` });
  }
  if (entities.urgency === 'high') {
    reasons.push({ icon: '⚡', text: 'Urgency: HIGH — will be prioritized in student feeds with glow effect.' });
  }
  if (reasons.length === 0) {
    reasons.push({ icon: '🌐', text: 'No specific filters detected — this will broadcast to ALL students.' });
  }

  return reasons;
}

// ─────────────────────────────────────────────
// 5) Text quality hints (Spec #10)
// ─────────────────────────────────────────────
export function getTextHints(text) {
  const hints = [];
  const lower = text.toLowerCase();

  if (text.length < 20 && text.length > 0) {
    hints.push({ type: 'warn', text: 'Message seems too short. Add more context for better targeting.' });
  }

  // Missing deadline
  if (/submit|deadline|assignment|exam/.test(lower) && !/\d{1,2}[\/\-]\d{1,2}|\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)|today|tomorrow|tonight/.test(lower)) {
    hints.push({ type: 'warn', text: '⏰ Mentions a deadline but no date specified. Consider adding when.' });
  }

  // Missing location
  if (/come|visit|attend|gather|report|reach/.test(lower) && !LOCATION_KEYWORDS.some(k => lower.includes(k))) {
    hints.push({ type: 'warn', text: '📍 Suggests a physical action but no location mentioned.' });
  }

  // Tone check
  if (/!!!|[A-Z]{5,}/.test(text)) {
    hints.push({ type: 'info', text: '📢 Tone: Multiple exclamation marks or ALL CAPS detected — consider a calmer tone.' });
  }

  if (text.length > 500) {
    hints.push({ type: 'info', text: '📝 Long message — students may skip. Consider a shorter summary.' });
  }

  if (text.length > 0 && hints.length === 0) {
    hints.push({ type: 'success', text: '✅ Message looks good — clear and well-structured.' });
  }

  return hints;
}

// ─────────────────────────────────────────────
// 6) Highlight AI-detected words (Spec #13)
// ─────────────────────────────────────────────
export function getHighlightedWords(text) {
  const words = new Set();
  const lower = text.toLowerCase();

  // Find year mentions
  const yearPatterns = [/first[- ]?year/g, /second[- ]?year/g, /third[- ]?year/g, /fourth[- ]?year/g, /final[- ]?year/g, /1st[- ]?year/g, /2nd[- ]?year/g, /3rd[- ]?year/g, /4th[- ]?year/g];
  yearPatterns.forEach(p => { const m = lower.match(p); if (m) m.forEach(w => words.add(w)); });

  // Departments
  Object.keys(DEPT_MAP).forEach(k => { if (lower.includes(k)) words.add(k); });

  // Interests
  INTEREST_KEYWORDS.forEach(k => { if (lower.includes(k)) words.add(k); });

  // Locations
  LOCATION_KEYWORDS.forEach(k => { if (lower.includes(k)) words.add(k); });

  // Urgency
  [...URGENCY_MAP.high, ...URGENCY_MAP.low].forEach(k => { if (lower.includes(k)) words.add(k); });

  return [...words];
}

// ─────────────────────────────────────────────
// 7) Peak engagement time (Spec #7)
// ─────────────────────────────────────────────
export function suggestPeakTime() {
  const now = new Date();
  const hour = now.getHours();

  // Simulated peak engagement hours
  const peaks = [
    { hour: 9, label: '9:00 AM', reason: 'Morning check — students review notifications before classes.' },
    { hour: 12, label: '12:00 PM', reason: 'Lunch break — highest mobile engagement window.' },
    { hour: 18, label: '6:00 PM', reason: 'Post-class — students catch up on all notifications.' },
  ];

  // Find next peak
  const nextPeak = peaks.find(p => p.hour > hour) || peaks[0];
  return { ...nextPeak, isNow: Math.abs(hour - nextPeak.hour) <= 1 };
}

// ─────────────────────────────────────────────
// 8) A/B variant comparison (Spec #11)
// ─────────────────────────────────────────────
export function compareVariants(textA, textB) {
  const entA = extractLiveEntities(textA);
  const entB = extractLiveEntities(textB);
  const reachA = predictReach(entA);
  const reachB = predictReach(entB);

  return {
    a: { text: textA, entities: entA, reach: reachA.reach, relevance: reachA.relevancePct },
    b: { text: textB, entities: entB, reach: reachB.reach, relevance: reachB.relevancePct },
    winner: reachA.relevancePct >= reachB.relevancePct ? 'A' : 'B',
    insight: reachA.reach > reachB.reach
      ? 'Variant A has wider reach.'
      : reachB.reach > reachA.reach
        ? 'Variant B has wider reach.'
        : 'Both variants have similar reach.',
  };
}

// ─────────────────────────────────────────────
// 9) Feedback loop — suggest audience tweaks (Spec #6)
// ─────────────────────────────────────────────
export function suggestAudienceTweaks(engagementStats) {
  const suggestions = [];
  const { readCount = 0, relevantCount = 0, irrelevantCount = 0 } = engagementStats || {};
  const totalFeedback = relevantCount + irrelevantCount;

  if (totalFeedback === 0) {
    suggestions.push({ type: 'info', text: 'No feedback yet — encourage students to rate notifications.' });
    return suggestions;
  }

  const relPct = Math.round((relevantCount / totalFeedback) * 100);
  const irrelPct = 100 - relPct;

  if (irrelPct > 60) {
    suggestions.push({ type: 'warn', text: `⚠️ ${irrelPct}% marked irrelevant. Consider narrowing your audience — add year or department filters.` });
  }
  if (irrelPct > 40 && irrelPct <= 60) {
    suggestions.push({ type: 'info', text: `📊 ${irrelPct}% irrelevant. Try adding interest-based targeting for better accuracy.` });
  }
  if (relPct >= 80) {
    suggestions.push({ type: 'success', text: `🎯 ${relPct}% relevant — excellent targeting! Keep using similar audience filters.` });
  }
  if (readCount === 0) {
    suggestions.push({ type: 'warn', text: '📭 Zero reads — consider resending at a different time or increasing urgency.' });
  }

  return suggestions;
}

// ─────────────────────────────────────────────
// 10) Priority label mapping (Spec #2)
// ─────────────────────────────────────────────
export function getPriorityConfig(urgency) {
  switch (urgency) {
    case 'high': return { label: 'URG', cssClass: 'priority-urg', color: '#ff6b6b' };
    case 'medium': return { label: 'IMP', cssClass: 'priority-imp', color: '#fdcb6e' };
    default: return { label: 'GEN', cssClass: 'priority-gen', color: '#74b9ff' };
  }
}

export function getCategoryConfig(category) {
  switch (category) {
    case 'Academic': return { label: 'ACAD', icon: '📚', color: '#6c5ce7' };
    case 'Event': return { label: 'EVENT', icon: '🎪', color: '#00cec9' };
    case 'Club': return { label: 'CLUB', icon: '🏷️', color: '#a29bfe' };
    case 'Alert': return { label: 'ALERT', icon: '🚨', color: '#ff6b6b' };
    default: return { label: 'GEN', icon: '📢', color: '#74b9ff' };
  }
}
