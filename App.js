// geminiService.js
export const enhanceNoteWithGemini = async (rawContent) => {
  try {
    if (!rawContent || rawContent.trim().length < 3) {
      throw new Error("Note is too short. Please write a bit more.");
    }

    console.log('Processing note locally (no API key configured)');
    
    // Local processing fallback (since you don't have API key yet)
    const lines = rawContent.trim().split('\n');
    const firstLine = lines[0].trim();
    
    let title = firstLine
      .replace(/[<>:"/\\|?*]/g, '')
      .slice(0, 50);
    
    if (title.length < 3) {
      title = 'Quick Note';
    }
    
    let content = rawContent.trim();
    
    if (lines.length > 1) {
      content = lines.map((line, index) => {
        const trimmed = line.trim();
        if (index === 0) return `# ${trimmed}`;
        if (trimmed.length === 0) return '';
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) return trimmed;
        if (trimmed.endsWith(':')) return `## ${trimmed}`;
        return trimmed;
      }).filter(line => line.length > 0).join('\n\n');
    } else {
      content = `# ${content}`;
    }
    
    return {
      title: title,
      content: content,
      tags: ['note', 'idea', 'inbox']
    };
    
  } catch (error) {
    console.error('Processing error:', error);
    throw new Error(`Failed to process note: ${error.message}`);
  }
};
