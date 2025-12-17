import { GoogleGenAI, Type } from "@google/genai";
import { NoteData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const enhanceNoteWithGemini = async (rawContent: string): Promise<NoteData> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze this idea and return JSON with: title, content (markdown), and 3 tags. 
    Idea: ${rawContent}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          content: { type: Type.STRING },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["title", "content", "tags"]
      }
    }
  });
  return JSON.parse(response.text);
};
