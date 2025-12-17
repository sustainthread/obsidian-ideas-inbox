import { GoogleGenAI, Type } from "@google/genai";

export const enhanceNoteWithGemini = async (rawContent) => {
  // Retrieve the key from localStorage where App.js stores it
  const settings = JSON.parse(localStorage.getItem('obsidian-inbox-settings') || '{}');
  const apiKey = settings.apiKey;

  if (!apiKey) {
    throw new Error("Missing API Key. Please add it in settings.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{
      role: "user",
      parts: [{
        text: `Act as an Obsidian Note Architect. Transform the following raw thought into a structured markdown note.
        Return ONLY a JSON object with:
        - title: A creative, descriptive filename (no extension)
        - content: The polished markdown body
        - tags: Array of 3-5 relevant #tags (kebab-case)
        
        Raw Thought: ${rawContent}`
      }]
    }],
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: {
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

  // The SDK's response.text() is a helper that returns the stringified JSON
  return JSON.parse(response.text);
};
