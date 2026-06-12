import Groq from 'groq-sdk';

const apiKey = process.env.GROQ_API_KEY || '';
const insightKey = process.env.GROQ_KEY_INSIGHT || '';

if (!apiKey && !insightKey) {
  throw new Error('[SIMPUL SEHAT] GROQ_API_KEY atau GROQ_KEY_INSIGHT wajib diisi di .env.local untuk fitur AI');
}

// Default client (for backward compatibility)
export const groq = new Groq({
  apiKey: apiKey || insightKey,
});

// Segmented client for Auto-Insights
export const groqInsight = new Groq({
  apiKey: insightKey || apiKey,
});

