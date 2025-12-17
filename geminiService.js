import { GoogleGenAI, Type } from "@google/genai";

export const enhanceNoteWithGemini = async (rawContent) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Act as an Obsidian Note Architect. Transform the following raw thought into a structured markdown note.
      Return ONLY a JSON object with:
      - title: A creative, descriptive filename (no extension)
      - content: The polished markdown body
      - tags: Array of 3-5 relevant #tags (kebab-case)
      
      Raw Thought: ${rawContent}`,
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
