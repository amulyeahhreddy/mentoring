import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in environment variables');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Constants for API configuration
export const WHISPER_MODEL = 'whisper-1';
export const GPT_MODEL = 'gpt-4o-mini'; // Use GPT-4 mini for cost efficiency
console.log("Loaded API key:", process.env.OPENAI_API_KEY);