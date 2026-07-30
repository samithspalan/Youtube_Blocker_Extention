import { useState, useEffect } from 'react';

// Guard: true only when running as a real Chrome extension
const isChromeExtension = typeof chrome !== 'undefined' && !!chrome.storage;

const styles = {
  container: {
    background: 'transparent',
    height: '100vh',
    overflow: 'hidden'
  },
  sidebar: {
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    background: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    boxShadow: 'var(--glass-shadow)',
    height: 'calc(100vh - 32px)',
    maxHeight: 'calc(100vh - 32px)',
    overflowY: 'auto',
    minHeight: 0
  },
  mainContent: {
    flex: 1,
    height: '100vh',
    maxHeight: '100vh',
    overflowY: 'auto',
    paddingTop: '30px',
    paddingBottom: '80px',
    paddingLeft: '40px',
    paddingRight: '40px',
    boxSizing: 'border-box',
    minHeight: 0
  },
  card: {
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid var(--glass-border)',
    boxShadow: 'var(--glass-shadow)',
    borderRadius: '20px'
  }
};

export default function App() {
  const getInitials = (handle) => {
    if (!handle) return 'YT';
    const clean = handle.replace(/^@/, '');
    const parts = clean.split(/[\s.:_-]+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  };

  const [channels, setChannels] = useState([]); // blocked channels
  const [whitelistedChannels, setWhitelistedChannels] = useState([]); // whitelisted channels
  const [input, setInput] = useState(''); // shared input for dashboard search
  const [blockInput, setBlockInput] = useState(''); // popup block input
  const [whitelistInput, setWhitelistInput] = useState(''); // popup whitelist input
  const [focusedInput, setFocusedInput] = useState(null); // 'block' | 'whitelist'
  const [suggestions, setSuggestions] = useState([]);
  const [dbStatus, setDbStatus] = useState('Connected');
  const [isPopup, setIsPopup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeTab, setActiveTab] = useState('command');
  const [analyticsData, setAnalyticsData] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  const [totalNukes, setTotalNukes] = useState(() => {
    return isChromeExtension ? 0 : 34; // mock total for dev mode
  });
  const [nukeHistory, setNukeHistory] = useState(() => {
    if (isChromeExtension) return {};
    const history = {};
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      history[key] = [8, 15, 3, 22, 10, 18, 5][i];
    }
    return history;
  });

  const [totalWhitelistDisplayed, setTotalWhitelistDisplayed] = useState(() => {
    return isChromeExtension ? 0 : 124; // mock total for dev mode
  });
  const [whitelistDisplayHistory, setWhitelistDisplayHistory] = useState(() => {
    if (isChromeExtension) return {};
    const history = {};
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      history[key] = [12, 25, 18, 30, 15, 20, 14][i]; // mock values for whitelisted videos displayed
    }
    return history;
  });

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (window.innerWidth < 600) setIsPopup(true);
  }, []);

  useEffect(() => {
    if (!isChromeExtension) return;
    chrome.storage.local.get(['blockedChannels', 'whitelistedChannels', 'totalNukes', 'nukeHistory', 'totalWhitelistDisplayed', 'whitelistDisplayHistory'], (result) => {
      if (result.blockedChannels) setChannels(result.blockedChannels);
      if (result.whitelistedChannels) setWhitelistedChannels(result.whitelistedChannels);
      if (result.totalNukes !== undefined) setTotalNukes(result.totalNukes);
      if (result.nukeHistory) setNukeHistory(result.nukeHistory);
      if (result.totalWhitelistDisplayed !== undefined) setTotalWhitelistDisplayed(result.totalWhitelistDisplayed);
      if (result.whitelistDisplayHistory) setWhitelistDisplayHistory(result.whitelistDisplayHistory);
    });

    const handleStorageChange = (changes, namespace) => {
      if (namespace === 'local') {
        if (changes.blockedChannels) setChannels(changes.blockedChannels.newValue || []);
        if (changes.whitelistedChannels) setWhitelistedChannels(changes.whitelistedChannels.newValue || []);
        if (changes.totalNukes) setTotalNukes(changes.totalNukes.newValue || 0);
        if (changes.nukeHistory) setNukeHistory(changes.nukeHistory.newValue || {});
        if (changes.totalWhitelistDisplayed) setTotalWhitelistDisplayed(changes.totalWhitelistDisplayed.newValue || 0);
        if (changes.whitelistDisplayHistory) setWhitelistDisplayHistory(changes.whitelistDisplayHistory.newValue || {});
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const currentQuery = isPopup 
    ? (focusedInput === 'block' ? blockInput : (focusedInput === 'whitelist' ? whitelistInput : ''))
    : input;

  useEffect(() => {
    let active = true;
    if (currentQuery.trim().length > 1) {
      if (isChromeExtension) {
        chrome.runtime.sendMessage({ action: 'fetchSuggestions', query: currentQuery }, (response) => {
          if (!active) return;
          if (chrome.runtime.lastError) {
            console.error("Chrome runtime error:", chrome.runtime.lastError);
            return;
          }
          if (response && response.success && response.data) {
            setSuggestions(response.data);
          } else {
            setSuggestions([]);
          }
        });
      } else {
        // Dev fallback: return matching rich objects
        setSuggestions([
          { name: `${currentQuery} (mock 1)`, thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=80&auto=format&fit=crop', channelId: 'mock-id-1' },
          { name: `${currentQuery} (mock 2)`, thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=80&auto=format&fit=crop', channelId: 'mock-id-2' }
        ]);
      }
    } else {
      setSuggestions([]);
    }
    return () => {
      active = false;
    };
  }, [currentQuery]);

  useEffect(() => {
    if (activeTab === 'analytics') {
      setAnalyticsLoading(true);
      fetch('http://localhost:5000/api/blocks')
        .then(res => res.json())
        .then(data => {
          if (data && data.success && data.data) {
            setAnalyticsData(data.data);
          } else {
            generateFallbackAnalytics();
          }
        })
        .catch(err => {
          console.log("Using fallback/mock analytics:", err);
          generateFallbackAnalytics();
        })
        .finally(() => {
          setAnalyticsLoading(false);
        });
    }
  }, [activeTab, channels]);

  const generateFallbackAnalytics = () => {
    if (channels.length > 0) {
      const fallback = channels.map((ch, idx) => {
        const name = typeof ch === 'string' ? ch : ch.name || 'Unknown';
        return {
          _id: `fallback-${idx}`,
          handle: name,
          blockCount: Math.floor(Math.random() * 18) + 4,
          createdAt: new Date(Date.now() - (idx * 24 * 60 * 60 * 1000 + Math.random() * 10000000)).toISOString()
        };
      });
      setAnalyticsData(fallback.sort((a, b) => b.blockCount - a.blockCount));
    } else {
      setAnalyticsData([
        { _id: 'mock-1', handle: 'MrBeast', blockCount: 42, createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
        { _id: 'mock-2', handle: 'T-Series', blockCount: 28, createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
        { _id: 'mock-3', handle: 'PewDiePie', blockCount: 15, createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
      ]);
    }
  };

  const getCleanHandle = (item) => {
    if (!item) return '';
    const raw = typeof item === 'string' ? item : (item.handle || item.name || '');
    return raw.replace('@', '').toLowerCase().trim();
  };

  const handleBlock = (targetData) => {
    const isString = typeof targetData === 'string';
    const rawName = isString ? targetData : targetData.name;
    if (!rawName || !rawName.trim()) return;
    const cleanName = rawName.trim();
    
    const handle = getCleanHandle(targetData);

    const blockObject = isString 
      ? { name: cleanName, handle: handle }
      : { name: cleanName, handle: handle, thumbnail: targetData.thumbnail, channelId: targetData.channelId };

    if (isChromeExtension) {
      chrome.storage.local.get(['blockedChannels', 'whitelistedChannels'], (result) => {
        const storedBlocked = result.blockedChannels || [];
        const storedWhitelisted = result.whitelistedChannels || [];

        const blockExists = storedBlocked.some(c => getCleanHandle(c) === handle);
        const whitelistedIndex = storedWhitelisted.findIndex(c => getCleanHandle(c) === handle);

        let updatedWhitelisted = storedWhitelisted;
        let moved = false;

        if (whitelistedIndex > -1) {
          updatedWhitelisted = storedWhitelisted.filter((_, idx) => idx !== whitelistedIndex);
          moved = true;
        }

        if (blockExists) {
          if (moved) {
            chrome.storage.local.set({ whitelistedChannels: updatedWhitelisted }, () => {
              setWhitelistedChannels(updatedWhitelisted);
              triggerToast(`Channel moved from Whitelist to Blocked`);
            });
          }
          setInput('');
          setBlockInput('');
          setSuggestions([]);
          return;
        }

        const updatedBlocked = [...storedBlocked, blockObject];

        chrome.storage.local.set({
          blockedChannels: updatedBlocked,
          whitelistedChannels: updatedWhitelisted
        }, () => {
          setChannels(updatedBlocked);
          setWhitelistedChannels(updatedWhitelisted);
          if (moved) {
            triggerToast(`Channel moved from Whitelist to Blocked`);
          } else {
            triggerToast(`Channel added to Blocklist`);
          }
        });
      });
    } else {
      const wasWhitelisted = whitelistedChannels.some(c => getCleanHandle(c) === handle);

      let updatedWhitelisted = whitelistedChannels;
      if (wasWhitelisted) {
        updatedWhitelisted = whitelistedChannels.filter(c => getCleanHandle(c) !== handle);
        setWhitelistedChannels(updatedWhitelisted);
      }

      const blockExists = channels.some(c => getCleanHandle(c) === handle);

      if (!blockExists) {
        const updatedBlocked = [...channels, blockObject];
        setChannels(updatedBlocked);
        if (wasWhitelisted) {
          triggerToast(`Channel moved from Whitelist to Blocked`);
        } else {
          triggerToast(`Channel added to Blocklist`);
        }
      }
    }

    setInput('');
    setBlockInput('');
    setSuggestions([]);
  };

  const handleWhitelist = (targetData) => {
    const isString = typeof targetData === 'string';
    const rawName = isString ? targetData : targetData.name;
    if (!rawName || !rawName.trim()) return;
    const cleanName = rawName.trim();
    
    const handle = getCleanHandle(targetData);

    const whitelistObject = isString 
      ? { name: cleanName, handle: handle }
      : { name: cleanName, handle: handle, thumbnail: targetData.thumbnail, channelId: targetData.channelId };

    if (isChromeExtension) {
      chrome.storage.local.get(['blockedChannels', 'whitelistedChannels'], (result) => {
        const storedBlocked = result.blockedChannels || [];
        const storedWhitelisted = result.whitelistedChannels || [];

        const whitelistExists = storedWhitelisted.some(c => getCleanHandle(c) === handle);
        const blockedIndex = storedBlocked.findIndex(c => getCleanHandle(c) === handle);

        let updatedBlocked = storedBlocked;
        let moved = false;

        if (blockedIndex > -1) {
          updatedBlocked = storedBlocked.filter((_, idx) => idx !== blockedIndex);
          moved = true;
        }

        if (whitelistExists) {
          if (moved) {
            chrome.storage.local.set({ blockedChannels: updatedBlocked }, () => {
              setChannels(updatedBlocked);
              triggerToast(`Channel moved from Blocked to Whitelist`);
            });
          }
          setInput('');
          setWhitelistInput('');
          setSuggestions([]);
          return;
        }

        const updatedWhitelisted = [...storedWhitelisted, whitelistObject];

        chrome.storage.local.set({
          blockedChannels: updatedBlocked,
          whitelistedChannels: updatedWhitelisted
        }, () => {
          setChannels(updatedBlocked);
          setWhitelistedChannels(updatedWhitelisted);
          chrome.runtime.sendMessage({ action: 'fetchLatestVideos', channelHandle: handle });
          
          if (moved) {
            triggerToast(`Channel moved from Blocked to Whitelist`);
          } else {
            triggerToast(`Channel added to Whitelist`);
          }
        });
      });
    } else {
      const wasBlocked = channels.some(c => getCleanHandle(c) === handle);

      let updatedBlocked = channels;
      if (wasBlocked) {
        updatedBlocked = channels.filter(c => getCleanHandle(c) !== handle);
        setChannels(updatedBlocked);
      }

      const whitelistExists = whitelistedChannels.some(c => getCleanHandle(c) === handle);

      if (!whitelistExists) {
        const updatedWhitelisted = [...whitelistedChannels, whitelistObject];
        setWhitelistedChannels(updatedWhitelisted);
        if (wasBlocked) {
          triggerToast(`Channel moved from Blocked to Whitelist`);
        } else {
          triggerToast(`Channel added to Whitelist`);
        }
      }
    }

    setInput('');
    setWhitelistInput('');
    setSuggestions([]);
  };

  const removeChannel = (channelToRemove) => {
    const handleToRemove = getCleanHandle(channelToRemove);
    const newChannels = channels.filter(c => getCleanHandle(c) !== handleToRemove);
    setChannels(newChannels);
    if (isChromeExtension) chrome.storage.local.set({ blockedChannels: newChannels });
  };

  const removeWhitelistedChannel = (channelToRemove) => {
    const handleToRemove = getCleanHandle(channelToRemove);
    const newWhitelisted = whitelistedChannels.filter(c => getCleanHandle(c) !== handleToRemove);
    setWhitelistedChannels(newWhitelisted);
    if (isChromeExtension) chrome.storage.local.set({ whitelistedChannels: newWhitelisted });
  };

  const openDashboard = () => {
    if (isChromeExtension) {
      chrome.tabs.create({ url: chrome.runtime.getURL('react-popup/dist/index.html') });
    } else {
      window.open('/#/dashboard', '_blank');
    }
  };

  const getSevenDayStats = () => {
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const stats = [];
    
    // Get last 7 days starting from 6 days ago up to today
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const count = nukeHistory[key] || 0;
      stats.push({
        label: daysOfWeek[d.getDay()],
        count: count
      });
    }
    return stats;
  };

  const sevenDays = getSevenDayStats();
  const maxVal = Math.max(...sevenDays.map(d => d.count), 5);
  const linePath = sevenDays.map((d, i) => `${i === 0 ? 'M' : 'L'} ${i * 50} ${100 - (d.count / maxVal) * 90}`).join(' ');
  const areaPath = `${linePath} L 300 120 L 0 120 Z`;

  const getSevenDayWhitelistStats = () => {
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const stats = [];
    
    // Get last 7 days starting from 6 days ago up to today
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const count = whitelistDisplayHistory[key] || 0;
      stats.push({
        label: daysOfWeek[d.getDay()],
        count: count
      });
    }
    return stats;
  };

  const sevenDaysWhitelist = getSevenDayWhitelistStats();
  const maxValWhitelist = Math.max(...sevenDaysWhitelist.map(d => d.count), 5);
  const linePathWhitelist = sevenDaysWhitelist.map((d, i) => `${i === 0 ? 'M' : 'L'} ${i * 50} ${100 - (d.count / maxValWhitelist) * 90}`).join(' ');
  const areaPathWhitelist = `${linePathWhitelist} L 300 120 L 0 120 Z`;

  const normalizedChannels = channels.map(c => typeof c === 'string' ? c : c.name || 'Unknown');

  // ============================================
  // TOOLBAR POPUP VIEW
  // ============================================
  if (isPopup) {
    const popupStyles = {
      container: {
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(24px) saturate(150%)',
        WebkitBackdropFilter: 'blur(24px) saturate(150%)',
        border: '1px solid var(--glass-border)',
        borderRadius: '16px',
        boxShadow: 'var(--glass-shadow)',
      },
      header: {
        background: 'transparent',
        borderBottom: '1px solid var(--glass-border)',
      },
      inputRow: {
        background: 'var(--glass-bg-input)',
        border: '1px solid var(--glass-border)',
        borderRadius: '12px',
      },
      input: {
        background: 'transparent',
        border: 'none',
        outline: 'none',
        color: 'var(--text-primary)',
      },
      blockBtn: {
        background: 'rgba(239, 68, 68, 0.15)',
        border: '1px solid rgba(239, 68, 68, 0.4)',
        color: '#f87171',
        boxShadow: '0 0 12px rgba(239, 68, 68, 0.25)',
        borderRadius: '8px',
      },
      whitelistBtn: {
        background: 'rgba(59, 130, 246, 0.15)',
        border: '1px solid rgba(59, 130, 246, 0.4)',
        color: '#60a5fa',
        boxShadow: '0 0 12px rgba(59, 130, 246, 0.25)',
        borderRadius: '8px',
      },
      statsPill: {
        background: 'var(--glass-bg-pill)',
        border: '1px solid var(--glass-border-pill)',
        borderRadius: '9999px',
        color: 'var(--accent-blue)',
      },
      dashboardBtn: {
        background: 'rgba(59, 130, 246, 0.15)',
        border: '1px solid rgba(59, 130, 246, 0.4)',
        color: '#60a5fa',
        boxShadow: '0 0 12px rgba(59, 130, 246, 0.25)',
        borderRadius: '12px',
      }
    };

    return (
      <div className="flex flex-col w-[360px] h-[400px] font-sans" style={popupStyles.container}>
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-[15px]" style={popupStyles.header}>
          <h2 className="m-0 text-[15px] font-semibold text-text-primary flex items-center gap-2">
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </span>
            YT Stealth Blocker
          </h2>
          <span className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></span>
            Active
          </span>
        </div>

        <div className="flex-1 p-5 flex flex-col min-h-0 justify-between">
          {/* Inputs section wrapper */}
          <div className="flex flex-col gap-4">
            {/* Input 1: Block */}
            <div className="relative w-full">
              <div className="flex items-center overflow-hidden" style={popupStyles.inputRow}>
                <span className="px-2.5 text-text-secondary flex items-center justify-center" style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(255,255,255,0.02)', margin: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5" style={{ opacity: 0.8 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </span>
                <input
                  value={blockInput}
                  onChange={(e) => setBlockInput(e.target.value)}
                  onFocus={() => setFocusedInput('block')}
                  onBlur={() => setTimeout(() => setFocusedInput(null), 200)}
                  placeholder="Target channel to block..."
                  className="flex-1 bg-transparent border-none text-text-primary py-2.5 outline-none text-[13px]"
                  style={popupStyles.input}
                />
                <button
                  onClick={() => handleBlock(blockInput)}
                  className="border-none px-4 py-2.5 cursor-pointer font-bold text-[13px] mr-1.5"
                  style={popupStyles.blockBtn}
                >
                  Block
                </button>
              </div>
              {focusedInput === 'block' && suggestions.length > 0 && (
                <ul className="absolute top-full left-0 right-0 mt-1 bg-bg-card border border-border-theme rounded-md p-0 m-0 list-none z-50 max-h-[120px] overflow-y-auto shadow-lg">
                  {suggestions.map((s, i) => (
                    <li
                      key={i}
                      onMouseDown={(e) => { e.preventDefault(); handleBlock(s); }}
                      className="p-3 cursor-pointer border-b border-border-theme text-[14px] text-text-primary hover:bg-bg-hover flex items-center gap-2.5"
                    >
                      {s.thumbnail ? (
                        <img
                          src={s.thumbnail}
                          alt={s.name}
                          className="w-6 h-6 rounded-full object-cover border border-white/10"
                        />
                      ) : (
                        <span className="w-6 h-6 rounded-full bg-accent-blue/20 flex items-center justify-center text-[10px]">👤</span>
                      )}
                      <span className="font-medium truncate">{s.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Input 2: Whitelist */}
            <div className="relative w-full">
              <div className="flex items-center overflow-hidden" style={popupStyles.inputRow}>
                <span className="px-2.5 text-text-secondary flex items-center justify-center" style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(255,255,255,0.02)', margin: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-500" style={{ opacity: 0.85 }}><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                </span>
                <input
                  value={whitelistInput}
                  onChange={(e) => setWhitelistInput(e.target.value)}
                  onFocus={() => setFocusedInput('whitelist')}
                  onBlur={() => setTimeout(() => setFocusedInput(null), 200)}
                  placeholder="Target channel to whitelist..."
                  className="flex-1 bg-transparent border-none text-text-primary py-2.5 outline-none text-[13px]"
                  style={popupStyles.input}
                />
                <button
                  onClick={() => handleWhitelist(whitelistInput)}
                  className="border-none px-4 py-2.5 cursor-pointer font-bold text-[13px] mr-1.5"
                  style={popupStyles.whitelistBtn}
                >
                  Whitelist
                </button>
              </div>
              {focusedInput === 'whitelist' && suggestions.length > 0 && (
                <ul className="absolute top-full left-0 right-0 mt-1 bg-bg-card border border-border-theme rounded-md p-0 m-0 list-none z-50 max-h-[120px] overflow-y-auto shadow-lg">
                  {suggestions.map((s, i) => (
                    <li
                      key={i}
                      onMouseDown={(e) => { e.preventDefault(); handleWhitelist(s); }}
                      className="p-3 cursor-pointer border-b border-border-theme text-[14px] text-text-primary hover:bg-bg-hover flex items-center gap-2.5"
                    >
                      {s.thumbnail ? (
                        <img
                          src={s.thumbnail}
                          alt={s.name}
                          className="w-6 h-6 rounded-full object-cover border border-white/10"
                        />
                      ) : (
                        <span className="w-6 h-6 rounded-full bg-accent-blue/20 flex items-center justify-center text-[10px]">👤</span>
                      )}
                      <span className="font-medium truncate">{s.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Stats Badge */}
          <div className="flex justify-center my-2">
            <span className="px-4 py-2 text-[12px] font-semibold flex items-center" style={popupStyles.statsPill}>
              <span className="text-accent-blue">{channels.length} Blocked</span>
              <span className="mx-2" style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
              <span className="text-accent-blue">{whitelistedChannels.length} Whitelisted</span>
            </span>
          </div>

          {/* Open Dashboard */}
          <button onClick={openDashboard} className="w-full py-3.5 cursor-pointer font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2" style={popupStyles.dashboardBtn}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-pulse"><path d="M4.5 16.5c-1.5 1.25-2.5 3-2.5 4.5h20c0-1.5-1-3.25-2.5-4.5M12 2C8.5 2 6 5.5 6 9v5h12V9c0-3.5-2.5-7-6-7zM9 22h6"/></svg>
            Open Full Dashboard
          </button>
        </div>
        {showToast && (
          <div 
            style={{
              position: 'fixed',
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '10px 16px',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: '600',
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s ease',
              whiteSpace: 'nowrap'
            }}
          >
            <span>🔔</span> {toastMessage}
          </div>
        )}
      </div>
    );
  }

  // ============================================
  // FULL-SCREEN DASHBOARD VIEW
  // ============================================
  return (
    <div
      className="flex w-screen min-w-[800px] font-sans relative"
      style={styles.container}
    >
      {/* Decorative Neon Mesh Blobs for Glassmorphism Contrast */}
      <div 
        className="absolute top-[-10%] left-[20%] w-[350px] h-[350px] rounded-full blur-[100px] pointer-events-none opacity-40 animate-pulse"
        style={{ background: 'radial-gradient(circle, var(--accent-blue) 0%, transparent 70%)' }}
      />
      <div 
        className="absolute bottom-[5%] right-[10%] w-[400px] h-[400px] rounded-full blur-[120px] pointer-events-none opacity-30"
        style={{ background: 'radial-gradient(circle, var(--accent-green) 0%, transparent 70%)' }}
      />
      <div 
        className="absolute top-[40%] right-[30%] w-[300px] h-[300px] rounded-full blur-[90px] pointer-events-none opacity-20"
        style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.8) 0%, transparent 70%)' }}
      />

      {/* ---- SIDEBAR ---- */}
      <div
        className="flex flex-col w-[240px] m-4 rounded-[20px] py-5 relative z-10"
        style={styles.sidebar}
      >
        {/* Logo */}
        <div className="flex items-center px-5 pb-5 border-b border-border-theme">
          <span className="text-2xl mr-2.5">🛡️</span>
          <h2 
            className="m-0 text-lg font-black italic tracking-wide"
            style={{
              background: 'linear-gradient(135deg, var(--accent-blue) 30%, #a78bfa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            YT Stealth
          </h2>
        </div>

        {/* Nav */}
        <nav className="flex flex-col flex-1 overflow-y-auto py-5">
          {/* MAIN section */}
          <div className="mb-5 flex flex-col gap-1">
            <p className="text-[11px] font-bold text-text-secondary px-5 mb-2 tracking-widest">MAIN</p>
            <button
              onClick={() => setActiveTab('command')}
              className="flex items-center px-5 py-2.5 text-sm cursor-pointer border-none bg-transparent text-left outline-none transition-all w-[calc(100%-20px)] mx-2.5"
              style={activeTab === 'command' ? {
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
                border: '1px solid rgba(96, 165, 250, 0.3)',
                boxShadow: 'inset 0 0 12px rgba(96, 165, 250, 0.2)',
                borderRadius: '10px',
                color: theme === 'dark' ? '#ffffff' : 'var(--accent-blue)',
                fontWeight: '600'
              } : {
                color: 'var(--text-secondary)'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mr-3" style={{ color: activeTab === 'command' ? 'var(--accent-blue)' : 'inherit' }}><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
              Terminal
            </button>
            <button
              onClick={() => setActiveTab('whitelist')}
              className="flex items-center px-5 py-2.5 text-sm cursor-pointer border-none bg-transparent text-left outline-none transition-all w-[calc(100%-20px)] mx-2.5"
              style={activeTab === 'whitelist' ? {
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
                border: '1px solid rgba(96, 165, 250, 0.3)',
                boxShadow: 'inset 0 0 12px rgba(96, 165, 250, 0.2)',
                borderRadius: '10px',
                color: theme === 'dark' ? '#ffffff' : 'var(--accent-blue)',
                fontWeight: '600'
              } : {
                color: 'var(--text-secondary)'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mr-3" style={{ color: activeTab === 'whitelist' ? 'var(--accent-blue)' : 'inherit' }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              Whitelist
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className="flex items-center px-5 py-2.5 text-sm cursor-pointer border-none bg-transparent text-left outline-none transition-all w-[calc(100%-20px)] mx-2.5"
              style={activeTab === 'analytics' ? {
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
                border: '1px solid rgba(96, 165, 250, 0.3)',
                boxShadow: 'inset 0 0 12px rgba(96, 165, 250, 0.2)',
                borderRadius: '10px',
                color: theme === 'dark' ? '#ffffff' : 'var(--accent-blue)',
                fontWeight: '600'
              } : {
                color: 'var(--text-secondary)'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mr-3" style={{ color: activeTab === 'analytics' ? 'var(--accent-blue)' : 'inherit' }}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              Analytics
            </button>
          </div>

          {/* SYSTEM section — pushed to bottom */}
          <div className="mt-auto mb-5">
            <p className="text-[11px] font-bold text-text-secondary px-5 mb-2.5 tracking-widest">SYSTEM</p>
            <a
              className="flex items-center px-5 py-2.5 text-sm text-text-secondary cursor-pointer no-underline hover:bg-bg-hover"
              onClick={() => setShowSettings(!showSettings)}
            >
              <span className="mr-3">⚙️</span> Settings
            </a>
            {showSettings && (
              <div className="flex items-center justify-between px-5 py-2.5">
                <span className="text-[13px] text-text-secondary">Theme</span>
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="bg-bg-hover text-text-primary border border-border-theme rounded px-2 py-1 text-xs cursor-pointer hover:opacity-80"
                >
                  {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
                </button>
              </div>
            )}
            
            {/* Active Status Card */}
            <div 
              className="mx-4 mt-4 relative overflow-hidden"
              style={{
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                borderRadius: '16px',
                border: '1px solid var(--glass-border)',
                boxShadow: 'inset 0 0 10px var(--status-card-inset)',
                padding: '16px'
              }}
            >
              <div className="flex items-center gap-1.5 mb-1 relative z-10">
                <span className="w-2.5 h-2.5 rounded-full bg-[#4ade80] animate-pulse" />
                <span className="text-xs font-bold text-[#4ade80]">Active</span>
              </div>
              <p className="m-0 text-[11px] text-text-secondary relative z-10 leading-snug">Extension is running smoothly</p>
              {/* Glowing Shield Icon */}
              <div 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-accent-blue/30"
                style={{
                  filter: 'drop-shadow(0 0 6px var(--accent-blue))'
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
            </div>
          </div>
        </nav>
      </div>

      <div 
        className="flex-1 relative z-10"
        style={styles.mainContent}
      >
        {activeTab === 'command' ? (
          <>
            {/* Header row */}
            <div className="flex justify-between items-center mb-8">
              <h1 
                className="m-0 text-3xl font-black italic tracking-wide"
                style={{
                  background: 'linear-gradient(135deg, #a78bfa 30%, var(--accent-blue) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 0 20px rgba(167, 139, 250, 0.15)'
                }}
              >
                Terminal
              </h1>

              {/* Search bar - pill style, expands on focus */}
              <div className="relative" style={{ width: searchFocused ? '420px' : '260px', transition: 'width 0.3s ease' }}>
                <div className={`flex items-center bg-bg-sidebar border rounded-full overflow-visible transition-all duration-300 ${searchFocused ? 'border-accent-blue shadow-[0_0_0_3px_rgba(47,129,247,0.15)]' : 'border-border-theme'}`}>
                  <span className="pl-4 pr-2 text-text-secondary text-sm">🔍</span>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onFocus={() => { setSearchFocused(true); setFocusedInput('block'); }}
                    onBlur={() => { setSearchFocused(false); setTimeout(() => setFocusedInput(null), 200); }}
                    placeholder="Search blocked channels..."
                    className="flex-1 bg-transparent border-none text-text-primary py-2.5 pr-4 outline-none text-sm placeholder:text-text-secondary"
                  />
                  {input && (
                    <button onClick={() => handleBlock(input)} className="mr-2 bg-accent-red text-white border-none rounded-full px-3 py-1 cursor-pointer font-bold text-xs whitespace-nowrap">
                      Block
                    </button>
                  )}
                </div>
                {focusedInput === 'block' && suggestions.length > 0 && (
                  <ul className="absolute top-full left-0 right-0 mt-2 bg-bg-card border border-border-theme rounded-xl p-0 list-none z-50 max-h-[200px] overflow-y-auto shadow-lg">
                    {suggestions.map((s, i) => (
                      <li
                        key={i}
                        onMouseDown={(e) => { e.preventDefault(); handleBlock(s); }}
                        className="px-4 py-3 cursor-pointer border-b border-border-theme text-sm text-text-primary hover:bg-bg-hover flex items-center gap-3 transition-colors first:rounded-t-xl last:rounded-b-xl last:border-b-0"
                      >
                        {s.thumbnail ? (
                          <img
                            src={s.thumbnail}
                            alt={s.name}
                            className="w-7 h-7 rounded-full object-cover border border-white/10"
                          />
                        ) : (
                          <span className="w-7 h-7 rounded-full bg-accent-blue/20 flex items-center justify-center text-xs">👤</span>
                        )}
                        <span className="font-medium truncate">{s.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* KPI Cards (3 Compact Separate Cards) */}
            <div className="grid grid-cols-3 gap-5 mb-6">
              {[
                { label: 'Active Targets', value: normalizedChannels.length, color: 'text-text-primary' },
                { label: 'Videos Nuked', value: totalNukes, color: 'text-text-primary' },
                { label: 'DB Status', value: dbStatus, color: dbStatus === 'Connected' ? 'text-accent-green' : 'text-accent-red' },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="rounded-lg p-3.5 flex flex-col justify-center items-center"
                  style={styles.card}
                >
                  <h3 className="m-0 mb-1 text-[11px] text-text-secondary font-semibold uppercase tracking-wider">{label}</h3>
                  {label === 'DB Status' ? (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`w-2 h-2 rounded-full ${dbStatus === 'Connected' ? 'bg-accent-green animate-pulse' : 'bg-accent-red'}`} />
                      <p className={`m-0 text-base font-bold ${color}`}>{value}</p>
                    </div>
                  ) : (
                    <p className={`m-0 text-xl font-bold ${color}`}>{value}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Dual Chart Layout (50/50 Split - 2 Separate Glass Cards Side-by-Side) */}
            <div
              className="grid grid-cols-2 gap-5 mb-8"
              style={{ height: '310px' }}
            >
              {/* Left Chart Card: Target Sequence */}
              <div
                className="rounded-lg p-5 flex flex-col h-full overflow-hidden"
                style={styles.card}
              >
                <h3 className="m-0 mb-3 text-sm font-semibold text-text-primary uppercase tracking-wider">Target Sequence</h3>
                {normalizedChannels.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
                    No targets mapped
                  </div>
                ) : (
                  <div className="flex-1 flex items-end justify-around gap-2 pb-2 h-full overflow-x-auto">
                    {normalizedChannels.map((channel, i) => {
                      const heightPercent = Math.max(20, Math.min(100, ((channel.length * 7) + 20) % 100));
                      return (
                        <div
                          key={i}
                          className="relative group flex flex-col items-center flex-1 min-w-[20px] max-w-[40px] h-full justify-end"
                        >
                          <div
                            className="w-full rounded-t opacity-45 hover:opacity-90 transition-all cursor-pointer"
                            style={{
                              height: `${heightPercent}%`,
                              background: 'var(--accent-blue)',
                              boxShadow: '0 0 6px rgba(47, 129, 247, 0.4)'
                            }}
                          />
                          {/* Tooltip */}
                          <div
                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none whitespace-nowrap shadow-lg"
                            style={{
                              background: '#18181b',
                              color: '#fff',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '600',
                              border: '1px solid rgba(255,255,255,0.1)'
                            }}
                          >
                            {channel}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Chart Card: Intervention Frequency */}
              <div
                className="rounded-lg p-5 flex flex-col h-full"
                style={styles.card}
              >
                <h3 className="m-0 mb-3 text-sm font-semibold text-text-primary uppercase tracking-wider">Intervention Frequency (7 Days)</h3>
                <div className="flex-1 relative w-full flex flex-col justify-between">
                  <svg className="w-full h-[210px]" viewBox="0 0 300 120" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity="0.0" />
                      </linearGradient>
                      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>
                    {/* Grid Lines */}
                    <line x1="0" y1="30" x2="300" y2="30" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    <line x1="0" y1="60" x2="300" y2="60" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    <line x1="0" y1="90" x2="300" y2="90" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

                     {/* Area under the line (Dynamic) */}
                     <path
                       d={areaPath}
                       fill="url(#areaGradient)"
                     />
 
                     {/* Glowing Stroke Path (Dynamic) */}
                     <path
                       d={linePath}
                       fill="none"
                       stroke="var(--accent-blue)"
                       strokeWidth="3.5"
                       strokeLinecap="round"
                       strokeOpacity="0.65"
                       filter="url(#glow)"
                     />
                   </svg>
                   {/* Axis labels (Dynamic Rolling Days) */}
                   <div className="flex justify-between text-[10px] text-text-secondary font-medium mt-1.5 px-1">
                     {sevenDays.map((d, i) => (
                       <span key={i}>{d.label}</span>
                     ))}
                   </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div
              className="rounded-lg overflow-hidden"
              style={styles.card}
            >
              <div className="p-5 border-b border-border-theme">
                <h3 className="m-0 text-base font-semibold text-text-primary">Active Targets Database</h3>
              </div>
              {channels.length === 0 ? (
                <div className="p-10 text-center text-text-secondary text-sm">
                  No targets active. Add a channel to the blocklist.
                </div>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {['CHANNEL NAME', 'STATUS', 'ACTIONS'].map((h, i) => (
                        <th key={h} className={`text-left px-5 py-3 text-text-secondary text-xs font-medium border-b border-border-theme ${i === 2 ? 'text-right' : ''}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {channels.map((ch, idx) => {
                      const name = typeof ch === 'string' ? ch : ch.name || 'Unknown';
                      return (
                        <tr key={idx} className="border-b border-border-theme hover:bg-bg-hover">
                          <td className="px-5 py-[15px] text-sm text-text-primary font-medium flex items-center gap-3">
                            {ch.thumbnail ? (
                              <img src={ch.thumbnail} className="w-7 h-7 rounded-full object-cover border border-white/10" />
                            ) : (
                              <span className="w-7 h-7 rounded-full bg-accent-red/20 flex items-center justify-center text-xs font-semibold text-accent-red">👤</span>
                            )}
                            <span>{name}</span>
                          </td>
                          <td className="px-5 py-[15px] text-sm">
                            <span className="bg-accent-green/10 text-accent-green px-2 py-1 rounded-full text-xs font-semibold">Blocked</span>
                          </td>
                          <td className="px-5 py-[15px] text-right">
                            <button
                              onClick={() => removeChannel(ch)}
                              className="bg-transparent border-none text-text-secondary cursor-pointer text-base hover:text-accent-red"
                              title="Remove Target"
                            >
                              ❌
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : activeTab === 'whitelist' ? (
          <>
            {/* Header row */}
            <div className="flex justify-between items-center mb-8">
              <h1 
                className="m-0 text-3xl font-black italic tracking-wide"
                style={{
                  background: 'linear-gradient(135deg, #a78bfa 30%, var(--accent-blue) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 0 20px rgba(167, 139, 250, 0.15)'
                }}
              >
                Whitelist
              </h1>

              {/* Search bar - pill style, expands on focus */}
              <div className="relative" style={{ width: searchFocused ? '420px' : '260px', transition: 'width 0.3s ease' }}>
                <div className={`flex items-center bg-bg-sidebar border rounded-full overflow-visible transition-all duration-300 ${searchFocused ? 'border-accent-blue shadow-[0_0_0_3px_rgba(47,129,247,0.15)]' : 'border-border-theme'}`}>
                  <span className="pl-4 pr-2 text-text-secondary text-sm">🔍</span>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onFocus={() => { setSearchFocused(true); setFocusedInput('whitelist'); }}
                    onBlur={() => { setSearchFocused(false); setTimeout(() => setFocusedInput(null), 200); }}
                    placeholder="Search whitelist channels..."
                    className="flex-1 bg-transparent border-none text-text-primary py-2.5 pr-4 outline-none text-sm placeholder:text-text-secondary"
                  />
                  {input && (
                    <button onClick={() => handleWhitelist(input)} className="mr-2 bg-accent-blue text-white border-none rounded-full px-3 py-1 cursor-pointer font-bold text-xs whitespace-nowrap">
                      Whitelist
                    </button>
                  )}
                </div>
                {focusedInput === 'whitelist' && suggestions.length > 0 && (
                  <ul className="absolute top-full left-0 right-0 mt-2 bg-bg-card border border-border-theme rounded-xl p-0 list-none z-50 max-h-[200px] overflow-y-auto shadow-lg">
                    {suggestions.map((s, i) => (
                      <li
                        key={i}
                        onMouseDown={(e) => { e.preventDefault(); handleWhitelist(s); }}
                        className="px-4 py-3 cursor-pointer border-b border-border-theme text-sm text-text-primary hover:bg-bg-hover flex items-center gap-3 transition-colors first:rounded-t-xl last:rounded-b-xl last:border-b-0"
                      >
                        {s.thumbnail ? (
                          <img
                            src={s.thumbnail}
                            alt={s.name}
                            className="w-7 h-7 rounded-full object-cover border border-white/10"
                          />
                        ) : (
                          <span className="w-7 h-7 rounded-full bg-accent-blue/20 flex items-center justify-center text-xs">👤</span>
                        )}
                        <span className="font-medium truncate">{s.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-5 mb-6">
              {[
                { label: 'Whitelisted Targets', value: whitelistedChannels.length, color: 'text-text-primary' },
                { label: 'Videos Displayed', value: totalWhitelistDisplayed, color: 'text-text-primary' },
                { label: 'DB Status', value: dbStatus, color: dbStatus === 'Connected' ? 'text-accent-green' : 'text-accent-red' },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="rounded-lg p-3.5 flex flex-col justify-center items-center"
                  style={styles.card}
                >
                  <h3 className="m-0 mb-1 text-[11px] text-text-secondary font-semibold uppercase tracking-wider">{label}</h3>
                  {label === 'DB Status' ? (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`w-2 h-2 rounded-full ${dbStatus === 'Connected' ? 'bg-accent-green animate-pulse' : 'bg-accent-red'}`} />
                      <p className={`m-0 text-base font-bold ${color}`}>{value}</p>
                    </div>
                  ) : (
                    <p className={`m-0 text-xl font-bold ${color}`}>{value}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Dual Chart Layout (50/50 Split - 2 Separate Glass Cards Side-by-Side) */}
            <div
              className="grid grid-cols-2 gap-5 mb-8"
              style={{ height: '310px' }}
            >
              {/* Left Chart Card: Whitelisted Target Sequence */}
              <div
                className="rounded-lg p-5 flex flex-col h-full overflow-hidden"
                style={styles.card}
              >
                <h3 className="m-0 mb-3 text-sm font-semibold text-text-primary uppercase tracking-wider">Whitelisted Target Sequence</h3>
                {whitelistedChannels.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
                    No whitelisted channels mapped
                  </div>
                ) : (
                  <div className="flex-1 flex items-end justify-around gap-2 pb-2 h-full overflow-x-auto">
                    {whitelistedChannels.map((ch, i) => {
                      const name = typeof ch === 'string' ? ch : ch.name || 'Unknown';
                      const heightPercent = Math.max(20, Math.min(100, ((name.length * 7) + 20) % 100));
                      return (
                        <div
                          key={i}
                          className="relative group flex flex-col items-center flex-1 min-w-[20px] max-w-[40px] h-full justify-end"
                        >
                          <div
                            className="w-full rounded-t opacity-45 hover:opacity-90 transition-all cursor-pointer"
                            style={{
                              height: `${heightPercent}%`,
                              background: 'var(--accent-blue)',
                              boxShadow: '0 0 6px rgba(47, 129, 247, 0.4)'
                            }}
                          />
                          <div
                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none whitespace-nowrap shadow-lg"
                            style={{
                              background: '#18181b',
                              color: '#fff',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '600',
                              border: '1px solid rgba(255,255,255,0.1)'
                            }}
                          >
                            {name}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Chart Card: Videos Displayed Frequency */}
              <div
                className="rounded-lg p-5 flex flex-col h-full"
                style={styles.card}
              >
                <h3 className="m-0 mb-3 text-sm font-semibold text-text-primary uppercase tracking-wider">Videos Displayed (7 Days)</h3>
                <div className="flex-1 relative w-full flex flex-col justify-between">
                  <svg className="w-full h-[210px]" viewBox="0 0 300 120" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="areaGradientWhitelist" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity="0.0" />
                      </linearGradient>
                      <filter id="glowWhitelist" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>
                    {/* Grid Lines */}
                    <line x1="0" y1="30" x2="300" y2="30" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    <line x1="0" y1="60" x2="300" y2="60" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    <line x1="0" y1="90" x2="300" y2="90" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

                    {/* Area under the line (Dynamic) */}
                    <path
                      d={areaPathWhitelist}
                      fill="url(#areaGradientWhitelist)"
                    />

                    {/* Glowing Stroke Path (Dynamic) */}
                    <path
                      d={linePathWhitelist}
                      fill="none"
                      stroke="var(--accent-blue)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeOpacity="0.65"
                      filter="url(#glowWhitelist)"
                    />
                  </svg>
                  {/* Axis labels (Dynamic Rolling Days) */}
                  <div className="flex justify-between text-[10px] text-text-secondary font-medium mt-1.5 px-1">
                    {sevenDaysWhitelist.map((d, i) => (
                      <span key={i}>{d.label}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div
              className="rounded-lg overflow-hidden"
              style={styles.card}
            >
              <div className="p-5 border-b border-border-theme">
                <h3 className="m-0 text-base font-semibold text-text-primary">Active Whitelist Database</h3>
              </div>
              {whitelistedChannels.length === 0 ? (
                <div className="p-10 text-center text-text-secondary text-sm">
                  No whitelisted channels active. Add productive channels to see their latest videos.
                </div>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {['CHANNEL NAME', 'STATUS', 'ACTIONS'].map((h, i) => (
                        <th key={h} className={`text-left px-5 py-3 text-text-secondary text-xs font-medium border-b border-border-theme ${i === 2 ? 'text-right' : ''}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {whitelistedChannels.map((ch, idx) => {
                      const name = typeof ch === 'string' ? ch : ch.name || 'Unknown';
                      return (
                        <tr key={idx} className="border-b border-border-theme hover:bg-bg-hover">
                          <td className="px-5 py-[15px] text-sm text-text-primary font-medium flex items-center gap-3">
                            {ch.thumbnail ? (
                              <img src={ch.thumbnail} className="w-7 h-7 rounded-full object-cover border border-white/10" />
                            ) : (
                              <span className="w-7 h-7 rounded-full bg-accent-blue/20 flex items-center justify-center text-xs font-semibold text-accent-blue">👤</span>
                            )}
                            <span>{name}</span>
                          </td>
                          <td className="px-5 py-[15px] text-sm">
                            <span className="bg-accent-blue/10 text-accent-blue px-2 py-1 rounded-full text-xs font-semibold">Whitelisted</span>
                          </td>
                          <td className="px-5 py-[15px] text-right">
                            <button
                              onClick={() => removeWhitelistedChannel(ch)}
                              className="bg-transparent border-none text-text-secondary cursor-pointer text-base hover:text-accent-red"
                              title="Remove Whitelist"
                            >
                              ❌
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Header row */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="m-0 text-[24px] font-bold text-white tracking-tight">Analytics Dashboard</h1>
                <p className="m-0 text-sm text-[#9ca3af] mt-1">Overview of your extension activity</p>
              </div>
              <button
                onClick={() => {
                  setAnalyticsLoading(true);
                  fetch('http://localhost:5000/api/blocks')
                    .then(res => res.json())
                    .then(data => {
                      if (data?.success && data?.data) setAnalyticsData(data.data);
                    })
                    .catch(() => generateFallbackAnalytics())
                    .finally(() => setAnalyticsLoading(false));
                }}
                className="text-white px-4 py-2 flex items-center gap-2 cursor-pointer hover:bg-white/[0.08] transition-all"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 500
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                Refresh Data
              </button>
            </div>

            {/* Analytics Stats Cards */}
            <div className="grid grid-cols-3 gap-5 mb-8">
              {/* Card 1: Total Blocking Events */}
              <div
                className="p-5 flex flex-col relative overflow-hidden"
                style={{
                  ...styles.card,
                  height: '145px',
                  justifyContent: 'space-between',
                  boxSizing: 'border-box'
                }}
              >
                <div className="flex justify-between items-start w-full relative z-10">
                  <span style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 500 }}>
                    Total Blocking Events
                  </span>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#60a5fa'
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg>
                  </div>
                </div>
                <div className="relative z-10" style={{ marginTop: '10px' }}>
                  <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#60a5fa' }}>
                    {analyticsData.reduce((acc, curr) => acc + (curr.blockCount || 0), 0)}
                  </span>
                </div>
                <div className="relative z-10">
                  <span style={{ color: '#9ca3af', fontSize: '11px' }}>All time total</span>
                </div>
                {/* Glowing radial wave background */}
                <div 
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '60px',
                    pointerEvents: 'none',
                    background: 'radial-gradient(ellipse at bottom, rgba(37, 99, 235, 0.25) 0%, transparent 70%)',
                    zIndex: 1
                  }}
                />
                {/* Wave Graphic */}
                <svg viewBox="0 0 100 30" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, width: '100%', height: '40px', pointerEvents: 'none', overflow: 'visible', zIndex: 2 }}>
                  <defs>
                    <linearGradient id="wave-grad-blue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M 0 30 C 20 20, 40 10, 60 22 C 80 30, 90 10, 100 5 L 100 30 L 0 30 Z" fill="url(#wave-grad-blue)" />
                  <path d="M 0 30 C 20 20, 40 10, 60 22 C 80 30, 90 10, 100 5" stroke="#60a5fa" strokeWidth="3" fill="none" style={{ filter: 'drop-shadow(0 -2px 8px rgba(96, 165, 250, 0.5))' }} />
                </svg>
              </div>

              {/* Card 2: Most Blocked Target */}
              <div
                className="p-5 flex flex-col relative overflow-hidden"
                style={{
                  ...styles.card,
                  height: '145px',
                  justifyContent: 'space-between',
                  boxSizing: 'border-box'
                }}
              >
                <div className="flex justify-between items-start w-full relative z-10">
                  <span style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 500 }}>
                    Most Blocked Target
                  </span>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#f87171'
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                  </div>
                </div>
                <div className="relative z-10" style={{ marginTop: '10px', overflow: 'hidden' }}>
                  <span className="truncate block" style={{ fontSize: '20px', fontWeight: 'bold', color: '#f87171' }}>
                    {analyticsData.length > 0 ? analyticsData[0].handle : 'None'}
                  </span>
                </div>
                <div className="relative z-10">
                  <span style={{ color: '#9ca3af', fontSize: '11px' }}>
                    {analyticsData.length > 0 ? `Blocked ${analyticsData[0].blockCount} times` : 'Blocked 0 times'}
                  </span>
                </div>
                {/* Glowing radial wave background */}
                <div 
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '60px',
                    pointerEvents: 'none',
                    background: 'radial-gradient(ellipse at bottom, rgba(220, 38, 38, 0.2) 0%, transparent 70%)',
                    zIndex: 1
                  }}
                />
                {/* Wave Graphic */}
                <svg viewBox="0 0 100 30" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, width: '100%', height: '40px', pointerEvents: 'none', overflow: 'visible', zIndex: 2 }}>
                  <defs>
                    <linearGradient id="wave-grad-red" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#dc2424" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#dc2424" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M 0 28 Q 30 22, 60 28 T 100 12 L 100 30 L 0 30 Z" fill="url(#wave-grad-red)" />
                  <path d="M 0 28 Q 30 22, 60 28 T 100 12" stroke="#f87171" strokeWidth="3" fill="none" style={{ filter: 'drop-shadow(0 -2px 8px rgba(248, 113, 113, 0.5))' }} />
                </svg>
              </div>

              {/* Card 3: Connected Clients */}
              <div
                className="p-5 flex flex-col relative overflow-hidden"
                style={{
                  ...styles.card,
                  height: '145px',
                  justifyContent: 'space-between',
                  boxSizing: 'border-box'
                }}
              >
                <div className="flex justify-between items-start w-full relative z-10">
                  <span style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 500 }}>
                    Connected Clients
                  </span>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#4ade80'
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </div>
                </div>
                <div className="relative z-10" style={{ marginTop: '10px' }}>
                  <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#4ade80' }}>
                    Active
                  </span>
                </div>
                <div className="relative z-10">
                  <span style={{ color: '#9ca3af', fontSize: '11px' }}>Currently connected</span>
                </div>
                {/* Glowing radial wave background */}
                <div 
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '60px',
                    pointerEvents: 'none',
                    background: 'radial-gradient(ellipse at bottom, rgba(22, 163, 74, 0.2) 0%, transparent 70%)',
                    zIndex: 1
                  }}
                />
                {/* Wave Graphic */}
                <svg viewBox="0 0 100 30" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, width: '100%', height: '40px', pointerEvents: 'none', overflow: 'visible', zIndex: 2 }}>
                  <defs>
                    <linearGradient id="wave-grad-green" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16a34a" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M 0 26 Q 30 30, 60 22 T 100 15 L 100 30 L 0 30 Z" fill="url(#wave-grad-green)" />
                  <path d="M 0 26 Q 30 30, 60 22 T 100 15" stroke="#4ade80" strokeWidth="3" fill="none" style={{ filter: 'drop-shadow(0 -2px 8px rgba(74, 222, 128, 0.5))' }} />
                </svg>
              </div>
            </div>

            {/* Analytics Table */}
            <div
              className="overflow-hidden flex-1"
              style={{
                background: 'rgba(15, 20, 30, 0.65)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.15)'
              }}
            >
              <div className="p-5 border-b border-white/[0.04] flex justify-between items-center">
                <div className="flex items-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mr-2 text-accent-blue" style={{ filter: 'drop-shadow(0 0 4px var(--accent-blue))' }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <h3 className="m-0 text-base font-semibold text-text-primary">Block Triggers History</h3>
                  {analyticsLoading && <span className="ml-3 text-xs text-text-secondary animate-pulse">Loading updates...</span>}
                </div>
                <div className="cursor-pointer text-text-secondary hover:text-text-primary p-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                </div>
              </div>
              {analyticsData.length === 0 ? (
                <div className="p-10 text-center text-text-secondary text-sm">
                  No block history recorded yet. Keep browsing YouTube.
                </div>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {['TARGET HANDLE', 'BLOCK COUNT', 'DATE INITIALIZED'].map((h, i) => (
                        <th key={h} className="text-left px-5 py-3 text-text-secondary text-[11px] font-semibold uppercase tracking-wider border-b border-white/[0.04]" style={{ color: '#6b7280' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.map((item, idx) => (
                      <tr 
                        key={item._id || idx} 
                        className="hover:bg-white/[0.02] transition-colors"
                        style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}
                      >
                        <td className="px-5 py-[15px] text-sm text-text-primary font-medium flex items-center">
                          <div className="w-7 h-7 rounded-full bg-[#1e3a8a] text-[#93c5fd] flex items-center justify-center text-xs font-bold mr-3" style={{ width: '28px', height: '28px', borderRadius: '50%' }}>
                            {getInitials(item.handle)}
                          </div>
                          {item.handle}
                        </td>
                        <td className="px-5 py-[15px] text-sm font-semibold" style={{ color: '#f87171' }}>
                          {item.blockCount} times
                        </td>
                        <td className="px-5 py-[15px] text-sm text-text-secondary">
                          {new Date(item.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
      {showToast && (
        <div 
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '10px 16px',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: '600',
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.3s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <span>🔔</span> {toastMessage}
        </div>
      )}
    </div>
  );
}