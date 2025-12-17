import React, { useState, useEffect } from 'react';
import htm from 'htm';
import { Settings, Sparkles, Send, Download, Copy, Check, ArrowLeft, Trash2 } from 'lucide-react';
import SettingsModal from './components/SettingsModal.js';
import IdeaEditor from './components/IdeaEditor.js';
import PreviewCard from './components/PreviewCard.js';
import { enhanceNoteWithGemini } from './services/geminiService.js';

const html = htm.bind(React.createElement);

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
    const tagLine = enhancedData.tags.join(' ');
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
    const full = `${enhancedData.content}\n\n${enhancedData.tags.join(' ')}`;
    navigator.clipboard.writeText(full).then(() => {
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    });
  };

  return html`
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-[#111] text-white overflow-hidden shadow-2xl relative">
      <header className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md z-20">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
             <${Send} size=${18} className="text-white -ml-0.5 mt-0.5" />
           </div>
           <h1 className="font-bold text-lg tracking-tight">IdeaInbox</h1>
        </div>
        <div className="flex items-center gap-2">
           ${text.length > 0 && viewState === ViewState.EDITING && html`
              <button onClick=${() => setText('')} className="p-2 text-neutral-400 hover:text-red-400 transition-colors">
                <${Trash2} size=${20} />
              </button>
           `}
           <button onClick=${() => setIsSettingsOpen(true)} className="p-2 text-neutral-400 hover:text-white transition-colors bg-neutral-800 rounded-full">
             <${Settings} size=${20} />
           </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        ${viewState === ViewState.EDITING ? html`
          <${IdeaEditor} value=${text} onChange=${setText} isProcessing=${isProcessing} />
        ` : html`
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
             <div className="flex items-center gap-2 text-neutral-400 mb-2 cursor-pointer hover:text-white" onClick=${() => setViewState(ViewState.EDITING)}>
                <${ArrowLeft} size=${16} />
                <span className="text-sm">Back to edit</span>
             </div>
             ${enhancedData && html`<${PreviewCard} data=${enhancedData} />`}
          </div>
        `}
      </main>

      <div className="p-4 border-t border-neutral-800 bg-neutral-900/80 backdrop-blur-md z-20 pb-safe">
        ${viewState === ViewState.EDITING ? html`
          <button onClick=${handleProcess} disabled=${!text.trim() || isProcessing}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-lg bg-gradient-to-r from-purple-600 to-indigo-600 disabled:opacity-50 transition-all">
            <${Sparkles} size=${20} className=${isProcessing ? 'animate-pulse' : ''} />
            ${isProcessing ? 'Enhancing...' : 'Process with AI'}
          </button>
        ` : html`
          <div className="flex flex-col gap-3">
            <button onClick=${handleOpenInObsidian} className="w-full flex items-center justify-center gap-2 bg-[#7A3EE8] text-white py-3.5 rounded-xl font-semibold">
              Open in Obsidian
            </button>
            <div className="flex gap-3">
              <button onClick=${handleCopy} className="flex-1 flex items-center justify-center gap-2 bg-neutral-800 py-3 rounded-xl">
                <${copyStatus === 'copied' ? Check : Copy} size=${18} />
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
