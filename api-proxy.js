// api-proxy.js - Deploy as GitHub Pages or Vercel/Netlify function
export default async function handler(request, response) {
  // Only allow POST requests
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { content } = await request.json();
    
    if (!content) {
      return response.status(400).json({ error: 'No content provided' });
    }

    // Get API key from environment variable (stored in GitHub Secrets)
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return response.status(500).json({ error: 'Server configuration error' });
    }

    // Forward request to Gemini
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `Transform this into a structured note: ${content}` }]
          }]
        })
      }
    );

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const data = await geminiResponse.json();
    
    // Return formatted response
    return response.status(200).json({
      title: data.candidates?.[0]?.content?.parts?.[0]?.text?.split('\n')[0]?.slice(0, 50) || 'Enhanced Note',
      content: data.candidates?.[0]?.content?.parts?.[0]?.text || content,
      tags: ['ai-enhanced', 'note']
    });

  } catch (error) {
    console.error('Proxy error:', error);
    return response.status(500).json({ 
      error: 'Failed to process request',
      details: error.message 
    });
  }
}
