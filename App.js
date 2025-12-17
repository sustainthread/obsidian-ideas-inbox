import React, { useState, useEffect, useRef } from 'react';
import htm from 'htm';
import { Settings, Sparkles, Send, Download, Copy, Check, ArrowLeft, Trash2, X, Save, FileText, Tag } from 'lucide-react';
import { enhanceNoteWithGemini } from './geminiService.js';

const html = htm.bind(React.createElement);

// --- Sub-Components ---

function SettingsModal({ isOpen, onClose, settings, onSave }) {
  const [local, setLocal] = useState(settings);
  useEffect(() => setLocal(settings), [settings]);
  if (!isOpen) return null;

  return html`
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button onClick=${onClose} className="text-neutral-400"><${X} size=${20} /></button>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm text-neutral-400 mb-2 font-medium">Obsidian Vault Name</label>
            <input className="w-full bg-neutral-800 p-3 rounded-lg border border-neutral-700 text-white outline-none focus:border-purple-500" 
              value=${local.vaultName} onChange=${e => setLocal({...local, vaultName: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-2 font-medium">Folder Path (Optional)</label>
            <input className="w-full bg-neutral-800 p-3 rounded-lg border border-neutral-700 text-white outline-none focus:border-purple-500" 
              placeholder="e.g. Inbox"
              value=${local.folderPath} onChange=${e => setLocal({...local, folderPath: e.target.value})} />
          </div>
        </div>
        <div className="p-4">
          <button onClick=${() => { onSave(local); onClose(); }} className="w-full bg-purple-600 py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2">
            <${Save} size=${18} /> Save Config
          </button>
        </div>
      </div>
    </div>
  `;
}

function IdeaEditor({ value, onChange, isProcessing }) {
  const textareaRef = useRef(null);
  useEffect(() => { if (textareaRef.current) textareaRef.current.focus(); }, []);

  return html`
    <div className="flex-1 relative">
      <textarea ref=${textareaRef} value=${value} onChange=${e => onChange(e.target.value)} disabled=${isProcessing}
        placeholder="What's on your mind?..."
        className="w-full h-full bg-transparent text-lg p-6 resize-none outline-none leading-relaxed text-neutral-200 placeholder-neutral-700" />
      ${isProcessing && html`
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
          <div className="bg-neutral-800 px-6 py-3 rounded-full border border-neutral-700 animate-pulse text-purple-400 font-medium shadow-2xl">
            Gemini is refining...
          </div>
        </div>
      `}
    </div>
  `;
}

function PreviewCard({ data }) {
  return html`
    <div className="w-full bg-neutral-800/40 border border-neutral-700/50 rounded-2xl p-6 space-y-4">
      <div className="flex items-start gap-3 border-b border-neutral-700/50 pb-4">
        <${FileText} className="text-purple-400 mt-1" size=${22} />
        <h3 className="text-xl font-bold text-white tracking-tight">${data.title}</h3>
      </div>
      <div className="text-neutral-300 whitespace-pre-wrap text-base leading-relaxed font-normal">${data.content}</div>
      <div className="flex flex-wrap gap-2 pt-2">
        ${data.tags.map(tag => html`
          <span className="text-xs font-semibold text-purple-300 bg-purple-900/30 px-3 py-1.5 rounded-full border border-purple-800/50 flex items-center gap-1.5">
            <${Tag} size=${12} /> ${tag.startsWith('#') ? tag : '#' + tag}
          </span>
        `)}
      </div>
    </div>
  `;
}

// --- Main App Component ---

