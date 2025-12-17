// geminiService.js - COMPLETE WORKING VERSION
// This uses local processing since you don't have an API key configured

/**
 * Enhanced note processing function
 * @param {string} rawContent - The raw note content
 * @returns {Promise<{title: string, content: string, tags: string[]}>}
 */
export const enhanceNoteWithGemini = async (rawContent) => {
  try {
    console.log('[GeminiService] Processing note:', rawContent.substring(0, 50) + '...');
    
    // Validate input
    if (!rawContent || typeof rawContent !== 'string') {
      throw new Error('Invalid input: Please provide text content');
    }
    
    const trimmedContent = rawContent.trim();
    
    if (trimmedContent.length < 3) {
      throw new Error('Note is too short. Please write at least 3 characters.');
    }
    
    if (trimmedContent.length > 5000) {
      throw new Error('Note is too long. Please limit to 5000 characters.');
    }
    
    // Simple local enhancement (no API key needed)
    return processNoteLocally(trimmedContent);
    
  } catch (error) {
    console.error('[GeminiService] Error:', error);
    
    // Provide user-friendly error messages
    if (error.message.includes('too short')) {
      throw error;
    }
    
    if (error.message.includes('too long')) {
      throw error;
    }
    
    // Fallback to basic processing
    console.warn('[GeminiService] Using fallback processing');
    return {
      title: 'My Note',
      content: `# My Note\n\n${rawContent.trim()}`,
      tags: ['note', 'idea', 'fallback']
    };
  }
};

/**
 * Local note processing without API
 */
function processNoteLocally(content) {
  console.log('[GeminiService] Processing locally');
  
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  const firstLine = lines[0] || '';
  
  // Generate title from first line or content
  let title = firstLine
    .replace(/[#*`[\](){}<>:"/\\|?]/g, '') // Remove markdown and special chars
    .replace(/^\d+[\.\)]\s*/, '') // Remove numbered lists
    .replace(/^[-*+]\s*/, '') // Remove bullet points
    .trim()
    .slice(0, 60); // Limit length
  
  if (!title || title.length < 2) {
    // Extract from content if first line is empty
    const words = content.split(/\s+/).filter(word => word.length > 3);
    title = words.slice(0, 5).join(' ') || 'Quick Note';
  }
  
  // Format content with basic markdown
  let formattedContent = content;
  
  // Auto-detect and format lists
  const hasLists = lines.some(line => 
    line.trim().match(/^[-*+]\s/) || 
    line.trim().match(/^\d+[\.\)]\s/)
  );
  
  if (hasLists) {
    formattedContent = lines.map(line => {
      const trimmed = line.trim();
      
      // Convert bullet points to markdown
      if (trimmed.match(/^[-*+]\s/)) {
        return trimmed;
      }
      
      // Convert numbered lists
      if (trimmed.match(/^\d+[\.\)]\s/)) {
        return trimmed.replace(/^(\d+)[\.\)]/, '$1.');
      }
      
      // Add headings for lines ending with colon
      if (trimmed.endsWith(':') && trimmed.length < 50) {
        return `## ${trimmed}`;
      }
      
      return trimmed;
    }).join('\n');
  }
  
  // Add a main heading if none exists
  if (!formattedContent.startsWith('# ')) {
    formattedContent = `# ${title}\n\n${formattedContent}`;
  }
  
  // Generate relevant tags
  const tags = generateTags(content);
  
  console.log('[GeminiService] Local processing complete:', {
    titleLength: title.length,
    contentLength: formattedContent.length,
    tags: tags
  });
  
  return {
    title: title,
    content: formattedContent,
    tags: tags
  };
}

/**
 * Generate tags from content
 */
function generateTags(content) {
  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'this', 'that', 'from', 'have', 'has', 'had',
    'was', 'were', 'are', 'is', 'be', 'been', 'being', 'a', 'an', 'in', 'on',
    'at', 'to', 'of', 'by', 'as', 'or', 'but', 'not', 'so', 'if', 'then', 'else',
    'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'nor', 'too', 'very', 'can', 'will',
    'just', 'should', 'now', 'also', 'well', 'get', 'got', 'going'
  ]);
  
  // Extract words
  const words = content.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => 
      word.length > 3 && 
      !stopWords.has(word) &&
      !word.match(/^\d+$/)
    );
  
  // Count word frequency
  const wordCount = {};
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });
  
  // Get top words
  const topWords = Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
  
  // Default tags if not enough words
  const defaultTags = ['note', 'idea', 'thought'];
  
  // Combine and clean tags
  const allTags = [...new Set([...topWords, ...defaultTags])]
    .map(tag => tag.toLowerCase().replace(/\s+/g, '-'))
    .slice(0, 5);
  
  // Add content-type tag
  if (content.length < 100) {
    allTags.push('quick-note');
  } else if (content.length > 300) {
    allTags.push('detailed');
  }
  
  // Add date-based tag
  const today = new Date();
  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 
                      'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const monthTag = monthNames[today.getMonth()];
  allTags.push(monthTag);
  
  return allTags;
}

/**
 * Test function to verify the service is working
 */
export const testService = async () => {
  console.log('[GeminiService] Testing service...');
  
  const testNote = 'Meeting notes from Monday: Discussed new project timeline and resource allocation. Need to follow up with design team.';
  
  try {
    const result = await enhanceNoteWithGemini(testNote);
    console.log('[GeminiService] Test successful:', result);
    return { success: true, data: result };
  } catch (error) {
    console.error('[GeminiService] Test failed:', error);
    return { success: false, error: error.message };
  }
};

// Optional: Add this for debugging
if (typeof window !== 'undefined') {
  window.geminiService = { enhanceNoteWithGemini, testService };
  console.log('[GeminiService] Loaded and attached to window');
}
