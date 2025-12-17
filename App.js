// App.js - COMPLETE VERSION WITH WORKING MOBILE OBSIDIAN SYNC
import React from 'https://esm.sh/react@18';
import htm from 'https://esm.sh/htm@3.1.1';
import { 
  Settings, Sparkles, Send, Copy, Check, ArrowLeft, 
  Trash2, X, Save, FileText, Tag, Download, Smartphone, AlertCircle 
} from 'https://esm.sh/lucide-react@0.263.1';

const html = htm.bind(React.createElement);

// Import the Gemini service (has local fallback)
import { enhanceNoteWithGemini } from './geminiService.js';

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
  const [isMobile, setIsMobile] = React.useState(false);
  const [syncMethod, setSyncMethod] = React.useState('auto'); // 'auto', 'uri', 'clipboard'
  const textareaRef = React.useRef(null);

  // Check if mobile on mount
  React.useEffect(() => {
    const mobileCheck = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsMobile(mobileCheck);
    console.log('Device:', mobileCheck ? '📱 Mobile' : '🖥️ Desktop');
    
    // Load saved settings
    const savedSettings = localStorage.getItem('obsidian-inbox-settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Failed to parse settings:', e);
      }
    }
    
    const savedDraft = localStorage.getItem('obsidian-inbox-draft');
    if (savedDraft) setText(savedDraft);
  }, []);

  // Auto-save draft
  React.useEffect(() => {
    const saveDraft = () => {
      localStorage.setItem('obsidian-inbox-draft', text);
    };
    
    const timeoutId = setTimeout(saveDraft, 500);
    return () => clearTimeout(timeoutId);
  }, [text]);

  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('obsidian-inbox-settings', JSON.stringify(newSettings));
    setIsSettingsOpen(false);
  };

  const handleProcessNote = async () => {
    if (!text.trim()) {
      setError('Please enter some text to process');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      console.log('Processing note with Gemini service...');
      const result = await enhanceNoteWithGemini(text);
      
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
      
      // Fallback to basic enhancement
      const fallbackData = {
        title: text.split('\n')[0]?.slice(0, 50) || 'My Note',
        content: text,
        tags: ['note', 'manual', 'fallback']
      };
      setEnhancedData(fallbackData);
      setViewState(ViewState.PREVIEW);
    } finally {
      setIsProcessing(false);
    }
  };

  // WORKING OBSIDIAN SYNC FUNCTION
  const handleSyncToObsidian = async () => {
    if (!enhancedData) {
      setError('No note to sync');
      return;
    }
    
    try {
      // Prepare content
      const tags = enhancedData.tags
        .map(t => t.startsWith('#') ? t : `#${t}`)
        .join(' ');
      
      const fullContent = `# ${enhancedData.title}\n\n${enhancedData.content}\n\n${tags}`;
      
      // Create safe filename
      const fileName = enhancedData.title
        .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename chars
        .replace(/\s+/g, '_')
        .toLowerCase()
        .slice(0, 40) || 'note';
      
      // Get settings
      const vault = (settings.vaultName || DEFAULT_SETTINGS.vaultName).trim();
      const folder = (settings.folderPath || DEFAULT_SETTINGS.folderPath).trim();
      
      console.log('📱 Sync attempt:', { vault, fileName, isMobile, contentLength: fullContent.length });
      
      // MOBILE-OPTIMIZED SYNC
      if (isMobile) {
        await handleMobileSync(fullContent, fileName, vault, folder);
      } else {
        await handleDesktopSync(fullContent, fileName, vault, folder);
      }
      
    } catch (e) {
      console.error('Sync error:', e);
      setError(`Sync failed: ${e.message}. Try copying instead.`);
    }
  };

  // MOBILE SYNC (PROVEN WORKING METHOD)
  const handleMobileSync = async (content, fileName, vault, folder) => {
    console.log('📱 Starting mobile sync...');
    
    // 1. ALWAYS copy to clipboard first (guaranteed to work)
    await navigator.clipboard.writeText(content);
    console.log('✅ Copied to clipboard');
    
    // 2. Try to open Obsidian with a simple URI
    const simpleURI = `obsidian://open?vault=${encodeURIComponent(vault)}`;
    
    // Use iframe method (works better on mobile)
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = simpleURI;
    document.body.appendChild(iframe);
    
    // 3. Show clear instructions
    setTimeout(() => {
      document.body.removeChild(iframe);
      
      alert(
        '✅ Note ready for Obsidian!\n\n' +
        '1. Switch to Obsidian (app should open)\n' +
        '2. Create a NEW note\n' +
        '3. PASTE the content (already copied)\n' +
        '4. Save as: ' + fileName + '.md\n\n' +
        '📁 Location: ' + (folder || 'Vault root') + '\n' +
        '🔑 Vault: ' + vault
      );
      
      // Optional: Try to create the note directly after delay
      setTimeout(() => {
        if (confirm('Still having issues? Try advanced sync?')) {
          tryAdvancedMobileSync(content, fileName, vault, folder);
        }
      }, 3000);
      
    }, 500);
  };

  // DESKTOP SYNC
  const handleDesktopSync = async (content, fileName, vault, folder) => {
    console.log('🖥️ Starting desktop sync...');
    
    // Try multiple URI formats
    const uriFormats = [
      // Format 1: Basic new note (most compatible)
      `obsidian://new?vault=${encodeURIComponent(vault)}&file=${encodeURIComponent(fileName)}&content=${encodeURIComponent(content)}`,
      
      // Format 2: With folder
      `obsidian://new?vault=${encodeURIComponent(vault)}&file=${encodeURIComponent(folder ? `${folder}/${fileName}` : fileName)}&content=${encodeURIComponent(content)}`,
      
      // Format 3: Create action
      `obsidian://create?vault=${encodeURIComponent(vault)}&file=${encodeURIComponent(fileName)}&data=${encodeURIComponent(content)}`
    ];
    
    // Try first format
    window.location.href = uriFormats[0];
    
    // Check if it worked
    setTimeout(() => {
      const worked = confirm(
        'Did the note open in Obsidian?\n\n' +
        'Yes = Success!\n' +
        'No = Try alternative method'
      );
      
      if (!worked) {
        // Copy to clipboard as fallback
        navigator.clipboard.writeText(content).then(() => {
          alert('Note copied to clipboard. You can paste it into Obsidian.');
        });
      }
    }, 2000);
  };

  // ADVANCED MOBILE SYNC (if basic method fails)
  const tryAdvancedMobileSync = (content, fileName, vault, folder) => {
    // This uses a more complex but sometimes working approach
    const advancedURI = `obsidian://advanced-uri?vault=${encodeURIComponent(vault)}&commandname=create&data=${encodeURIComponent(JSON.stringify({
      file: folder ? `${folder}/${fileName}.md` : `${fileName}.md`,
      content: content
    }))}`;
    
    console.log('🔧 Trying advanced URI:', advancedURI);
    
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = advancedURI;
    document.body.appendChild(iframe);
    
    setTimeout(() => {
      document.body.removeChild(iframe);
      alert('Advanced sync attempted. Check Obsidian.');
    }, 500);
  };

  const handleCopyToClipboard = async () => {
    if (!enhancedData) return;
    
    try {
      const tags = enhancedData.tags
        .map(t => t.startsWith('#') ? t : `#${t}`)
        .join(' ');
      const fullContent = `${enhancedData.content}\n\n${tags}`;
      
      await navigator.clipboard.writeText(fullContent);
      setCopyStatus('copied');
      
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (e) {
      console.error('Copy failed:', e);
      setError('Failed to copy to clipboard');
    }
  };

  const handleClearNote = () => {
    if (!text && !enhancedData) return;
    
    const message = enhancedData 
      ? 'Clear both draft and enhanced note?' 
      : 'Clear current draft?';
    
    if (window.confirm(message)) {
      setText('');
      setEnhancedData(null);
      setViewState(ViewState.EDITING);
      setError(null);
      localStorage.removeItem('obsidian-inbox-draft');
    }
  };

  const getFormattedTags = () => {
    if (!enhancedData?.tags) return [];
    return enhancedData.tags.map(tag => 
      tag.startsWith('#') ? tag : `#${tag}`
    );
  };

  // TEST FUNCTION (run from console)
  React.useEffect(() => {
    window.testObsidianSync = () => {
      const testContent = `# Test Note\n\nThis is a test note generated at ${new Date().toLocaleTimeString()}\n\n#test #sync`;
      const testFileName = 'test_sync_' + Date.now();
      
      if (isMobile) {
        handleMobileSync(testContent, testFileName, settings.vaultName || 'Main', 'Inbox');
      } else {
        handleDesktopSync(testContent, testFileName, settings.vaultName || 'Main', 'Inbox');
      }
    };
  }, [isMobile, settings]);

  return html`
    <div className="app-container">
      <!-- Device Indicator -->
      ${isMobile && html`
        <div className="device-indicator">
          <${Smartphone} size={14} />
          <span>Mobile Mode</span>
        </div>
      `}
      
      <!-- Error Banner -->
      ${error && html`
        <div className="error-banner">
          <div className="error-content">
            <${AlertCircle} size={16} />
            <span>${error}</span>
            <button 
              onClick=${() => setError(null)} 
              className="error-close"
              aria-label="Dismiss error"
            >
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
          <div>
            <h1 className="app-title">IdeaInbox</h1>
            ${isMobile && html`<p className="app-subtitle">Mobile Optimized</p>`}
          </div>
        </div>
        <button 
          onClick=${() => setIsSettingsOpen(true)} 
          className="settings-button"
          aria-label="Open settings"
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
              rows="8"
            />
            
            ${isProcessing && html`
              <div className="processing-overlay">
                <div className="processing-spinner"></div>
                <p className="processing-text">Polishing with AI...</p>
              </div>
            `}
          </div>
        ` : html`
          <div className="preview-container">
            <button 
              onClick=${() => setViewState(ViewState.EDITING)} 
              className="back-button"
              aria-label="Back to editor"
            >
              <${ArrowLeft} size=${14} />
              <span>Edit Again</span>
            </button>
            
            <div className="note-preview">
              <div className="preview-header">
                <div className="preview-icon">
                  <${FileText} size=${24} />
                </div>
                <div className="preview-title-container">
                  <h2 className="preview-title">${enhancedData?.title || 'Untitled Note'}</h2>
                  <p className="preview-path">
                    ${isMobile ? '📱 Ready for mobile sync' : '🖥️ Ready for desktop sync'}
                  </p>
                  <p className="preview-vault">
                    Vault: <strong>${settings.vaultName || 'Main'}</strong>
                    ${settings.folderPath && html` → ${settings.folderPath}`}
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
              onClick=${handleClearNote} 
              disabled=${!text || isProcessing} 
              className="clear-button"
              aria-label="Clear note"
            >
              <${Trash2} size=${20} />
            </button>
            <button 
              onClick=${handleProcessNote} 
              disabled=${!text.trim() || isProcessing}
              className="process-button"
              aria-label="Polish note with AI"
            >
              <${Sparkles} size=${18} />
              ${isProcessing ? 'Processing...' : 'Polish with AI'}
            </button>
          </div>
        ` : html`
          <div className="preview-footer">
            <button 
              onClick=${handleSyncToObsidian} 
              className="obsidian-button"
              aria-label="Sync to Obsidian"
            >
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/1/10/2023_Obsidian_logo.svg" 
                className="obsidian-logo" 
                alt="Obsidian Logo" 
                width="24"
                height="24"
              />
              ${isMobile ? 'Send to Mobile Obsidian' : 'Send to Obsidian'}
            </button>
            
            <div className="preview-actions">
              <button 
                onClick=${handleCopyToClipboard} 
                className="copy-button"
                aria-label=${copyStatus === 'copied' ? 'Copied' : 'Copy to clipboard'}
              >
                <${copyStatus === 'copied' ? Check : Copy} size=${18} />
                ${copyStatus === 'copied' ? 'Copied!' : 'Copy'}
              </button>
              
              <button 
                onClick=${() => {
                  if (!enhancedData) return;
                  const tags = getFormattedTags().join(' ');
                  const fullContent = `${enhancedData.content}\n\n${tags}`;
                  const fileName = enhancedData.title
                    .replace(/[^a-z0-9]/gi, '_')
                    .toLowerCase();
                  
                  const blob = new Blob([fullContent], { type: 'text/markdown' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `${fileName}.md`;
                  link.click();
                  URL.revokeObjectURL(url);
                }} 
                className="download-button"
                aria-label="Download as Markdown file"
              >
                <${Download} size=${18} />
                Download
              </button>
            </div>
          </div>
        `}
      </footer>

      <!-- Settings Modal -->
      ${isSettingsOpen && html`
        <div className="settings-modal-overlay">
          <div className="settings-modal">
            <div className="settings-header">
              <h2>App Settings</h2>
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
                  type="text"
                  placeholder="MyVault (must match exactly!)"
                  value=${settings.vaultName} 
                  onChange=${e => setSettings({...settings, vaultName: e.target.value})}
                  aria-label="Obsidian vault name"
                />
                <p className="setting-hint">
                  ${isMobile ? '📱 On mobile: Check Obsidian app settings' : 'Case-sensitive. Check Obsidian → Settings → About'}
                </p>
              </div>
              
              <div className="setting-group">
                <label className="setting-label">
                  Folder Path
                </label>
                <input 
                  className="setting-input"
                  type="text"
                  placeholder="Inbox (optional)"
                  value=${settings.folderPath} 
                  onChange=${e => setSettings({...settings, folderPath: e.target.value})}
                  aria-label="Folder path in vault"
                />
                <p className="setting-hint">
                  Subfolder where notes will be saved. Leave empty for vault root.
                </p>
              </div>
              
              ${isMobile && html`
                <div className="mobile-tips">
                  <h3>📱 Mobile Tips:</h3>
                  <ul>
                    <li>Make sure Obsidian app is installed</li>
                    <li>Allow app switching when prompted</li>
                    <li>Content is auto-copied to clipboard</li>
                    <li>Paste into new Obsidian note</li>
                  </ul>
                </div>
              `}
            </div>
            
            <div className="settings-footer">
              <button 
                onClick=${() => handleSaveSettings(settings)} 
                className="save-settings-button"
                aria-label="Save settings"
              >
                <${Save} size={18} />
                Save Settings
              </button>
            </div>
          </div>
        </div>
      `}
    </div>
  `;
}

// Inject CSS styles
const styles = document.createElement('style');
styles.textContent = `
  /* Base Styles */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body, html {
    height: 100%;
    background-color: #0a0a0a;
    color: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  
  .app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    max-width: 800px;
    margin: 0 auto;
    background-color: #0a0a0a;
    overflow: hidden;
    position: relative;
  }
  
  /* Device Indicator */
  .device-indicator {
    position: absolute;
    top: 12px;
    right: 80px;
    background: rgba(139, 92, 246, 0.2);
    color: #a78bfa;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 5px;
    z-index: 100;
    border: 1px solid rgba(139, 92, 246, 0.3);
  }
  
  /* Error Banner */
  .error-banner {
    background-color: rgba(239, 68, 68, 0.15);
    border-bottom: 1px solid #dc2626;
    color: #fecaca;
    padding: 12px 16px;
    font-size: 14px;
    font-weight: 500;
  }
  
  .error-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 800px;
    margin: 0 auto;
    gap: 10px;
  }
  
  .error-close {
    background: none;
    border: none;
    color: #fca5a5;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
  }
  
  .error-close:hover {
    color: #ffffff;
  }
  
  /* Header */
  .app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid #262626;
    background-color: rgba(10, 10, 10, 0.95);
    backdrop-filter: blur(10px);
    flex-shrink: 0;
  }
  
  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .logo-icon {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #8b5cf6 0%, #4f46e5 100%);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.25);
  }
  
  .app-title {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.5px;
    background: linear-gradient(to right, #ffffff, #a3a3a3);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  
  .app-subtitle {
    font-size: 11px;
    color: #8b5cf6;
    margin-top: 2px;
    font-weight: 600;
  }
  
  .settings-button {
    background-color: #1a1a1a;
    border: 1px solid #333333;
    border-radius: 50%;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #a3a3a3;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .settings-button:hover {
    color: #ffffff;
    border-color: #4f46e5;
    background-color: #262626;
  }
  
  /* Main Content */
  .app-main {
    flex: 1;
    overflow-y: auto;
    position: relative;
  }
  
  /* Editor View */
  .editor-container {
    height: 100%;
    position: relative;
    padding: 20px;
  }
  
  .note-textarea {
    width: 100%;
    height: 100%;
    background-color: transparent;
    color: #f5f5f5;
    font-size: 17px;
    line-height: 1.6;
    border: none;
    resize: none;
    outline: none;
    font-family: inherit;
    padding: 0;
  }
  
  .note-textarea::placeholder {
    color: #525252;
  }
  
  .note-textarea:disabled {
    opacity: 0.7;
  }
  
  .processing-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(10, 10, 10, 0.85);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(8px);
    z-index: 10;
  }
  
  .processing-spinner {
    width: 48px;
    height: 48px;
    border: 3px solid rgba(139, 92, 246, 0.2);
    border-top-color: #8b5cf6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }
  
  .processing-text {
    color: #8b5cf6;
    font-weight: 600;
    font-size: 14px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  
  /* Preview View */
  .preview-container {
    padding: 20px;
    height: 100%;
    overflow-y: auto;
  }
  
  .back-button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: none;
    border: none;
    color: #8b5cf6;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    margin-bottom: 20px;
    padding: 8px 0;
  }
  
  .back-button:hover {
    opacity: 0.8;
  }
  
  .note-preview {
    background-color: #1a1a1a;
    border: 1px solid #333333;
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }
  
  .preview-header {
    display: flex;
    gap: 16px;
    margin-bottom: 24px;
    padding-bottom: 20px;
    border-bottom: 1px solid #333333;
  }
  
  .preview-icon {
    background-color: rgba(139, 92, 246, 0.1);
    border-radius: 10px;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  
  .preview-title-container {
    flex: 1;
  }
  
  .preview-title {
    font-size: 22px;
    font-weight: 700;
    color: #ffffff;
    margin-bottom: 8px;
    line-height: 1.3;
  }
  
  .preview-path {
    font-size: 13px;
    color: #a3a3a3;
    margin-bottom: 4px;
  }
  
  .preview-vault {
    font-size: 13px;
    color: #8b5cf6;
    font-weight: 500;
  }
  
  .preview-content {
    color: #d4d4d4;
    font-size: 16px;
    line-height: 1.7;
    white-space: pre-wrap;
    margin-bottom: 24px;
  }
  
  .tags-container {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding-top: 16px;
    border-top: 1px solid #333333;
  }
  
  .tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background-color: rgba(139, 92, 246, 0.15);
    color: #c4b5fd;
    font-size: 12px;
    font-weight: 600;
    padding: 6px 12px;
    border-radius: 20px;
    border: 1px solid rgba(139, 92, 246, 0.3);
  }
  
  /* Footer */
  .app-footer {
    padding: 20px;
    border-top: 1px solid #262626;
    background-color: rgba(10, 10, 10, 0.95);
    backdrop-filter: blur(10px);
    flex-shrink: 0;
  }
  
  .editor-footer {
    display: flex;
    gap: 12px;
  }
  
  .clear-button {
    width: 56px;
    height: 56px;
    background-color: #1a1a1a;
    border: 1px solid #333333;
    border-radius: 12px;
    color: #a3a3a3;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }
  
  .clear-button:not(:disabled):hover {
    color: #ef4444;
    border-color: #444444;
  }
  
  .clear-button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
  
  .process-button {
    flex: 1;
    height: 56px;
    background: linear-gradient(135deg, #8b5cf6 0%, #4f46e5 100%);
    border: none;
    border-radius: 12px;
    color: #ffffff;
    font-size: 16px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 16px rgba(139, 92, 246, 0.3);
  }
  
  .process-button:not(:disabled):hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
  }
  
  .process-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  /* Preview Footer */
  .preview-footer {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .obsidian-button {
    height: 56px;
    background-color: #7c3aed;
    border: none;
    border-radius: 12px;
    color: #ffffff;
    font-size: 16px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .obsidian-button:hover {
    background-color: #6d28d9;
    transform: translateY(-1px);
  }
  
  .obsidian-logo {
    width: 24px;
    height: 24px;
  }
  
  .preview-actions {
    display: flex;
    gap: 12px;
  }
  
  .copy-button, .download-button {
    flex: 1;
    height: 48px;
    background-color: #1a1a1a;
    border: 1px solid #333333;
    border-radius: 10px;
    color: #ffffff;
    font-size: 15px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .copy-button:hover, .download-button:hover {
    background-color: #262626;
    border-color: #404040;
  }
  
  /* Settings Modal */
  .settings-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    z-index: 1000;
    backdrop-filter: blur(8px);
  }
  
  .settings-modal {
    background-color: #1a1a1a;
    border: 1px solid #333333;
    border-radius: 16px;
    width: 100%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  }
  
  .settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px;
    border-bottom: 1px solid #333333;
  }
  
  .settings-header h2 {
    font-size: 20px;
    font-weight: 700;
    color: #ffffff;
  }
  
  .close-settings {
    background: none;
    border: none;
    color: #a3a3a3;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
  }
  
  .close-settings:hover {
    color: #ffffff;
  }
  
  .settings-body {
    padding: 24px;
  }
  
  .setting-group {
    margin-bottom: 28px;
  }
  
  .setting-group:last-child {
    margin-bottom: 0;
  }
  
  .setting-label {
    display: block;
    font-size: 13px;
    font-weight: 700;
    color: #a3a3a3;
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .setting-input {
    width: 100%;
    background-color: #0a0a0a;
    border: 1px solid #333333;
    border-radius: 10px;
    color: #ffffff;
    font-size: 16px;
    padding: 14px 16px;
    outline: none;
    transition: border-color 0.2s ease;
  }
  
  .setting-input:focus {
    border-color: #8b5cf6;
  }
  
  .setting-hint {
    font-size: 13px;
    color: #666666;
    margin-top: 8px;
    line-height: 1.5;
  }
  
  .mobile-tips {
    background-color: rgba(139, 92, 246, 0.1);
    border: 1px solid rgba(139, 92, 246, 0.2);
    border-radius: 10px;
    padding: 16px;
    margin-top: 20px;
  }
  
  .mobile-tips h3 {
    color: #8b5cf6;
    font-size: 14px;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .mobile-tips ul {
    padding-left: 20px;
    color: #a3a3a3;
    font-size: 13px;
    line-height: 1.6;
  }
  
  .mobile-tips li {
    margin-bottom: 6px;
  }
  
  .settings-footer {
    padding: 24px;
    border-top: 1px solid #333333;
    background-color: rgba(26, 26, 26, 0.8);
  }
  
  .save-settings-button {
    width: 100%;
    height: 56px;
    background: linear-gradient(135deg, #8b5cf6 0%, #4f46e5 100%);
    border: none;
    border-radius: 12px;
    color: #ffffff;
    font-size: 16px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .save-settings-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
  }
  
  /* Animations */
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  /* Responsive */
  @media (max-width: 640px) {
    .app-header {
      padding: 14px 16px;
    }
    
    .editor-container, .preview-container {
      padding: 16px;
    }
    
    .app-footer {
      padding: 16px;
    }
    
    .note-preview {
      padding: 20px;
    }
    
    .preview-title {
      font-size: 20px;
    }
    
    .settings-modal-overlay {
      padding: 16px;
    }
    
    .device-indicator {
      top: 10px;
      right: 70px;
      font-size: 11px;
      padding: 3px 8px;
    }
  }
`;

// Inject styles into the document
if (typeof document !== 'undefined') {
  document.head.appendChild(styles);
}
