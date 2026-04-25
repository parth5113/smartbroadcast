const OpenAI = require('openai');

let openai = null;

try {
  if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('placeholder')) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log('✅ OpenAI client initialized');
  } else {
    console.warn('⚠️  OpenAI API key not set — AI extraction will use fallback mode');
  }
} catch (err) {
  console.warn('⚠️  OpenAI init failed:', err.message);
}

module.exports = openai;
