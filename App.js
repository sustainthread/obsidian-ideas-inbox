import React, { useState, useEffect, useRef } from 'react';
import htm from 'htm';
import { Settings, Sparkles, Send, Copy, Check, ArrowLeft, Trash2, X, Save, FileText, Tag, Download } from 'lucide-react';
import { enhanceNoteWithGemini } from './geminiService.js';

const html = htm.bind(React.createElement);

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
  const [tempSettings, setTempSettings] = useState(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewState, setViewState] = useState(ViewState.EDITING);
  const [enhancedData, setEnhancedData] = useState(null);
  const [copyStatus, setCopyStatus] = useState('idle');
  const textareaRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('obsidian-inbox-settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSettings(parsed);
      setTempSettings(parsed);
    }
    const draft = localStorage.getItem('obsidian-inbox-draft');
    if (draft) setText(draft);
  }, []);

  useEffect(() => {
    localStorage.setItem('obsidian-inbox-draft', text);
  }, [text]);

  const handleSaveSettings = () => {
    setSettings(tempSettings);
    localStorage.setItem('obsidian-inbox-settings', JSON.stringify(tempSettings));
    setIsSettingsOpen(false);
  };

  const handleProcess = async () => {
    if (!text.trim()) return;
    setIsProcessing(true);
    try {
      const result = await enhanceNoteWithGemini(text);
      setEnhancedData(result);
      setViewState(ViewState.PREVIEW);
    } catch (e) {
      alert("Error connecting to Gemini. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSyncToObsidian = () => {
    if (!enhancedData) return;
    const tags = enhancedData.tags.map(t => t.startsWith('#') ? t : '#' + t).join(' ');
    const fullContent = `${enhancedData.content}\n\n${tags}`;
    
    const cleanFolder = settings.folderPath.trim().replace(/\/$/, '');
    const fullRelativePath = cleanFolder ? `${cleanFolder}/${enhancedData.title}` : enhancedData.title;

    const params = new URLSearchParams({
      vault: settings.vaultName,
      file: fullRelativePath,
      content: fullContent
    });

    window.location.href = `obsidian://new?${params.toString()}`;
  };

  const handleCopy = () => {
    const tags = enhancedData.tags.map(t => t.startsWith('#') ? t : '#' + t).join(' ');
    const full = `${enhancedData.content}\n\n${tags}`;
    navigator.clipboard.writeText(full).then(() => {
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    });
  };

  const handleClear = () => {
    if (text && confirm("Clear current draft?")) {
      setText('');
      setEnhancedData(null);
      setViewState(ViewState.EDITING);
    }
  };

  return html`
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-[#0a0a0a] text-white overflow-hidden relative selection:bg-purple-500/30">
      
      <header className="flex items-center justify-between px-6 py-5 border-b border-neutral-800 bg-black/40 backdrop-blur-xl z-30">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-900/20">
             <${Send} size=${20} className="text-white -ml-0.5 mt-0.5" />
           </div>
           <h1 className="font-extrabold text-xl tracking-tight uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-500">IdeaInbox</h1>
        </div>
        <button onClick=${() => { setTempSettings(settings); setIsSettingsOpen(true); }} className="p-2.5 text-neutral-400 hover:text-white bg-neutral-900 rounded-full border border-neutral-800 transition-all active:scale-90">
          <${Settings} size=${22} />
        </button>
      </header>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        ${viewState === ViewState.EDITING ? html`
          <div className="flex-1 relative flex flex-col">
            <textarea 
              ref=${textareaRef}
              value=${text} 
              onChange=${e => setText(e.target.value)} 
              disabled=${isProcessing}
              placeholder="Jot down a thought..."
              className="flex-1 bg-transparent text-xl p-8 resize-none outline-none leading-relaxed text-neutral-200 placeholder-neutral-800 font-medium" />
            
            ${isProcessing && html`
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md z-40">
                <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
                <p className="mt-4 text-purple-400 font-bold tracking-widest uppercase text-[10px]">Processing...</p>
              </div>
            `}
          </div>
        ` : html`
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
             <button onClick=${() => setViewState(ViewState.EDITING)} className="flex items-center gap-2 text-neutral-500 hover:text-purple-400 transition-all font-bold text-[10px] uppercase tracking-[0.2em]">
                <${ArrowLeft} size=${14} />
                <span>Return to Editor</span>
             </button>
             
             <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 space-y-6 shadow-2xl">
                <div className="flex items-start gap-4 border-b border-neutral-800 pb-4">
                  <div className="p-2.5 bg-purple-500/10 rounded-xl">
                    <${FileText} className="text-purple-400" size=${24} />
                  </div>
                  <h3 className="text-xl font-bold text-white leading-tight">${enhancedData?.title}</h3>
                </div>
                <div className="text-neutral-300 whitespace-pre-wrap text-base leading-relaxed font-normal">${enhancedData?.content}</div>
                <div className="flex flex-wrap gap-2 pt-2">
                  ${enhancedData?.tags.map(tag => html`
                    <span key=${tag} className="text-[10px] font-bold uppercase tracking-wider text-purple-300 bg-purple-900/20 px-3 py-1.5 rounded-lg border border-purple-800/30 flex items-center gap-2">
                      <${Tag} size=${10} /> ${tag.startsWith('#') ? tag : '#' + tag}
                    </span>
                  `)}
                </div>
             </div>
          </div>
        `}
      </main>

      <footer className="p-6 border-t border-neutral-800 bg-black/60 backdrop-blur-2xl z-30 pb-safe">
        ${viewState === ViewState.EDITING ? html`
          <div className="flex gap-4">
            <button onClick=${handleClear} disabled=${!text || isProcessing} className="p-4 rounded-2xl bg-neutral-900 text-neutral-500 border border-neutral-800 disabled:opacity-20 transition-all active:scale-90">
              <${Trash2} size=${24} />
            </button>
            <button onClick=${handleProcess} disabled=${!text.trim() || isProcessing}
              className="flex-1 flex items-center justify-center gap-3 py-5 rounded-2xl font-black text-sm bg-gradient-to-r from-purple-600 to-indigo-600 disabled:opacity-20 transition-all active:scale-[0.98] uppercase tracking-widest shadow-2xl shadow-purple-900/30">
              <${Sparkles} size=${20} />
              ${isProcessing ? 'Thinking...' : 'Polish with AI'}
            </button>
          </div>
        ` : html`
          <div className="flex flex-col gap-4">
            <button onClick=${handleSyncToObsidian} className="w-full flex items-center justify-center gap-3 bg-white text-black py-5 rounded-2xl font-black shadow-xl active:scale-[0.98] uppercase tracking-widest text-sm transition-all">
              <img src="https://upload.wikimedia.org/wikipedia/commons/1/10/2023_Obsidian_logo.svg" className="w-6 h-6" alt="" />
              Sync to Obsidian
            </button>
            <div className="flex gap-4">
              <button onClick=${handleCopy} className="flex-1 flex items-center justify-center gap-2 bg-neutral-900 text-white py-4 rounded-xl font-bold border border-neutral-800 transition-all active:scale-95">
                <${copyStatus === 'copied' ? Check : Copy} size=${18} className=${copyStatus === 'copied' ? 'text-green-400' : ''} />
                ${copyStatus === 'copied' ? 'Copied' : 'Copy'}
              </button>
              <button onClick=${() => {
                const tags = enhancedData.tags.map(t => t.startsWith('#') ? t : '#' + t).join(' ');
                const blob = new Blob([`${enhancedData.content}\n\n${tags}`], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${enhancedData.title}.md`;
                a.click();
              }} className="flex-1 flex items-center justify-center gap-2 bg-neutral-900 text-white py-4 rounded-xl font-bold border border-neutral-800 transition-all active:scale-95">
                <${Download} size=${18} /> .md
              </button>
            </div>
          </div>
        `}
      </footer>

      ${isSettingsOpen && html`
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6 backdrop-blur-md">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-neutral-800">
              <h2 className="text-lg font-black uppercase tracking-widest">Configuration</h2>
              <button onClick=${() => setIsSettingsOpen(false)} className="text-neutral-500 hover:text-white transition-all"><${X} size=${24} /></button>
            </div>
            <div className="p-8 space-y-8">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-3">Vault Name</label>
                <input className="w-full bg-[#0a0a0a] p-4 rounded-2xl border border-neutral-800 text-white outline-none focus:border-purple-500 transition-all font-medium" 
                  placeholder="e.g. Personal"
                  value=${tempSettings.vaultName} onChange=${e => setTempSettings({...tempSettings, vaultName: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-3">Folder Path</label>
                <input className="w-full bg-[#0a0a0a] p-4 rounded-2xl border border-neutral-800 text-white outline-none focus:border-purple-500 transition-all font-medium" 
                  placeholder="e.g. Inbox"
                  value=${tempSettings.folderPath} onChange=${e => setTempSettings({...tempSettings, folderPath: e.target.value})} />
              </div>
            </div>
            <div className="p-6 bg-neutral-900/50">
              <button onClick=${handleSaveSettings} className="w-full bg-purple-600 py-5 rounded-2xl font-black text-white flex items-center justify-center gap-3 shadow-xl shadow-purple-900/20 active:scale-95 transition-all">
                <${Save} size=${20} /> SAVE CHANGES
              </button>
            </div>
          </div>
        </div>
      `}
    </div>
  `;
}
