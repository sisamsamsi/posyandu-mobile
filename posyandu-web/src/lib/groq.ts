import Groq from 'groq-sdk';

const apiKey = process.env.GROQ_API_KEY || '';

if (!apiKey) {
  console.warn('GROQ_API_KEY is missing in environment variables. AI features will fail.');
}

export const groq = new Groq({
  apiKey: apiKey,
});
