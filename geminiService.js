// geminiService.js - Now calls YOUR secure proxy
const PROXY_URL = 'https://your-username.github.io/obsidian-ideas-inbox/api'; // Change this

export const enhanceNoteWithGemini = async (rawContent) => {
  try {
    if (!rawContent || rawContent.trim().length < 3) {
      throw new Error("Note is too short. Please write a bit more.");
    }

    console.log('Sending to secure proxy...');
    
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: rawContent })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const result = await response.json();
    
    // Validate and clean the response
    return {
      title: result.title || 'Enhanced Note',
      content: result.content || rawContent,
      tags: Array.isArray(result.tags) ? result.tags : ['ai-enhanced', 'note']
    };

  } catch (error) {
    console.error('Proxy service error:', error);
    
    // Fallback to local processing
    console.log('Falling back to local processing');
    return {
      title: rawContent.split('\n')[0]?.slice(0, 50) || 'My Note',
      content: rawContent,
      tags: ['note', 'idea', 'local-fallback']
    };
  }
};
