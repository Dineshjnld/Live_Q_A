import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API_KEY environment variable not set. Gemini moderation will not work.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export const isContentInappropriate = async (text: string): Promise<boolean> => {
  if (!API_KEY) {
    // If no API key, default to allowing content.
    return false;
  }

  try {
    const prompt = `You are a content moderation AI. Your task is to determine if the following text is inappropriate for a live, public event. Inappropriate content includes profanity, hate speech, threats, harassment, or sexually explicit language. Respond with ONLY the word "true" if the content is inappropriate, and ONLY the word "false" if it is appropriate. Do not add any explanation. Text: "${text}"`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            temperature: 0,
            maxOutputTokens: 5,
            thinkingConfig: { thinkingBudget: 0 }
        }
    });

    const resultText = response.text.trim().toLowerCase();
    return resultText === 'true';
  } catch (error) {
    console.error("Error with Gemini API moderation:", error);
    // In case of API error, default to allowing content to not block users.
    return false;
  }
};