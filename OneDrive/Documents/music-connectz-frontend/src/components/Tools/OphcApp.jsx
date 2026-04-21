import MetricsFilterBar from '../MetricsFilterBar';
import OphcUploader from './OphcUploader';
import React, { useRef } from 'react';
import pngToIco from 'png-to-ico';
import ImageConnectZAI from '../../Intelligence/ImageConnectZAI';
import MusicWriterConnectZ from '../../Intelligence/MusicWriterConnectZ';
import VideoConnectZAI from '../../Intelligence/VideoConnectZAI';
import PreDAWTab from '../PreDAWTab';
import OphcCodeEditor from './OphcCodeEditor';
import OphcGitPanel from './OphcGitPanel';

const OphcApp = ({ isPremiumUser, onUpgrade, user, currentTab }) => {
  // Example PNG data URL (replace with your canvas export)
  const samplePng = 'https://placehold.co/128x128.png?text=ICON';

  // Only allow export for logged-in users (premium or not)
  const handleExportIco = async () => {
    if (!isPremiumUser) {
      alert('Export is only available for logged-in users.');
      // Optionally, report attempt here
      return;
    }
    // Monitor: Only allow export if user is coding games in Games tab
    if (currentTab !== 'Games') {
      alert('Export is only allowed for coding games in the Games tab. This attempt has been reported.');
      fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'non-games-export-attempt', user: user || 'anonymous', tab: currentTab, time: new Date().toISOString() })
      });
      return;
    }
    try {
      // Fetch PNG as blob
      const response = await fetch(samplePng);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      // Convert PNG to ICO
      const icoBuffer = await pngToIco([buffer]);

      // Download .ico file
      const url = URL.createObjectURL(new Blob([icoBuffer], { type: 'image/x-icon' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ophc-icon.ico';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('ICO export failed: ' + err.message);
    }
  };

  // AI-based detection: prevent and report attempts to edit metrics
  const handleMetricsFilter = (filters) => {
    // Simulate AI detection of suspicious edit attempts
    const suspicious = filters.genre !== 'All' || filters.daw !== 'All' || filters.language !== 'All';
    if (suspicious && !isPremiumUser) {
      alert('Editing metrics is not allowed for your account. This attempt has been reported.');
      fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'metrics-edit-attempt', user: user || 'anonymous', filters, time: new Date().toISOString() })
      });
      return;
    }
    // Monitor: Only allow metrics filter if in Games tab
    if (currentTab !== 'Games') {
      alert('Metrics filtering is only allowed for coding games in the Games tab. This attempt has been reported.');
      fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'non-games-metrics-attempt', user: user || 'anonymous', tab: currentTab, filters, time: new Date().toISOString() })
      });
      return;
    }
    alert(`Filtering by: Genre=${filters.genre}, DAW=${filters.daw}, Language=${filters.language}`);
  };

  // --- YTP Track Goals State ---
  const [goals, setGoals] = React.useState([
    { title: 'Finish intro', status: 'Not Started', eta: '2026-04-18', progress: 0 },
    { title: 'Add meme transitions', status: 'In Progress', eta: '2026-04-19', progress: 40 },
    { title: 'Render final cut', status: 'Not Started', eta: '2026-04-20', progress: 0 },
  ]);
  const [autoMode, setAutoMode] = React.useState(true);
  const [suggestions, setSuggestions] = React.useState([
    'Try adding a trending meme sound effect to the intro.',
    'Increase pacing in the middle section for more energy.',
    'Consider a surprise cutaway gag after the first chorus.'
  ]);

  // Simulate auto progress update (demo only)
  React.useEffect(() => {
    if (!autoMode) return;
    const interval = setInterval(() => {
      setGoals(prev => prev.map(g =>
        g.status === 'In Progress' && g.progress < 100
          ? { ...g, progress: Math.min(g.progress + 5, 100), status: g.progress + 5 >= 100 ? 'Done' : 'In Progress' }
          : g
      ));
    }, 2000);
    return () => clearInterval(interval);
  }, [autoMode]);

  // Add new goal (manual)
  const handleAddGoal = () => {
    setGoals([...goals, { title: 'New Goal', status: 'Not Started', eta: '', progress: 0 }]);
  };

  // Auto-add suggestions as tasks in auto mode
  React.useEffect(() => {
    if (!autoMode) return;
    setGoals(prevGoals => {
      const existingTitles = prevGoals.map(g => g.title);
      const newGoals = suggestions.filter(s => !existingTitles.includes(s)).map(s => ({
        title: s,
        status: 'Not Started',
        eta: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        progress: 0
      }));
      return [...prevGoals, ...newGoals];
    });
  }, [autoMode, suggestions]);

  // When a goal is completed, auto-generate a new suggestion based on user goals
  React.useEffect(() => {
    if (!autoMode) return;
    // Find completed goals that match suggestions
    const completed = goals.filter(g => g.status === 'Done' && suggestions.includes(g.title));
    if (completed.length > 0) {
      // Generate a new suggestion (simple demo: append a number or pick a template)
      const newSuggestion = `Next step after: ${completed[0].title}`;
      setSuggestions(prev => prev.includes(newSuggestion) ? prev : [...prev, newSuggestion]);
    }
  }, [goals, autoMode, suggestions]);

  // Toggle status
  const handleStatusChange = (idx, status) => {
    setGoals(goals.map((g, i) => i === idx ? { ...g, status } : g));
  };

  // Update ETA
  const handleEtaChange = (idx, eta) => {
    setGoals(goals.map((g, i) => i === idx ? { ...g, eta } : g));
  };

  // Update progress
  const handleProgressChange = (idx, progress) => {
    setGoals(goals.map((g, i) => i === idx ? { ...g, progress: Number(progress) } : g));
  };

  // Handle upload: send file to backend
  const handleMediaUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('http://localhost:5001/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data && data.filename) {
        alert(`Uploaded: ${data.filename}`);
      } else {
        alert('Upload failed.');
      }
    } catch (err) {
      alert('Upload error: ' + err.message);
    }
  };

  // Helper to generate a unique ID
  const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

  // Remembered codes and directories state
  const defaultCodes = [
    { id: genId(), code: 'console.log("Hello, ConnectZ!")', dir: 'Snippets', tally: 0 },
    { id: genId(), code: 'function add(a, b) { return a + b; }', dir: 'Templates', tally: 0 },
    { id: genId(), code: 'const project = { name: "Ophc", type: "AI" };', dir: 'Projects', tally: 0 },
    { id: genId(), code: 'export default function Archive() { return null; }', dir: 'Archives', tally: 0 },
  ];
  const [rememberedCodes, setRememberedCodes] = React.useState(() => {
    const saved = localStorage.getItem('rememberedCodes');
    let codes = saved ? JSON.parse(saved) : defaultCodes;
    // Ensure all codes have an id and bypass property
    codes = codes.map(c => ({ ...c, id: c.id || genId(), bypass: c.bypass || false }));
    return codes;
  });
  // Global bypass state
  const [globalBypass, setGlobalBypass] = React.useState(() => {
    const saved = localStorage.getItem('globalBypass');
    return saved === 'true';
  });
  const [newCode, setNewCode] = React.useState('');
  const directories = [
    { name: 'Projects', icon: '📁' },
    { name: 'Snippets', icon: '📄' },
    { name: 'Templates', icon: '🗂️' },
    { name: 'Archives', icon: '🗄️' },
  ];
  const [selectedDirectory, setSelectedDirectory] = React.useState(directories[0].name);
  const [sortAsc, setSortAsc] = React.useState(false);

  React.useEffect(() => {
    localStorage.setItem('rememberedCodes', JSON.stringify(rememberedCodes));
  }, [rememberedCodes]);
  React.useEffect(() => {
    localStorage.setItem('globalBypass', globalBypass);
  }, [globalBypass]);

  const handleAddRememberedCode = () => {
    if (newCode.trim()) {
      setRememberedCodes([...rememberedCodes, { id: genId(), code: newCode, dir: selectedDirectory, tally: 0, bypass: false }]);
      setNewCode('');
    }
  };

  // Toggle per-code bypass
  const handleToggleBypass = (id) => {
    setRememberedCodes(rememberedCodes.map(c => c.id === id ? { ...c, bypass: !c.bypass } : c));
  };

  const handleEditCode = (id, newVal) => {
    setRememberedCodes(rememberedCodes.map(c => c.id === id ? { ...c, code: newVal } : c));
  };

  const handleDeleteCode = (id) => {
    setRememberedCodes(rememberedCodes.filter(c => c.id !== id));
  };

  const handleUseCode = (id) => {
    setRememberedCodes(rememberedCodes.map(c => c.id === id ? { ...c, tally: (c.tally || 0) + 1 } : c));
  };

  // Helper to add 'y', org/version/definition context, and 'how' to CoreyGPT/Ophc responses
  const coreyDefinition = 'ConnectZ AI assistant, always clarifies with definitions, not codenames';
  const addY = (text) => text.endsWith('y') ? text : text + 'y';
  const addCoreyContext = (text) => `${addY(text)} [org: ConnectZ, CoreyGPT v1.9, def: ${coreyDefinition}, how: To save codes globally, connect to a backend database and sync via API.]`;

  if (!isPremiumUser) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <h1>🧠 Ophc (Premium Only)</h1>
        <p style={{ color: '#b00', fontWeight: 600 }}>This tool is for premium members only.</p>
        <button onClick={onUpgrade} style={{ background: '#f5b700', color: '#fff', border: 'none', borderRadius: 6, padding: '12px 32px', fontSize: 18, marginTop: 24, cursor: 'pointer' }}>Upgrade to Premium</button>
      </div>
    );
  }
  // Audio input (Web Speech API) with voice selection
  const recognitionRef = useRef(null);
  const [voices, setVoices] = React.useState([]);
  const [selectedVoice, setSelectedVoice] = React.useState('');

  React.useEffect(() => {
    if ('speechSynthesis' in window) {
      const populateVoices = () => {
        const allVoices = window.speechSynthesis.getVoices();
        setVoices(allVoices);
        // Set your preferred voice as default if available
        const preferredVoiceName = 'Corey' // Change this to your preferred voice name
        const found = allVoices.find(v => v.name.toLowerCase().includes(preferredVoiceName.toLowerCase()));
        if (allVoices.length && !selectedVoice) {
          setSelectedVoice(found ? found.name : allVoices[0].name);
        }
      };
      populateVoices();
      window.speechSynthesis.onvoiceschanged = populateVoices;
    }
  }, [selectedVoice]);

  // Example: in handleStartAudioInput
  const handleStartAudioInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert(addCoreyContext('Speech recognition not supported in this browser.'));
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      let aiResponse = '';
      try {
        aiResponse = `You said: "${transcript}". (Imagine a smart programming answer here!)`;
      } catch (err) {
        aiResponse = 'Sorry, I could not process your request.';
      }
      aiResponse = addCoreyContext(aiResponse);
      alert('Ophc says: ' + aiResponse);
      if ('speechSynthesis' in window) {
        const utter = new window.SpeechSynthesisUtterance(aiResponse);
        utter.lang = 'en-US';
        const voiceObj = voices.find(v => v.name === selectedVoice);
        if (voiceObj) utter.voice = voiceObj;
        window.speechSynthesis.speak(utter);
      }
    };
    recognition.onerror = (event) => {
      alert(addCoreyContext('Speech recognition error: ' + event.error));
    };
    recognition.start();
    recognitionRef.current = recognition;
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>Ophc</h2>
        <button
          onClick={() => alert('Codebanks coming soon!')}
          style={{
            background: '#f5b700',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '8px 20px',
            fontWeight: 700,
            fontSize: 16,
            cursor: 'pointer',
            boxShadow: '0 2px 8px #0001'
          }}
        >
          🏦 Codebanks
        </button>
      </div>
      <p>Ophc: Your AI-powered mind-mapping and brainstorming tool. Visualize, connect, and organize your ideas Corey-style.</p>
      <OphcUploader onUpload={handleMediaUpload} />
      <div style={{ marginTop: 16, marginBottom: 8 }}>
        <button onClick={handleStartAudioInput} style={{ marginRight: 8, padding: '8px 16px', fontWeight: 600, borderRadius: 8, background: '#b07d2c', color: '#fff', border: 'none', cursor: 'pointer' }}>
          🎤 Talk to Ophc
        </button>
        <label style={{ marginLeft: 8, fontWeight: 500 }}>
          Voice:
          <select value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)} style={{ marginLeft: 8, padding: 4, borderRadius: 6 }}>
            {voices.map(v => (
              <option key={v.name} value={v.name}>{v.name} {v.lang}</option>
            ))}
          </select>
        </label>
      </div>
      <button onClick={handleExportIco} style={{ marginTop: 8, padding: '8px 16px', fontWeight: 600, borderRadius: 8, background: '#f5b700', color: '#fff', border: 'none', cursor: 'pointer' }}>
        Export Icon (.ico)
      </button>
      <MetricsFilterBar onFilter={handleMetricsFilter} />

      {/* --- YTP Track Goals Panel --- */}
      <div style={{ marginTop: 40, background: '#f0f4ff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px #0001' }}>
        <h2>🎯 YTP Track Goals</h2>
        <button onClick={handleAddGoal} style={{ marginBottom: 16, background: '#4caf50', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 16px', fontWeight: 600 }}>+ Add Goal</button>
        <label style={{ float: 'right', fontWeight: 500 }}>
          <input type="checkbox" checked={autoMode} onChange={e => setAutoMode(e.target.checked)} /> Auto Mode
        </label>
        <table style={{ width: '100%', marginTop: 12, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#e6eaff' }}>
              <th style={{ padding: 8, borderRadius: 6 }}>Goal</th>
              <th>Status</th>
              <th>ETA</th>
              <th>Progress</th>
            </tr>
          </thead>
          <tbody>
            {goals.map((g, idx) => (
              <tr key={idx} style={{ background: '#fff', borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 8 }}>{g.title}</td>
                <td>
                  <select value={g.status} onChange={e => handleStatusChange(idx, e.target.value)} disabled={autoMode}>
                    <option>Not Started</option>
                    <option>In Progress</option>
                    <option>Done</option>
                  </select>
                  {!autoMode && (
                    <input
                      type="text"
                      placeholder="Add notes or input (optional)"
                      style={{ marginTop: 6, width: '90%' }}
                      onChange={e => {/* Optionally handle user input per task */}}
                    />
                  )}
                </td>
                <td>
                  <input type="date" value={g.eta} onChange={e => handleEtaChange(idx, e.target.value)} disabled={autoMode} />
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                    ETA: {g.eta}
                  </div>
                </td>
                <td>
                  <input type="number" min={0} max={100} value={g.progress} onChange={e => handleProgressChange(idx, e.target.value)} style={{ width: 60 }} disabled={autoMode} />%
                  <div style={{ background: '#e0e0e0', borderRadius: 4, height: 8, marginTop: 4 }}>
                    <div style={{ width: `${g.progress}%`, background: '#f5b700', height: 8, borderRadius: 4 }} />
                  </div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                    Progress: {g.progress}%
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 24, background: '#fffbe6', borderRadius: 8, padding: 16 }}>
          <h3>💡 Auto Suggestions</h3>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {suggestions.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      </div>

      {/* --- Code Editor Panel --- */}
      <OphcCodeEditor />
      {/* --- Git Commit & Push Panel --- */}
      <OphcGitPanel autoMode={autoMode} autoCommitMsg={autoMode ? 'Auto commit from Ophc' : ''} />
      {/* ...existing code... */}
      <div style={{ marginTop: 32 }}>
        <h2>🖼️ Music Image ConnectZ AI</h2>
        <ImageConnectZAI />
      </div>
      <div style={{ marginTop: 32 }}>
        <h2>🎬 Music Video ConnectZ AI</h2>
        <VideoConnectZAI />
      </div>
      <div style={{ marginTop: 32 }}>
        <h2>🎤 Music Writer ConnectZ</h2>
        <MusicWriterConnectZ />
      </div>
      <div style={{ marginTop: 32 }}>
        <PreDAWTab />
      </div>
      {/* Add more features here */}
      {/* Directories Menu */}
      <div style={{ margin: '24px 0', display: 'flex', gap: 16 }}>
        {directories.map(dir => (
          <button
            key={dir.name}
            onClick={() => setSelectedDirectory(dir.name)}
            style={{
              background: selectedDirectory === dir.name ? '#b07d2c' : '#eee',
              color: selectedDirectory === dir.name ? '#fff' : '#333',
              border: 'none',
              borderRadius: 8,
              padding: '8px 18px',
              fontWeight: 600,
              fontSize: 16,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>{dir.icon}</span> {dir.name}
          </button>
        ))}
      </div>
      {/* Remembered Codes Section */}
      <div style={{ margin: '24px 0', background: '#f7f7fa', borderRadius: 12, padding: 20 }}>
        <h2>💾 Remembered Codes ({selectedDirectory})</h2>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            value={newCode}
            onChange={e => setNewCode(e.target.value)}
            placeholder={`Save code to ${selectedDirectory}...`}
            style={{ flex: 1, borderRadius: 6, padding: 8, fontSize: 15 }}
          />
          <button onClick={handleAddRememberedCode} style={{ background: '#4caf50', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 600, cursor: 'pointer' }}>Save</button>
          <button onClick={() => setSortAsc(a => !a)} style={{ background: '#2196f3', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 600, cursor: 'pointer' }}>
            Sort {sortAsc ? '▲' : '▼'}
          </button>
        </div>
        {/* Global Bypass Checkbox */}
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontWeight: 600 }}>
            <input type="checkbox" checked={globalBypass} onChange={e => setGlobalBypass(e.target.checked)} />
            &nbsp;Bypass (show code/variable names globally)
          </label>
        </div>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {rememberedCodes.filter(c => c.dir === selectedDirectory).length === 0 && (
            <li style={{ color: '#888' }}>No codes saved in this directory.</li>
          )}
          {rememberedCodes
            .filter(c => c.dir === selectedDirectory)
            .sort((a, b) => sortAsc ? (a.tally || 0) - (b.tally || 0) : (b.tally || 0) - (a.tally || 0))
            .map((c) => {
              // Show code/variable name if per-code bypass is on, else if globalBypass is on, else show definition
              const showCode = c.bypass || (!c.hasOwnProperty('bypass') && globalBypass) || (!c.bypass && globalBypass);
              // For demo: if code is 'nrg', show 'energy' if not bypassed
              let displayCode = c.code;
              if (!showCode && c.code.trim() === 'nrg') displayCode = 'energy';
              return (
                <li key={c.id} style={{ background: '#fff', borderRadius: 8, padding: 10, marginBottom: 8, boxShadow: '0 1px 4px #0001', fontFamily: 'monospace', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    value={displayCode}
                    onChange={e => handleEditCode(c.id, e.target.value)}
                    style={{ flex: 1, border: 'none', background: 'transparent', fontFamily: 'monospace', fontSize: 15 }}
                  />
                  <label style={{ fontSize: 13, color: '#b07d2c', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="checkbox" checked={!!c.bypass} onChange={() => handleToggleBypass(c.id)} /> Bypass
                  </label>
                  <span style={{ color: '#b07d2c', fontWeight: 700, minWidth: 32, textAlign: 'right' }}>Tally: {c.tally || 0}</span>
                  <button onClick={() => handleUseCode(c.id)} style={{ background: '#ffd600', color: '#333', border: 'none', borderRadius: 6, padding: '4px 10px', fontWeight: 600, cursor: 'pointer' }}>Use</button>
                  <button onClick={() => handleDeleteCode(c.id)} style={{ background: '#e53935', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontWeight: 600, cursor: 'pointer' }}>Delete</button>
                </li>
              );
            })}
        </ul>
      </div>
    </div>
  );
};

export default OphcApp;
