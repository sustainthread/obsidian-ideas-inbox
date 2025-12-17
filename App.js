import React, { useState, useEffect, useRef } from 'react';
import htm from 'htm';
import { Settings, Sparkles, Send, Copy, Check, ArrowLeft, Trash2, X, Save, FileText, Tag, Download } from 'lucide-react';

// Import the actual service - you'll need to implement this
import { enhanceNoteWithGemini } from './geminiService.js';

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
  const [text, setText] = useState('');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewState, setViewState] = useState(ViewState.EDITING);
  const [enhancedData, setEnhancedData] = useState(null);
  const [copyStatus, setCopyStatus] = useState('idle');
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);

  // Load saved data
  useEffect(() => {
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
  useEffect(() => {
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
      console.log('Processing note with Gemini...');
      const result = await enhanceNoteWithGemini(text);
      
      if (!result || !result.content) {
        throw new Error('Invalid response from Gemini service');
      }
      
      // Ensure enhanced data has required structure
      const enhancedNote = {
        title: result.title || 'Untitled Note',
        content: result.content || text,
        tags: Array.isArray(result.tags) ? result.tags : ['note', 'idea']
      };
      
      setEnhancedData(enhancedNote);
      setViewState(ViewState.PREVIEW);
      
    } catch (e) {
      console.error('Gemini processing error:', e);
      setError(e.message || 'Error connecting to Gemini. Please try again.');
      
      // Fallback: use original text as enhanced data
      const fallbackData = {
        title: 'Processed Note',
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
      
      // CORRECTED: Proper Obsidian URI format
      // Format: obsidian://advanced-uri?vault=VAULT&filepath=FOLDER/FILE.md&data=CONTENT
      const vault = encodeURIComponent(settings.vaultName);
      const folder = settings.folderPath.trim() || 'Inbox';
      const filePath = `${folder}/${fileName}.md`;
      
      const uri = `obsidian://advanced-uri?vault=${vault}&filepath=${encodeURIComponent(filePath)}&data=${encodeURIComponent(fullContent)}`;
      
      console.log('Opening Obsidian URI:', uri);
      
      // Try to open Obsidian
      window.location.href = uri;
      
      // Fallback for desktop: offer download
      setTimeout(() => {
        if (confirm('If Obsidian didn\'t open, would you like to download the note instead?')) {
          const blob = new Blob([fullContent], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${fileName}.md`;
          a.click();
        }
      }, 1000);
      
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
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-[#0a0a0a] text-white overflow-hidden relative selection:bg-purple-500/30">
      
      <!-- Error Banner -->
      ${error && html`
        <div className="bg-red-900/30 border border-red-700 text-red-200 px-4 py-3 text-sm font-medium">
          <div className="flex justify-between items-center">
            <span>⚠️ ${error}</span>
            <button onClick=${() => setError(null)} className="text-red-400 hover:text-white">
              <${X} size={16} />
            </button>
          </div>
        </div>
      `}
      
      <!-- Header -->
      <header className="flex items-center justify-between px-6 py-5 border-b border-neutral-800 bg-black/40 backdrop-blur-xl z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-900/20">
            <${Send} size=${20} className="text-white -ml-0.5 mt-0.5" />
          </div>
          <h1 className="font-extrabold text-xl tracking-tight uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-500">
            IdeaInbox
          </h1>
        </div>
        <button 
          onClick=${() => setIsSettingsOpen(true)} 
          className="p-2.5 text-neutral-400 hover:text-white bg-neutral-900 rounded-full border border-neutral-800 transition-all active:scale-90"
          aria-label="Settings"
        >
          <${Settings} size=${22} />
        </button>
      </header>

      <!-- Main Content -->
      <main className="flex-1 flex flex-col relative overflow-hidden">
        ${viewState === ViewState.EDITING ? html`
          <div className="flex-1 relative flex flex-col">
            <textarea 
              ref=${textareaRef}
              value=${text} 
              onChange=${e => {
                setText(e.target.value);
                setError(null);
              }} 
              disabled=${isProcessing}
              placeholder="Jot down a thought, link, or raw idea..."
              className="flex-1 bg-transparent text-xl p-8 resize-none outline-none leading-relaxed text-neutral-200 placeholder-neutral-800 font-medium"
              aria-label="Note input"
            />
            
            ${isProcessing && html`
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md z-40">
                <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
                <p className="mt-4 text-purple-400 font-bold tracking-widest uppercase text-[10px]">
                  Processing with AI...
                </p>
              </div>
            `}
          </div>
        ` : html`
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <button 
              onClick=${() => setViewState(ViewState.EDITING)} 
              className="flex items-center gap-2 text-neutral-500 hover:text-purple-400 transition-all font-bold text-[10px] uppercase tracking-[0.2em]"
            >
              <${ArrowLeft} size=${14} />
              <span>Return to Editor</span>
            </button>
            
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 space-y-6 shadow-2xl">
              <div className="flex items-start gap-4 border-b border-neutral-800 pb-4">
                <div className="p-2.5 bg-purple-500/10 rounded-xl">
                  <${FileText} className="text-purple-400" size=${24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white leading-tight mb-2">
                    ${enhancedData?.title || 'Untitled Note'}
                  </h3>
                  <p className="text-xs text-neutral-500 font-mono">
                    Will save to: ${settings.folderPath}/${enhancedData?.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'note'}.md
                  </p>
                </div>
              </div>
              
              <div className="text-neutral-300 whitespace-pre-wrap text-base leading-relaxed font-normal">
                ${enhancedData?.content || 'No content'}
              </div>
              
              ${enhancedData?.tags && enhancedData.tags.length > 0 && html`
                <div className="flex flex-wrap gap-2 pt-2">
                  ${getFormattedTags().map(tag => html`
                    <span key=${tag} className="text-[10px] font-bold uppercase tracking-wider text-purple-300 bg-purple-900/20 px-3 py-1.5 rounded-lg border border-purple-800/30 flex items-center gap-2">
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
      <footer className="p-6 border-t border-neutral-800 bg-black/60 backdrop-blur-2xl z-30">
        ${viewState === ViewState.EDITING ? html`
          <div className="flex gap-4">
            <button 
              onClick=${handleClear} 
              disabled=${!text || isProcessing} 
              className="p-4 rounded-2xl bg-neutral-900 text-neutral-500 border border-neutral-800 disabled:opacity-20 transition-all active:scale-90"
              aria-label="Clear note"
            >
              <${Trash2} size=${24} />
            </button>
            <button 
              onClick=${handleProcess} 
              disabled=${!text.trim() || isProcessing}
              className="flex-1 flex items-center justify-center gap-3 py-5 rounded-2xl font-black text-sm bg-gradient-to-r from-purple-600 to-indigo-600 disabled:opacity-20 transition-all active:scale-[0.98] uppercase tracking-widest shadow-2xl shadow-purple-900/30"
            >
              <${Sparkles} size=${20} />
              ${isProcessing ? 'Processing...' : 'Polish with AI'}
            </button>
          </div>
        ` : html`
          <div className="flex flex-col gap-4">
            <button 
              onClick=${handleSyncToObsidian} 
              className="w-full flex items-center justify-center gap-3 bg-white text-black py-5 rounded-2xl font-black shadow-xl active:scale-[0.98] uppercase tracking-widest text-sm transition-all hover:bg-gray-100"
            >
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/1/10/2023_Obsidian_logo.svg" 
                className="w-6 h-6" 
                alt="Obsidian Logo" 
              />
              Sync to Obsidian
            </button>
            <div className="flex gap-4">
              <button 
                onClick=${handleCopy} 
                className="flex-1 flex items-center justify-center gap-2 bg-neutral-900 text-white py-4 rounded-xl font-bold border border-neutral-800 transition-all active:scale-95 hover:bg-neutral-800"
              >
                <${copyStatus === 'copied' ? Check : Copy} 
                  size=${18} 
                  className=${copyStatus === 'copied' ? 'text-green-400' : ''} 
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
                className="flex-1 flex items-center justify-center gap-2 bg-neutral-900 text-white py-4 rounded-xl font-bold border border-neutral-800 transition-all active:scale-95 hover:bg-neutral-800"
              >
                <${Download} size=${18} /> Download .md
              </button>
            </div>
          </div>
        `}
      </footer>

      <!-- Settings Modal -->
      ${isSettingsOpen && html`
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6 backdrop-blur-md">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-neutral-800">
              <h2 className="text-lg font-black uppercase tracking-widest">Configuration</h2>
              <button 
                onClick=${() => setIsSettingsOpen(false)} 
                className="text-neutral-500 hover:text-white transition-all"
                aria-label="Close settings"
              >
                <${X} size=${24} />
              </button>
            </div>
            <div className="p-8 space-y-8">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-3">
                  Obsidian Vault Name
                </label>
                <input 
                  className="w-full bg-[#0a0a0a] p-4 rounded-2xl border border-neutral-800 text-white outline-none focus:border-purple-500 transition-all font-medium" 
                  placeholder="e.g. Personal"
                  value=${settings.vaultName} 
                  onChange=${e => setSettings({...settings, vaultName: e.target.value})}
                  aria-label="Vault name"
                />
                <p className="text-xs text-neutral-600 mt-2">
                  Must match exactly the name in Obsidian
                </p>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-3">
                  Folder Path
                </label>
                <input 
                  className="w-full bg-[#0a0a0a] p-4 rounded-2xl border border-neutral-800 text-white outline-none focus:border-purple-500 transition-all font-medium" 
                  placeholder="e.g. Inbox (leave empty for vault root)"
                  value=${settings.folderPath} 
                  onChange=${e => setSettings({...settings, folderPath: e.target.value})}
                  aria-label="Folder path"
                />
                <p className="text-xs text-neutral-600 mt-2">
                  Folder will be created if it doesn't exist
                </p>
              </div>
            </div>
            <div className="p-6 bg-neutral-900/50">
              <button 
                onClick=${() => handleSaveSettings(settings)} 
                className="w-full bg-purple-600 py-5 rounded-2xl font-black text-white flex items-center justify-center gap-3 shadow-xl shadow-purple-900/20 active:scale-95 transition-all hover:bg-purple-700"
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
