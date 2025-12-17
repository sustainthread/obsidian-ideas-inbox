import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const enhanceNoteWithGemini = async (rawContent) => {
  if (!rawContent.trim()) throw new Error("Empty content");

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze the following raw note and return JSON:
      1. title: catchy file name
      2. content: cleaned markdown
      3. tags: 3-5 relevant kebab-case tags
      Note: ${rawContent}`,
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
