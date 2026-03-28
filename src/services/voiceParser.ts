import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function parseVoiceInput(transcript: string, fieldType: 'number' | 'date' | 'text' | 'choice', options?: string[]) {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY not found, falling back to basic parsing");
    return null;
  }

  try {
    const prompt = `
      You are a specialized voice input parser for a Camino de Santiago pilgrimage app.
      Your task is to convert raw speech transcripts into a clean, structured format for the field type: ${fieldType}.
      
      Transcript: "${transcript}"
      
      Rules:
      - If type is 'number', extract ONLY the numeric value as a number. (e.g., "about five miles" -> 5, "I am forty two" -> 42).
      - If type is 'date', convert to YYYY-MM-DD format ONLY. (e.g., "April twenty-sixth twenty twenty-six" -> 2026-04-26, "next Monday" -> calculate based on today's date: ${new Date().toISOString().split('T')[0]}).
      - If type is 'choice', match it to one of these options: [${options?.join(', ')}]. Return the exact string from the options.
      - If type is 'text', return a clean, capitalized version of the location or name.
      
      Return ONLY the raw value. No sentences, no explanations, no labels.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        temperature: 0.1,
      }
    });

    const result = response.text?.trim();
    
    if (fieldType === 'number') {
      const num = parseFloat(result || '');
      return isNaN(num) ? null : num;
    }
    
    return result;
  } catch (error) {
    console.error("Error parsing voice input with Gemini:", error);
    return null;
  }
}
