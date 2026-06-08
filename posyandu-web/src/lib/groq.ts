import Groq from 'groq-sdk';

const apiKey = process.env.GROQ_API_KEY || '';

if (!apiKey) {
  throw new Error('[SIMPUL SEHAT] GROQ_API_KEY wajib diisi di .env.local untuk fitur AI');
}

export const groq = new Groq({
  apiKey: apiKey,
});
