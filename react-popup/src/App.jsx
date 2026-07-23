import { useState, useEffect } from 'react';

export default function App() {
  const [channels, setChannels] = useState([]);
  const [input, setInput] = useState('');

  // 1. Load the initial blocked list from Chrome Storage
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['blockedChannels'], (result) => {
        if (result.blockedChannels) {
          setChannels(result.blockedChannels);
        }
      });
    }
  }, []);

  // 2. Handle the Block action
  const handleBlock = async () => {
    let channelName = input.trim().toLowerCase(); 
    if (channelName.startsWith('@')) {
        channelName = channelName.substring(1);
    }
    
    if (!channelName) return;
    if (channels.includes(channelName)) return;

    const updatedList = [...channels, channelName];
    
    // Save locally
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ blockedChannels: updatedList }, () => {
        setChannels(updatedList);
        setInput('');
      });
    } else {
      setChannels(updatedList);
      setInput('');
    }

    // Sync with MongoDB backend
    try {
      const response = await fetch('http://localhost:5000/api/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: channelName })
      });
      if (response.ok) {
        console.log(`Successfully synced ${channelName} to backend!`);
      }
    } catch (error) {
      console.error("Backend sync failed. Server might be down:", error);
    }
  };

  // 3. The Dashboard Router Trigger
  const openDashboard = () => {
    // This tells Chrome to open the dedicated options page we defined in manifest.json
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      // Fallback if testing in a normal browser window
      window.open('/#/dashboard'); 
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h3 style={{ margin: '0 0 15px 0' }}>YT Stealth Blocker</h3>
      
      <div style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="@mrbeast"
          style={{ flex: 1, padding: '8px', background: '#2a2a2a', color: 'white', border: '1px solid #444', borderRadius: '4px' }}
        />
        <button 
          onClick={handleBlock}
          style={{ background: '#e50914', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Block
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#888' }}>Blocked Targets</h4>
        <ul style={{ margin: 0 }}>
          {channels.map((ch, idx) => (
            <li key={idx} style={{ background: '#2a2a2a', padding: '8px', marginBottom: '5px', borderRadius: '4px' }}>
              {ch}
            </li>
          ))}
        </ul>
      </div>

      {/* THE DASHBOARD BUTTON */}
      <button 
        onClick={openDashboard}
        style={{ 
          marginTop: '15px', 
          width: '100%', 
          background: '#2a2a2a', 
          border: '1px solid #555', 
          color: '#e0e0e0', 
          padding: '12px', 
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        📊 Open Analytics Dashboard
      </button>
    </div>
  );
}