// App.js - COMPLETE FIXED VERSION WITH DEFAULT EXPORT
import React from 'https://esm.sh/react@18';
import htm from 'https://esm.sh/htm@3.1.1';

const html = htm.bind(React.createElement);

// Simple component that shows your app is working
function App() {
  const [text, setText] = React.useState('');
  const [note, setNote] = React.useState('');
  
  const handleSave = () => {
    setNote(text);
    setText('');
  };
  
  return html`
    <div style=${styles.container}>
      <header style=${styles.header}>
        <h1 style=${styles.title}>📝 Obsidian Idea Inbox</h1>
        <p style=${styles.subtitle}>Capture ideas and send to Obsidian</p>
      </header>
      
      <main style=${styles.main}>
        <div style=${styles.editor}>
          <textarea
            value=${text}
            onChange=${e => setText(e.target.value)}
            placeholder="Type your idea here..."
            style=${styles.textarea}
            rows="6"
          />
          
          <div style=${styles.buttons}>
            <button onClick=${handleSave} style=${styles.button.primary}>
              💾 Save Note
            </button>
            <button onClick=${() => setText('')} style=${styles.button.secondary}>
              🗑️ Clear
            </button>
          </div>
        </div>
        
        ${note && html`
          <div style=${styles.preview}>
            <h3>Saved Note:</h3>
            <p>${note}</p>
            <button 
              onClick=${() => {
                const uri = `obsidian://advanced-uri?vault=Main&filepath=Inbox/Note.md&data=${encodeURIComponent(note)}`;
                window.open(uri, '_blank');
                alert('Opening Obsidian...');
              }}
              style=${styles.button.obsidian}
            >
              📱 Open in Obsidian
            </button>
          </div>
        `}
        
        <div style=${styles.info}>
          <h3>How to use:</h3>
          <ul style=${styles.list}>
            <li>Type your idea above</li>
            <li>Click "Save Note"</li>
            <li>Click "Open in Obsidian" to send to your vault</li>
            <li>Make sure Obsidian mobile app is installed</li>
          </ul>
        </div>
      </main>
      
      <footer style=${styles.footer}>
        <p>PWA • Works offline • Syncs with Obsidian</p>
      </footer>
    </div>
  `;
}

// CSS Styles
const styles = {
  container: {
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    color: '#e2e8f0'
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
    padding: '20px',
    backgroundColor: '#1e293b',
    borderRadius: '12px'
  },
  title: {
    fontSize: '2rem',
    margin: '0',
    color: '#60a5fa'
  },
  subtitle: {
    fontSize: '1rem',
    color: '#94a3b8',
    marginTop: '8px'
  },
  main: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px'
  },
  editor: {
    backgroundColor: '#1e293b',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
  },
  textarea: {
    width: '100%',
    padding: '15px',
    fontSize: '16px',
    border: '2px solid #334155',
    borderRadius: '8px',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    resize: 'vertical',
    fontFamily: 'inherit',
    marginBottom: '20px'
  },
  buttons: {
    display: 'flex',
    gap: '15px'
  },
  button: {
    primary: {
      padding: '12px 24px',
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      cursor: 'pointer',
      flex: 1,
      fontWeight: '600'
    },
    secondary: {
      padding: '12px 24px',
      backgroundColor: '#475569',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      cursor: 'pointer',
      flex: 1
    },
    obsidian: {
      padding: '12px 24px',
      backgroundColor: '#7c3aed',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      cursor: 'pointer',
      marginTop: '15px',
      fontWeight: '600'
    }
  },
  preview: {
    backgroundColor: '#1e293b',
    padding: '25px',
    borderRadius: '12px',
    borderLeft: '4px solid #10b981'
  },
  info: {
    backgroundColor: '#1e293b',
    padding: '25px',
    borderRadius: '12px',
    borderLeft: '4px solid #f59e0b'
  },
  list: {
    paddingLeft: '20px',
    lineHeight: '1.8'
  },
  footer: {
    textAlign: 'center',
    marginTop: '40px',
    padding: '20px',
    color: '#94a3b8',
    fontSize: '14px'
  }
};

// CRITICAL: This must be at the end
export default App;
