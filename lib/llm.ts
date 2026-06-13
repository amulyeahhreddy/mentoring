import Groq from 'groq-sdk'

// Shared Groq client — import this everywhere instead of instantiating inline
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

/**
 * Call the LLM and return the raw response string.
 * Always requests JSON output format.
 * Always uses the model from LLM_MODEL env var, defaulting to llama-3.3-70b-versatile.
 */
export async function callLLM(
  userPrompt: string,
  systemPrompt: string,
  maxTokens: number = 2048
): Promise<string> {
  const response = await groq.chat.completions.create({
    model: process.env.LLM_MODEL ?? 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: maxTokens,
  })
  return response.choices[0].message.content ?? ''
}

export { groq }
