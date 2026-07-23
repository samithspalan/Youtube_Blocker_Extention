import { useState, useEffect } from 'react'

function App() {
  const [channels, setChannels] = useState([]);
  const [input, setInput] = useState('');

  // 1. Hydrate state from Chrome Storage on component mount
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get({ blockedChannels: [] }, (result) => {
        setChannels(result.blockedChannels);
      });
    }
  }, []);
const handleBlock = async () => {
    // 1. Normalize the input to lowercase (matching our Content Script logic)
    const channelName = input.trim().toLowerCase(); 
    
    if (!channelName) return;
    if (channels.includes(channelName)) return; // Prevent duplicates

    const updatedList = [...channels, channelName];
    
    // 2. Local State: Save to Chrome Storage FIRST
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ blockedChannels: updatedList }, () => {
        setChannels(updatedList);
        setInput('');
      });
    } else {
      setChannels(updatedList);
      setInput('');
    }

    // 3. Cloud State: Sync with your Express Backend
    try {
      const response = await fetch('http://localhost:5000/api/blocks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ handle: channelName })
      });
      
      if (response.ok) {
        console.log(`Successfully synced ${channelName} to backend!`);
      }
    } catch (error) {
      // If the backend is offline, the user doesn't notice. The local extension still works!
      console.error("Backend sync failed. Server might be down:", error);
    }
  };

  return (
    <div style={{ width: '250px', padding: '12px', fontFamily: 'sans-serif' }}>
      <h3 style={{ marginTop: 0 }}>YT Stealth Blocker</h3>
      
      <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
        <input 
          style={{ width: '100%', padding: '6px' }}
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          placeholder="Enter channel name..." 
        />
        <button 
          style={{ padding: '6px 10px', background: '#cc0000', color: 'white', border: 'none', cursor: 'pointer' }}
          onClick={handleBlock}
        >
          Block
        </button>
      </div>

      <h4 style={{ margin: '10px 0 5px 0' }}>Target List</h4>
      <ul style={{ paddingLeft: '20px', margin: 0, maxHeight: '150px', overflowY: 'auto' }}>
        {channels.map((ch, i) => <li key={i}>{ch}</li>)}
      </ul>
    </div>
  )
}

export default App;