const DEFAULT_SETTINGS = {
  vaultName: 'MyVault',
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

  useEffect(() => {
    const savedSettings = localStorage.getItem('obsidian-inbox-settings');
    if (savedSettings) setSettings(JSON.parse(savedSettings));
    const savedDraft = localStorage.getItem('obsidian-inbox-draft');
    if (savedDraft) setText(savedDraft);
  }, []);

  useEffect(() => {
    localStorage.setItem('obsidian-inbox-draft', text);
  }, [text]);

  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('obsidian-inbox-settings', JSON.stringify(newSettings));
  };

  const handleProcess = async () => {
    if (!text.trim()) return;
    setIsProcessing(true);
    try {
      const result = await enhanceNoteWithGemini(text);
      setEnhancedData(result);
      setViewState(ViewState.PREVIEW);
    } catch (e) {
      alert("Failed to process note.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenInObsidian = () => {
    if (!enhancedData) return;
    const fileName = encodeURIComponent(enhancedData.title);
    const tagLine = enhancedData.tags.map(t => t.startsWith('#') ? t : '#' + t).join(' ');
    const content = encodeURIComponent(`${enhancedData.content}\n\n${tagLine}`);
    const vault = encodeURIComponent(settings.vaultName);
    let path = fileName;
    if (settings.folderPath.trim()) {
      path = encodeURIComponent(`${settings.folderPath.trim().replace(/\/$/, '')}/${enhancedData.title}`);
    }
    window.location.href = `obsidian://new?vault=${vault}&file=${path}&content=${content}`;
  };

  const handleCopy = () => {
    if (!enhancedData) return;
    const tagLine = enhancedData.tags.map(t => t.startsWith('#') ? t : '#' + t).join(' ');
    const full = `${enhancedData.content}\n\n${tagLine}`;
    navigator.clipboard.writeText(full).then(() => {
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    });
  };

  return html`
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-[#111] text-white overflow-hidden shadow-2xl relative">
      <header className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md z-20">
        <div className="flex items-center gap-2.5">
           <div className="w-9 h-9 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-900/20">
             <${Send} size=${20} className="text-white -ml-0.5 mt-0.5" />
           </div>
           <h1 className="font-extrabold text-xl tracking-tight">IdeaInbox</h1>
        </div>
        <div className="flex items-center gap-2">
           ${text.length > 0 && viewState === ViewState.EDITING && html`
              <button onClick=${() => setText('')} className="p-2 text-neutral-500 hover:text-red-400 transition-colors">
                <${Trash2} size=${22} />
              </button>
           `}
           <button onClick=${() => setIsSettingsOpen(true)} className="p-2.5 text-neutral-400 hover:text-white transition-colors bg-neutral-800 rounded-full">
             <${Settings} size=${22} />
           </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        ${viewState === ViewState.EDITING ? html`
          <${IdeaEditor} value=${text} onChange=${setText} isProcessing=${isProcessing} />
        ` : html`
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
             <button onClick=${() => setViewState(ViewState.EDITING)} className="flex items-center gap-2 text-neutral-400 hover:text-purple-400 transition-colors">
                <${ArrowLeft} size=${18} />
                <span className="text-sm font-medium">Back to editor</span>
             </button>
             ${enhancedData && html`<${PreviewCard} data=${enhancedData} />`}
          </div>
        `}
      </main>

      <div className="p-5 border-t border-neutral-800 bg-neutral-900/80 backdrop-blur-md z-20 pb-safe">
        ${viewState === ViewState.EDITING ? html`
          <button onClick=${handleProcess} disabled=${!text.trim() || isProcessing}
            className="w-full flex items-center justify-center gap-2 py-4.5 rounded-2xl font-bold text-lg bg-gradient-to-r from-purple-600 to-indigo-600 disabled:opacity-50 transition-all shadow-xl shadow-purple-900/20 active:scale-[0.98]">
            <${Sparkles} size=${22} className=${isProcessing ? 'animate-pulse' : ''} />
            ${isProcessing ? 'Thinking...' : 'Process with Gemini'}
          </button>
        ` : html`
          <div className="flex flex-col gap-3">
            <button onClick=${handleOpenInObsidian} className="w-full flex items-center justify-center gap-3 bg-[#7A3EE8] hover:bg-[#8D5AE8] text-white py-4 rounded-2xl font-bold shadow-lg shadow-purple-900/30 transition-colors">
              <img src="https://upload.wikimedia.org/wikipedia/commons/1/10/2023_Obsidian_logo.svg" className="w-6 h-6" alt="Obsidian" />
              Save to Obsidian
            </button>
            <div className="flex gap-3">
              <button onClick=${handleCopy} className="flex-1 flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white py-3.5 rounded-2xl font-semibold transition-colors">
                <${copyStatus === 'copied' ? Check : Copy} size=${18} className=${copyStatus === 'copied' ? 'text-green-400' : ''} />
                ${copyStatus === 'copied' ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        `}
      </div>

      <${SettingsModal} isOpen=${isSettingsOpen} onClose=${() => setIsSettingsOpen(false)} settings=${settings} onSave=${handleSaveSettings} />
    </div>
  `;
}
