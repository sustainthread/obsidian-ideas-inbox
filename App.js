// App.js - Fixed with ES module imports
import React from 'https://esm.sh/react@18';
import htm from 'https://esm.sh/htm@3.1.1';
import { 
  Settings, Sparkles, Send, Copy, Check, ArrowLeft, 
  Trash2, X, Save, FileText, Tag, Download 
} from 'https://esm.sh/lucide-react@0.263.1';

const html = htm.bind(React.createElement);

// --- App Settings ---
const DEFAULT_SETTINGS = {
  vaultName: 'Main',
  folderPath: 'Inbox'
};

const ViewState = {
  EDITING: 'EDITING',
  PREVIEW: 'PREVIEW'
};

export default function App() {
  const [text, setText] = React.useState('');
  const [settings, setSettings] = React.useState(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [viewState, setViewState] = React.useState(ViewState.EDITING);
  const [enhancedData, setEnhancedData] = React.useState(null);
  const [copyStatus, setCopyStatus] = React.useState('idle');
  const [error, setError] = React.useState(null);
  const textareaRef = React.useRef(null);

  // Load saved data
  React.useEffect(() => {
    const saved = localStorage.getItem('obsidian-inbox-settings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse settings:', e);
      }
    }
    
    const draft = localStorage.getItem('obsidian-inbox-draft');
    if (draft) setText(draft);
  }, []);

  // Auto-save draft
  React.useEffect(() => {
    const saveDraft = () => {
      localStorage.setItem('obsidian-inbox-draft', text);
    };
    
    // Debounce to prevent too frequent writes
    const timeoutId = setTimeout(saveDraft, 500);
    return () => clearTimeout(timeoutId);
  }, [text]);

  const handleSaveSettings = (s) => {
    setSettings(s);
    localStorage.setItem('obsidian-inbox-settings', JSON.stringify(s));
    setIsSettingsOpen(false);
  };

  const handleProcess = async () => {
    if (!text.trim()) {
      setError('Please enter some text to process');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      console.log('Processing note...');
      
      // Import dynamically to avoid issues
      const geminiModule = await import('./geminiService.js');
      const result = await geminiModule.enhanceNoteWithGemini(text);
      
      if (!result || !result.content) {
        throw new Error('Invalid response from processing service');
      }
      
      const enhancedNote = {
        title: result.title || 'Untitled Note',
        content: result.content || text,
        tags: Array.isArray(result.tags) ? result.tags : ['note', 'idea']
      };
      
      setEnhancedData(enhancedNote);
      setViewState(ViewState.PREVIEW);
      
    } catch (e) {
      console.error('Processing error:', e);
      setError(e.message || 'Failed to process note');
      
      // Fallback
      const fallbackData = {
        title: 'My Note',
        content: text,
        tags: ['note', 'manual']
      };
      setEnhancedData(fallbackData);
      setViewState(ViewState.PREVIEW);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSyncToObsidian = () => {
    if (!enhancedData) {
      setError('No enhanced data to sync');
      return;
    }
    
    try {
      // Prepare content for Obsidian
      const tags = enhancedData.tags
        .map(t => t.startsWith('#') ? t : '#' + t)
        .join(' ');
      
      const fullContent = `${enhancedData.content}\n\n${tags}`;
      const fileName = enhancedData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      
      // Correct Obsidian URI format
      const vault = encodeURIComponent(settings.vaultName);
      const folder = settings.folderPath.trim() || 'Inbox';
      const filePath = `${folder}/${fileName}.md`;
      
      const uri = `obsidian://advanced-uri?vault=${vault}&filepath=${encodeURIComponent(filePath)}&data=${encodeURIComponent(fullContent)}`;
      
      console.log('Opening Obsidian URI:', uri);
      
      // Try to open Obsidian
      window.open(uri, '_blank');
      
      // Show success message
      setTimeout(() => {
        alert(`Note saved to: ${folder}/${fileName}.md\n\nYou can also find it in your Obsidian vault.`);
      }, 500);
      
    } catch (e) {
      console.error('Obsidian sync error:', e);
      setError(`Failed to sync with Obsidian: ${e.message}`);
    }
  };

  const handleCopy = async () => {
    if (!enhancedData) return;
    
    try {
      const tags = enhancedData.tags
        .map(t => t.startsWith('#') ? t : '#' + t)
        .join(' ');
      const full = `${enhancedData.content}\n\n${tags}`;
      
      await navigator.clipboard.writeText(full);
      setCopyStatus('copied');
      
      setTimeout(() => {
        setCopyStatus('idle');
      }, 2000);
    } catch (e) {
      console.error('Copy failed:', e);
      setError('Failed to copy to clipboard');
    }
  };

  const handleClear = () => {
    if (!text && !enhancedData) return;
    
    const confirmed = window.confirm(
      enhancedData 
        ? 'Clear both draft and enhanced note?' 
        : 'Clear current draft?'
    );
    
    if (confirmed) {
      setText('');
      setEnhancedData(null);
      setViewState(ViewState.EDITING);
      setError(null);
      localStorage.removeItem('obsidian-inbox-draft');
    }
  };

  // Format tags for display
  const getFormattedTags = () => {
    if (!enhancedData?.tags) return [];
    return enhancedData.tags.map(tag => 
      tag.startsWith('#') ? tag : `#${tag}`
    );
  };

  return html`
    <div className="app-container">
      <!-- Error Banner -->
      ${error && html`
        <div className="error-banner">
          <div className="error-content">
            <span>⚠️ ${error}</span>
            <button onClick=${() => setError(null)} className="error-close">
              <${X} size=${16} />
            </button>
          </div>
        </div>
      `}
      
      <!-- Header -->
      <header className="app-header">
        <div className="header-left">
          <div className="logo-icon">
            <${Send} size=${20} />
          </div>
          <h1 className="app-title">IdeaInbox</h1>
        </div>
        <button 
          onClick=${() => setIsSettingsOpen(true)} 
          className="settings-button"
          aria-label="Settings"
        >
          <${Settings} size=${22} />
        </button>
      </header>

      <!-- Main Content -->
      <main className="app-main">
        ${viewState === ViewState.EDITING ? html`
          <div className="editor-container">
            <textarea 
              ref=${textareaRef}
              value=${text} 
              onChange=${e => {
                setText(e.target.value);
                setError(null);
              }} 
              disabled=${isProcessing}
              placeholder="Jot down a thought, link, or raw idea..."
              className="note-textarea"
              aria-label="Note input"
            />
            
            ${isProcessing && html`
              <div className="processing-overlay">
                <div className="processing-spinner"></div>
                <p className="processing-text">Processing with AI...</p>
              </div>
            `}
          </div>
        ` : html`
          <div className="preview-container">
            <button 
              onClick=${() => setViewState(ViewState.EDITING)} 
              className="back-button"
            >
              <${ArrowLeft} size=${14} />
              <span>Return to Editor</span>
            </button>
            
            <div className="note-preview">
              <div className="preview-header">
                <div className="preview-icon">
                  <${FileText} size=${24} />
                </div>
                <div className="preview-title-container">
                  <h3 className="preview-title">${enhancedData?.title || 'Untitled Note'}</h3>
                  <p className="preview-path">
                    Will save to: ${settings.folderPath}/${enhancedData?.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'note'}.md
                  </p>
                </div>
              </div>
              
              <div className="preview-content">
                ${enhancedData?.content || 'No content'}
              </div>
              
              ${enhancedData?.tags && enhancedData.tags.length > 0 && html`
                <div className="tags-container">
                  ${getFormattedTags().map(tag => html`
                    <span key=${tag} className="tag">
                      <${Tag} size=${10} /> ${tag}
                    </span>
                  `)}
                </div>
              `}
            </div>
          </div>
        `}
      </main>

      <!-- Footer -->
      <footer className="app-footer">
        ${viewState === ViewState.EDITING ? html`
          <div className="editor-footer">
            <button 
              onClick=${handleClear} 
              disabled=${!text || isProcessing} 
              className="clear-button"
              aria-label="Clear note"
            >
              <${Trash2} size=${24} />
            </button>
            <button 
              onClick=${handleProcess} 
              disabled=${!text.trim() || isProcessing}
              className="process-button"
            >
              <${Sparkles} size=${20} />
              ${isProcessing ? 'Processing...' : 'Polish with AI'}
            </button>
          </div>
        ` : html`
          <div className="preview-footer">
            <button 
              onClick=${handleSyncToObsidian} 
              className="obsidian-button"
            >
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/1/10/2023_Obsidian_logo.svg" 
                className="obsidian-logo" 
                alt="Obsidian Logo" 
              />
              Sync to Obsidian
            </button>
            <div className="action-buttons">
              <button 
                onClick=${handleCopy} 
                className="copy-button"
              >
                <${copyStatus === 'copied' ? Check : Copy} 
                  size=${18} 
                />
                ${copyStatus === 'copied' ? 'Copied!' : 'Copy'}
              </button>
              <button 
                onClick=${() => {
                  if (!enhancedData) return;
                  const tags = getFormattedTags().join(' ');
                  const fullContent = `${enhancedData.content}\n\n${tags}`;
                  const fileName = enhancedData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                  const blob = new Blob([fullContent], { type: 'text/markdown' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${fileName}.md`;
                  a.click();
                }} 
                className="download-button"
              >
                <${Download} size=${18} /> Download .md
              </button>
            </div>
          </div>
        `}
      </footer>

      <!-- Settings Modal -->
      ${isSettingsOpen && html`
        <div className="settings-modal">
          <div className="settings-content">
            <div className="settings-header">
              <h2>Configuration</h2>
              <button 
                onClick=${() => setIsSettingsOpen(false)} 
                className="close-settings"
                aria-label="Close settings"
              >
                <${X} size=${24} />
              </button>
            </div>
            <div className="settings-body">
              <div className="setting-group">
                <label className="setting-label">
                  Obsidian Vault Name
                </label>
                <input 
                  className="setting-input" 
                  placeholder="e.g. Personal"
                  value=${settings.vaultName} 
                  onChange=${e => setSettings({...settings, vaultName: e.target.value})}
                  aria-label="Vault name"
                />
                <p className="setting-hint">
                  Must match exactly the name in Obsidian
                </p>
              </div>
              <div className="setting-group">
                <label className="setting-label">
                  Folder Path
                </label>
                <input 
                  className="setting-input" 
                  placeholder="e.g. Inbox (leave empty for vault root)"
                  value=${settings.folderPath} 
                  onChange=${e => setSettings({...settings, folderPath: e.target.value})}
                  aria-label="Folder path"
                />
                <p className="setting-hint">
                  Folder will be created if it doesn't exist
                </p>
              </div>
            </div>
            <div className="settings-footer">
              <button 
                onClick=${() => handleSaveSettings(settings)} 
                className="save-settings-button"
              >
                <${Save} size=${20} /> SAVE CHANGES
              </button>
            </div>
          </div>
        </div>
      `}
    </div>
  `;
}

// Add CSS directly to the component
const styles = document.createElement('style');
styles.textContent = `
  /* Base styles */
  .app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    max-width: 42rem;
    margin: 0 auto;
    background-color: #0a0a0a;
    color: white;
    overflow: hidden;
    position: relative;
  }
  
  /* Error Banner */
  .error-banner {
    background-color: rgba(239, 68, 68, 0.1);
    border: 1px solid #dc2626;
    color: #fecaca;
    padding: 12px 16px;
    font-size: 14px;
    font-weight: 500;
  }
  
  .error-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .error-close {
    background: none;
    border: none;
    color: #fca5a5;
    cursor: pointer;
    padding: 4px;
  }
  
  .error-close:hover {
    color: white;
  }
  
  /* Header */
  .app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid #262626;
    background-color: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(16px);
  }
  
  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .logo-icon {
    width: 2.5rem;
    height: 2.5rem;
    background: linear-gradient(135deg, #8b5cf6, #4f46e5);
    border-radius: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 10px 15px -3px rgba(88, 28, 135, 0.2);
  }
  
  .app-title {
    font-size: 1.25rem;
    font-weight: 800;
    letter-spacing: -0.025em;
    text-transform: uppercase;
    font-style: italic;
    background: linear-gradient(to right, white, #737373);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  
  .settings-button {
    padding: 10px;
    color: #a3a3a3;
    background-color: #171717;
    border: 1px solid #262626;
    border-radius: 9999px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .settings-button:hover {
    color: white;
  }
  
  .settings-button:active {
    transform: scale(0.9);
  }
  
  /* Main Content */
  .app-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }
  
  /* Editor */
  .editor-container {
    flex: 1;
    position: relative;
    display: flex;
    flex-direction: column;
  }
  
  .note-textarea {
    flex: 1;
    background: transparent;
    color: #e5e5e5;
    font-size: 1.25rem;
    padding: 2rem;
    resize: none;
    outline: none;
    border: none;
    line-height: 1.75;
    font-weight: 500;
  }
  
  .note-textarea::placeholder {
    color: #404040;
  }
  
  .processing-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-color: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(12px);
  }
  
  .processing-spinner {
    width: 3rem;
    height: 3rem;
    border: 4px solid rgba(139, 92, 246, 0.2);
    border-top-color: #8b5cf6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  .processing-text {
    margin-top: 1rem;
    color: #8b5cf6;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    font-size: 0.625rem;
  }
  
  /* Preview */
  .preview-container {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .back-button {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #737373;
    font-weight: 700;
    font-size: 0.625rem;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px 0;
  }
  
  .back-button:hover {
    color: #8b5cf6;
  }
  
  .note-preview {
    background-color: rgba(38, 38, 38, 0.5);
    border: 1px solid #262626;
    border-radius: 1rem;
    padding: 1.5rem;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  }
  
  .preview-header {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    border-bottom: 1px solid #262626;
    padding-bottom: 1rem;
  }
  
  .preview-icon {
    padding: 10px;
    background-color: rgba(139, 92, 246, 0.1);
    border-radius: 0.75rem;
  }
  
  .preview-title-container {
    flex: 1;
  }
  
  .preview-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: white;
    margin-bottom: 0.5rem;
  }
  
  .preview-path {
    font-size: 0.75rem;
    color: #737373;
    font-family: monospace;
  }
  
  .preview-content {
    color: #d4d4d4;
    white-space: pre-wrap;
    line-height: 1.75;
    font-size: 1rem;
    padding: 1rem 0;
  }
  
  .tags-container {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding-top: 8px;
  }
  
  .tag {
    font-size: 0.625rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #d8b4fe;
    background-color: rgba(139, 92, 246, 0.1);
    padding: 6px 12px;
    border-radius: 0.5rem;
    border: 1px solid rgba(139, 92, 246, 0.3);
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  /* Footer */
  .app-footer {
    padding: 1.5rem;
    border-top: 1px solid #262626;
    background-color: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(24px);
  }
  
  .editor-footer {
    display: flex;
    gap: 1rem;
  }
  
  .clear-button {
    padding: 1rem;
    border-radius: 1rem;
    background-color: #171717;
    color: #737373;
    border: 1px solid #262626;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .clear-button:disabled {
    opacity: 0.2;
  }
  
  .clear-button:active:not(:disabled) {
    transform: scale(0.9);
  }
  
  .process-button {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 1.25rem;
    border-radius: 1rem;
    font-weight: 800;
    font-size: 0.875rem;
    background: linear-gradient(to right, #8b5cf6, #4f46e5);
    color: white;
    border: none;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    box-shadow: 0 20px 25px -5px rgba(139, 92, 246, 0.3);
    transition: all 0.2s;
  }
  
  .process-button:disabled {
    opacity: 0.2;
  }
  
  .process-button:active:not(:disabled) {
    transform: scale(0.98);
  }
  
  .preview-footer {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .obsidian-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    background-color: white;
    color: black;
    padding: 1.25rem;
    border-radius: 1rem;
    font-weight: 800;
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    border: none;
    cursor: pointer;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    transition: all 0.2s;
  }
  
  .obsidian-button:hover {
    background-color: #f5f5f5;
  }
  
  .obsidian-button:active {
    transform: scale(0.98);
  }
  
  .obsidian-logo {
    width: 1.5rem;
    height: 1.5rem;
  }
  
  .action-buttons {
    display: flex;
    gap: 1rem;
  }
  
  .copy-button, .download-button {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background-color: #171717;
    color: white;
    padding: 1rem;
    border-radius: 0.75rem;
    font-weight: 700;
    border: 1px solid #262626;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .copy-button:hover, .download-button:hover {
    background-color: #262626;
  }
  
  .copy-button:active, .download-button:active {
    transform: scale(0.95);
  }
  
  /* Settings Modal */
  .settings-modal {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(0, 0, 0, 0.9);
    padding: 1.5rem;
    backdrop-filter: blur(12px);
    z-index: 50;
  }
  
  .settings-content {
    background-color: #171717;
    border: 1px solid #262626;
    border-radius: 1.5rem;
    width: 100%;
    max-width: 28rem;
    overflow: hidden;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  }
  
  .settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem;
    border-bottom: 1px solid #262626;
  }
  
  .settings-header h2 {
    font-size: 1.125rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  
  .close-settings {
    color: #737373;
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
  }
  
  .close-settings:hover {
    color: white;
  }
  
  .settings-body {
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }
  
  .setting-group {
    display: flex;
    flex-direction: column;
  }
  
  .setting-label {
    font-size: 0.625rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: #737373;
    margin-bottom: 0.75rem;
  }
  
  .setting-input {
    width: 100%;
    background-color: #0a0a0a;
    padding: 1rem;
    border-radius: 1rem;
    border: 1px solid #262626;
    color: white;
    outline: none;
    font-weight: 500;
    transition: border-color 0.2s;
  }
  
  .setting-input:focus {
    border-color: #8b5cf6;
  }
  
  .setting-hint {
    font-size: 0.75rem;
    color: #737373;
    margin-top: 0.5rem;
  }
  
  .settings-footer {
    padding: 1.5rem;
    background-color: rgba(38, 38, 38, 0.5);
  }
  
  .save-settings-button {
    width: 100%;
    background-color: #8b5cf6;
    color: white;
    padding: 1.25rem;
    border-radius: 1rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    border: none;
    cursor: pointer;
    box-shadow: 0 10px 15px -3px rgba(139, 92, 246, 0.2);
    transition: all 0.2s;
  }
  
  .save-settings-button:hover {
    background-color: #7c3aed;
  }
  
  .save-settings-button:active {
    transform: scale(0.95);
  }
  
  /* Animations */
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  /* Responsive */
  @media (max-width: 640px) {
    .app-container {
      max-width: 100%;
    }
    
    .app-header {
      padding: 1rem;
    }
    
    .note-textarea {
      padding: 1.5rem;
      font-size: 1rem;
    }
    
    .preview-container {
      padding: 1rem;
    }
    
    .app-footer {
      padding: 1rem;
    }
  }
`;

// Inject styles when component mounts
if (typeof document !== 'undefined') {
  document.head.appendChild(styles);
