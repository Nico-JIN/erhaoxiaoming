import { GoogleGenAI } from "@google/genai";

// Ensure API Key is present (mock check for demo purposes, real app checks env)
const API_KEY = process.env.API_KEY || '';

// Initialize only if key exists to prevent crash on immediate load if missing
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

export const enhanceContent = async (text: string, instruction: string): Promise<string> => {
  if (!ai) {
    console.warn("Gemini API Key missing.");
    return "AI features unavailable without API Key.";
  }

  try {
    const model = ai.models;
    const response = await model.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Task: ${instruction}\n\nInput Text:\n${text}`,
      config: {
        systemInstruction: "You are an expert editor for a knowledge platform. Improve clarity, tone, and formatting.",
      }
    });
    
    return response.text || text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return text; // Fallback to original
  }
};

export const generateSummary = async (text: string): Promise<string> => {
  if (!ai) return "Summary unavailable.";
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Summarize this article in 2-3 engaging sentences for a preview card:\n${text}`,
    });
    return response.text || "";
  } catch (error) {
    return "";
  }
};