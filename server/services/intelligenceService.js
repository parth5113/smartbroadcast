const openai = require('../config/openai');
const campusLandmarks = require('../data/campusLandmarks.json');

// Regex-based fallback when OpenAI is unavailable
function fallbackExtract(message) {
  const lower = message.toLowerCase();
  let year = null;
  if (/first[- ]?year|1st[- ]?year|\byear 1\b/.test(lower)) year = 1;
  else if (/second[- ]?year|2nd[- ]?year|\byear 2\b/.test(lower)) year = 2;
  else if (/third[- ]?year|3rd[- ]?year|\byear 3\b/.test(lower)) year = 3;
  else if (/fourth[- ]?year|4th[- ]?year|final[- ]?year|\byear 4\b/.test(lower)) year = 4;

  const deptMap = {
    'ai&ds': 'AIDS', 'aids': 'AIDS', 'ai and ds': 'AIDS', 'artificial intelligence and data science': 'AIDS',
    'ai&ml': 'AIML', 'aiml': 'AIML', 'ai and ml': 'AIML',
    'cse': 'CSE', 'computer science': 'CSE',
    'ece': 'ECE', 'electronics': 'ECE',
    'me': 'ME', 'mechanical': 'ME',
    'ce': 'CE', 'civil': 'CE',
    'eee': 'EEE', 'electrical': 'EEE',
    'it': 'IT', 'information technology': 'IT',
    'biotech': 'BioTech', 'biotechnology': 'BioTech',
  };
  let department = null;
  for (const [key, val] of Object.entries(deptMap)) {
    if (lower.includes(key)) { department = val; break; }
  }

  const interestKeywords = ['dance','coding','robotics','music','sports','photography','art','drama','singing','gaming','chess','debate','quiz'];
  const interests = interestKeywords.filter(k => lower.includes(k));

  let location = null;
  for (const lm of campusLandmarks.landmarks) {
    if (lower.includes(lm.label.toLowerCase())) {
      location = { label: lm.label, latitude: lm.latitude, longitude: lm.longitude, radiusKm: 0.5 };
      break;
    }
  }
  // Check partial matches
  if (!location) {
    const locKeywords = { 'auditorium': 'Main Auditorium', 'library': 'Central Library', 'cafeteria': 'Cafeteria', 'lab': 'Lab Block A', 'sports': 'Sports Complex', 'hostel': 'Hostel Block', 'seminar': 'Seminar Hall', 'gate': 'Main Gate' };
    for (const [key, label] of Object.entries(locKeywords)) {
      if (lower.includes(key)) {
        const lm = campusLandmarks.landmarks.find(l => l.label === label);
        if (lm) { location = { label: lm.label, latitude: lm.latitude, longitude: lm.longitude, radiusKm: 0.5 }; break; }
      }
    }
  }

  let urgency = 'medium';
  if (/urgent|immediately|asap|right now|emergency/.test(lower)) urgency = 'high';
  else if (/whenever|convenience|no rush|leisure/.test(lower)) urgency = 'low';

  return { year, department, interests, location, urgency, summary: message.substring(0, 120) };
}

const extractEntities = async (message) => {
  // If OpenAI is not available, use fallback
  if (!openai) {
    console.log('Using regex fallback for entity extraction');
    return { success: true, entities: fallbackExtract(message), mode: 'fallback' };
  }

  const landmarkList = campusLandmarks.landmarks.map(l => `${l.label}: (${l.latitude}, ${l.longitude})`).join('\n');

  const systemPrompt = `You are an entity extraction system for a university smart broadcasting system.
Extract entities from the admin's message.

CAMPUS LANDMARKS:
${landmarkList}

DEPARTMENT CODES: CSE, AIML, AIDS, ECE, ME, CE, EEE, IT, BioTech
"AI&DS"/"AI and DS" = "AIDS", "AI&ML" = "AIML", "Computer Science" = "CSE"

YEAR: "first year"=1, "second year"=2, "third year"=3, "fourth/final year"=4
INTERESTS: lowercase tags (dance, coding, robotics, music, sports, etc.)
LOCATION: Map landmarks to coordinates. Default radius 0.5 km.
URGENCY: "urgent/ASAP"="high", normal="medium", "whenever"="low"
Return null for unmentioned fields.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'broadcast_entities',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              year: { type: ['integer', 'null'] },
              department: { type: ['string', 'null'] },
              interests: { type: 'array', items: { type: 'string' } },
              location: {
                anyOf: [
                  { type: 'object', properties: { label: { type: 'string' }, latitude: { type: 'number' }, longitude: { type: 'number' }, radiusKm: { type: 'number' } }, required: ['label', 'latitude', 'longitude', 'radiusKm'], additionalProperties: false },
                  { type: 'null' },
                ],
              },
              urgency: { type: 'string', enum: ['low', 'medium', 'high'] },
              summary: { type: 'string' },
            },
            required: ['year', 'department', 'interests', 'location', 'urgency', 'summary'],
            additionalProperties: false,
          },
        },
      },
      temperature: 0.1,
    });

    const entities = JSON.parse(response.choices[0].message.content);
    return { success: true, entities, mode: 'ai' };
  } catch (error) {
    console.error('OpenAI error, using fallback:', error.message);
    return { success: true, entities: fallbackExtract(message), mode: 'fallback' };
  }
};

module.exports = { extractEntities };
