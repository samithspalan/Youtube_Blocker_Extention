import { useState, useEffect } from 'react';

// Guard: true only when running as a real Chrome extension
const isChromeExtension = typeof chrome !== 'undefined' && !!chrome.storage;

export default function App() {
  const [channels, setChannels] = useState([]);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [dbStatus, setDbStatus] = useState('Connected');
  const [isPopup, setIsPopup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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
    chrome.storage.local.get(['blockedChannels'], (result) => {
      if (result.blockedChannels) setChannels(result.blockedChannels);
    });
  }, []);

  useEffect(() => {
    if (input.trim().length > 1) {
      if (isChromeExtension) {
        chrome.runtime.sendMessage({ action: 'fetchSuggestions', query: input }, (response) => {
          setSuggestions(response?.suggestions ?? []);
        });
      } else {
        setSuggestions([`${input} (mock 1)`, `${input} (mock 2)`]);
      }
    } else {
      setSuggestions([]);
    }
  }, [input]);

  const handleBlock = (targetChannel) => {
    if (!targetChannel.trim()) return;
    const newChannels = [...channels, targetChannel];
    setChannels(newChannels);
    if (isChromeExtension) chrome.storage.local.set({ blockedChannels: newChannels });
    setInput('');
    setSuggestions([]);
  };

  const removeChannel = (channelToRemove) => {
    const newChannels = channels.filter(c => c !== channelToRemove);
    setChannels(newChannels);
    if (isChromeExtension) chrome.storage.local.set({ blockedChannels: newChannels });
  };

  const openDashboard = () => {
    if (isChromeExtension) chrome.tabs.create({ url: chrome.runtime.getURL('react-popup/dist/index.html') });
  };

  const normalizedChannels = channels.map(c => typeof c === 'string' ? c : c.name || 'Unknown');

  // ============================================
  // TOOLBAR POPUP VIEW
  // ============================================
  if (isPopup) {
    return (
      <div className="flex flex-col w-[350px] h-[400px] bg-bg-dark font-sans">
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-[15px] bg-bg-sidebar border-b border-border-theme">
          <h2 className="m-0 text-[15px] font-semibold text-text-primary">🛡️ YT Stealth Blocker</h2>
          <span className="text-xs font-semibold text-text-secondary">🟢 Active</span>
        </div>

        <div className="flex-1 p-5 flex flex-col">
          {/* Search */}
          <div className="relative w-full">
            <div className="flex items-center bg-bg-sidebar border border-border-theme rounded-md overflow-hidden">
              <span className="px-2.5 text-text-secondary">🔍</span>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Target channel to block..."
                className="flex-1 bg-transparent border-none text-text-primary py-2.5 outline-none text-[13px]"
              />
              <button
                onClick={() => handleBlock(input)}
                className="bg-accent-red text-white border-none px-4 py-2 cursor-pointer font-bold text-[13px]"
              >
                Block
              </button>
            </div>
            {suggestions.length > 0 && (
              <ul className="absolute top-full left-0 right-0 mt-1 bg-bg-card border border-border-theme rounded-md p-0 m-0 list-none z-10 max-h-[200px] overflow-y-auto shadow-lg">
                {suggestions.map((s, i) => (
                  <li key={i} onClick={() => handleBlock(s)} className="p-3 cursor-pointer border-b border-border-theme text-[14px] text-text-primary hover:bg-bg-hover">
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Stats Badge */}
          <div className="flex justify-center my-8">
            <span className="bg-bg-sidebar px-4 py-2 rounded-full text-[13px] font-semibold border border-border-theme text-accent-blue">
              {normalizedChannels.length} Targets Active
            </span>
          </div>

          {/* Open Dashboard */}
          <button onClick={openDashboard} className="mt-auto w-full py-3 bg-accent-blue text-white border-none rounded-md cursor-pointer font-semibold text-sm hover:opacity-90 transition-opacity">
            🚀 Open Full Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // FULL-SCREEN DASHBOARD VIEW
  // ============================================
  return (
    <div
      className="flex w-screen h-screen min-w-[800px] font-sans"
      style={{ background: 'radial-gradient(circle at 5% 20%, rgba(47,129,247,0.15), transparent 40%), radial-gradient(circle at 95% 80%, rgba(46,160,67,0.15), transparent 40%), var(--bg-dark)' }}
    >
      {/* ---- SIDEBAR ---- */}
      <div
        className="flex flex-col w-[240px] m-4 rounded-2xl py-5 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
        style={{ backdropFilter: 'blur(20px)', background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)' }}
      >
        {/* Logo */}
        <div className="flex items-center px-5 pb-5 border-b border-border-theme">
          <span className="text-2xl mr-2.5">🛡️</span>
          <h2 className="m-0 text-base font-semibold text-text-primary">YT Stealth</h2>
        </div>

        {/* Nav */}
        <nav className="flex flex-col flex-1 overflow-y-auto py-5">
          {/* MAIN section */}
          <div className="mb-5">
            <p className="text-[11px] font-bold text-text-secondary px-5 mb-2.5 tracking-widest">MAIN</p>
            <a className="flex items-center px-5 py-2.5 text-sm text-text-primary bg-bg-hover border-l-[3px] border-accent-blue cursor-pointer no-underline">
              <span className="mr-3">⌘</span> Command Center
            </a>
            <a className="flex items-center px-5 py-2.5 text-sm text-text-secondary cursor-pointer no-underline hover:bg-bg-hover">
              <span className="mr-3">📊</span> Analytics
            </a>
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
          </div>
        </nav>
      </div>

      {/* ---- MAIN CONTENT ---- */}
      <div className="flex-1 flex flex-col overflow-y-auto py-[30px] px-10">
        {/* Header row */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="m-0 text-2xl font-semibold text-text-primary">Command Center</h1>

          {/* Search bar */}
          <div className="relative w-full max-w-[350px]">
            <div className="flex items-center bg-bg-sidebar border border-border-theme rounded-md overflow-hidden">
              <span className="px-2.5 text-text-secondary">🔍</span>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Search channel to block..."
                className="flex-1 bg-transparent border-none text-text-primary py-2.5 outline-none text-sm"
              />
              <button onClick={() => handleBlock(input)} className="bg-accent-red text-white border-none px-4 py-2 cursor-pointer font-bold text-[13px]">
                Block Target
              </button>
            </div>
            {suggestions.length > 0 && (
              <ul className="absolute top-full left-0 right-0 mt-1 bg-bg-card border border-border-theme rounded-md p-0 list-none z-10 max-h-[200px] overflow-y-auto shadow-lg">
                {suggestions.map((s, i) => (
                  <li key={i} onClick={() => handleBlock(s)} className="p-3 cursor-pointer border-b border-border-theme text-sm text-text-primary hover:bg-bg-hover">
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-5 mb-8">
          {[
            { label: 'Active Targets', value: normalizedChannels.length, color: 'text-text-primary' },
            { label: 'Videos Nuked', value: 0, color: 'text-text-primary' },
            { label: 'DB Status', value: dbStatus, color: dbStatus === 'Connected' ? 'text-accent-green' : 'text-accent-red' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-bg-card border border-border-theme rounded-lg p-5 flex flex-col justify-center">
              <h3 className="m-0 mb-2.5 text-[13px] text-text-secondary font-medium">{label}</h3>
              <p className={`m-0 text-[28px] font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Chart Placeholder */}
        <div className="bg-bg-card border border-border-theme rounded-lg p-5 mb-8 h-[250px] flex flex-col">
          <div className="flex justify-between mb-5">
            <h3 className="m-0 text-base font-semibold text-text-primary">Distractions Blocked Over Time</h3>
            <span className="text-text-secondary cursor-pointer">...</span>
          </div>
          <div className="flex-1 flex items-end justify-center gap-2.5 pb-2">
            {[12, 18, 5, 22, 14, 30, 8].map((h, i) => (
              <div
                key={i}
                className="w-8 bg-accent-blue rounded-t opacity-60"
                style={{ height: `${h * 4}px` }}
              />
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-bg-card border border-border-theme rounded-lg overflow-hidden">
          <div className="p-5 border-b border-border-theme">
            <h3 className="m-0 text-base font-semibold text-text-primary">Active Targets Database</h3>
          </div>
          {normalizedChannels.length === 0 ? (
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
                {normalizedChannels.map((channel, idx) => (
                  <tr key={idx} className="border-b border-border-theme hover:bg-bg-hover">
                    <td className="px-5 py-[15px] text-sm text-text-primary font-medium">{channel}</td>
                    <td className="px-5 py-[15px] text-sm">
                      <span className="bg-accent-green/10 text-accent-green px-2 py-1 rounded-full text-xs font-semibold">Blocked</span>
                    </td>
                    <td className="px-5 py-[15px] text-right">
                      <button
                        onClick={() => removeChannel(channel)}
                        className="bg-transparent border-none text-text-secondary cursor-pointer text-base hover:text-accent-red"
                        title="Remove Target"
                      >
                        ❌
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}