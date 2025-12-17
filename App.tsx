import React, { useState, useEffect } from 'react';
import { Settings, Sparkles, Send, Copy, ArrowLeft, Trash2 } from 'lucide-react';
import { AppSettings, NoteData, ViewState } from './types';
import { enhanceNoteWithGemini } from './services/geminiService';

export default function App() {
  const [text, setText] = useState('');
  const [view, setView] = useState(ViewState.EDITING);
  const [note, setNote] = useState<NoteData | null>(null);
  const [loading, setLoading] = useState(false);
  const vault = "MyVault"; // Default vault name

  const handleProcess = async () => {
    setLoading(true);
    try {
      const result = await enhanceNoteWithGemini(text);
      setNote(result);
      setView(ViewState.PREVIEW);
    } catch (e) { alert("Error refining note."); }
    finally { setLoading(false); }
  };

  const syncToObsidian = () => {
    if (!note) return;
    const uri = `obsidian://new?vault=${encodeURIComponent(vault)}&name=${encodeURIComponent(note.title)}&content=${encodeURIComponent(note.content + "\n\n" + note.tags.join(" "))}`;
    window.location.href = uri;
  };

  return (
    <div className="flex flex-col h-screen bg-[#111] text-white p-4">
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold flex items-center gap-2"><Send size={20}/> IdeaInbox</h1>
        <button onClick={() => setText('')}><Trash2 size={20} className="text-neutral-500"/></button>
      </header>

      {view === ViewState.EDITING ? (
        <textarea 
          className="flex-1 bg-transparent text-lg outline-none resize-none"
          placeholder="What's your idea?"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      ) : (
        <div className="flex-1 bg-neutral-900 p-4 rounded-xl overflow-auto">
          <button onClick={() => setView(ViewState.EDITING)} className="mb-4 flex items-center gap-2 text-purple-400"><ArrowLeft size={16}/> Edit</button>
          <h2 className="text-2xl font-bold mb-2">{note?.title}</h2>
          <p className="whitespace-pre-wrap">{note?.content}</p>
          <div className="mt-4 flex gap-2">{note?.tags.map(t => <span className="bg-purple-900/50 p-1 px-2 rounded text-xs">#{t}</span>)}</div>
        </div>
      )}

      <footer className="mt-4 pb-safe">
        {view === ViewState.EDITING ? (
          <button 
            onClick={handleProcess}
            disabled={!text || loading}
            className="w-full bg-purple-600 p-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Sparkles size={20}/> {loading ? 'Thinking...' : 'Refine with AI'}
          </button>
        ) : (
          <button 
            onClick={syncToObsidian}
            className="w-full bg-white text-black p-4 rounded-xl font-bold"
          >
            Save to Obsidian
          </button>
        )}
      </footer>
    </div>
  );
}
