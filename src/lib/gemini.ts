
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const generateHealthSummary = async (data: any, language: 'en' | 'vi' = 'vi') => {
  const model = ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Analyze the following health data and provide a summary, 3 potential risks, and 3 recommendations in ${language === 'vi' ? 'Vietnamese' : 'English'}.
    Data: ${JSON.stringify(data)}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          risks: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["summary", "risks", "recommendations"]
      }
    }
  });

  const response = await model;
  let text = response.text || '{}';
  if (text.startsWith('```json')) {
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
  } else if (text.startsWith('```')) {
    text = text.replace(/```/g, '').trim();
  }
  return JSON.parse(text);
};

export const chatWithHealthAssistant = async (message: string, recentData: any, language: 'en' | 'vi' = 'vi') => {
  const model = ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `You are a personalized health assistant. Answer the user's question based on their recent health data.
    User Message: "${message}"
    Recent Data: ${JSON.stringify(recentData)}
    Language: ${language === 'vi' ? 'Vietnamese' : 'English'}`,
  });

  const response = await model;
  return response.text;
};
