import { useState, useEffect } from 'react';

export default function App() {
  const [channels, setChannels] = useState([]);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [dbStatus, setDbStatus] = useState('Connected');
  const [isPopup, setIsPopup] = useState(false);

  useEffect(() => {
    // Determine if we are in the small toolbar popup
    const checkIsPopup = () => {
      // Chrome extension popups are usually narrow. We use < 600 as the breakpoint.
      setIsPopup(window.innerWidth < 600);
    };
    
    checkIsPopup();
    
    window.addEventListener('resize', checkIsPopup);
    return () => window.removeEventListener('resize', checkIsPopup);
  }, []);

  // 1. Load the initial blocked list
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['blockedChannels'], (result) => {
        if (result.blockedChannels) {
          setChannels(result.blockedChannels);
        }
      });
    }
  }, []);

  // 2. The Autocomplete Engine (via background service worker)
  useEffect(() => {
    const fetchSuggestions = () => {
      if (input.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage(
          { action: 'fetchSuggestions', query: input },
          (response) => {
            if (chrome.runtime.lastError) {
                console.error("Chrome runtime error:", chrome.runtime.lastError);
                return;
            }
            if (response && response.success && response.data) {
              // Google suggestions are in index 1 of the returned JSON array
              setSuggestions(response.data[1] || []);
            } else {
              console.error("Failed to fetch suggestions from background.");
            }
          }
        );
      }
    };

    // Debounce: Wait 300ms after the user stops typing
    const delayDebounce = setTimeout(() => {
      fetchSuggestions();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [input]);

  // 3. Handle the Block action
  const handleBlock = async (channelName) => {
    const target = channelName.trim().toLowerCase(); 
    
    if (!target) return;
    
    // Support legacy strings array and new object array
    const isDuplicate = channels.some(c => {
      if (typeof c === 'string') return c.toLowerCase() === target;
      return c.name.toLowerCase() === target;
    });

    if (isDuplicate) return;

    const newEntry = { name: target, dateAdded: new Date().toLocaleDateString() };
    const updatedList = [...channels, newEntry];
    saveToStorage(updatedList);
    
    setInput('');
    setSuggestions([]); // Close dropdown

    // Sync with MongoDB backend (fails gracefully if offline)
    try {
      await fetch('http://localhost:5000/api/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: target })
      });
      setDbStatus('Connected');
    } catch (error) {
      console.log("Backend offline, saving locally only.");
      setDbStatus('Offline');
    }
  };

  // 4. Handle the Remove action
  const handleRemove = (targetToRemove) => {
    const updatedList = channels.filter(ch => {
      if (typeof ch === 'string') return ch !== targetToRemove;
      return ch.name !== targetToRemove;
    });
    saveToStorage(updatedList);
  };

  // Helper to save state and Chrome storage simultaneously
  const saveToStorage = (updatedList) => {
    setChannels(updatedList);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ blockedChannels: updatedList });
    }
  };

  const openDashboard = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
      // Only close if it's actually in a popup window context
      if (typeof window !== 'undefined' && window.close) {
        window.close();
      }
    } else {
      window.open('/index.html');
    }
  };

  // Map legacy string entries to objects for display
  const normalizedChannels = channels.map(ch => typeof ch === 'string' ? { name: ch, dateAdded: 'Legacy' } : ch);

  if (isPopup) {
    return (
      <div style={styles.popupContainer}>
        {/* Header */}
        <div style={styles.popupHeader}>
          <h2 style={styles.popupTitle}>🛡️ YT Stealth Blocker</h2>
          <span style={styles.popupStatus}>🟢 Active</span>
        </div>

        {/* Content */}
        <div style={styles.popupContent}>
          {/* Quick Action: Search Bar */}
          <div style={styles.searchWrapper}>
            <div style={styles.searchContainer}>
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Search channel..."
                style={styles.popupSearchInput}
              />
              <button 
                onClick={() => handleBlock(input)}
                style={styles.blockButton}
              >
                Block
              </button>
            </div>

            {/* Suggestions Dropdown */}
            {suggestions.length > 0 && (
              <ul style={styles.dropdown}>
                {suggestions.map((suggestion, idx) => (
                  <li 
                    key={idx} 
                    onClick={() => handleBlock(suggestion)}
                    style={styles.dropdownItem}
                    onMouseOver={(e) => e.target.style.background = 'var(--bg-hover)'}
                    onMouseOut={(e) => e.target.style.background = 'transparent'}
                  >
                    {suggestion}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Quick Stats */}
          <div style={styles.popupStats}>
            <span style={styles.popupStatBadge}>{normalizedChannels.length} Targets Active</span>
          </div>

          {/* Footer Button */}
          <button onClick={openDashboard} style={styles.popupFooterBtn}>
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
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.logoContainer}>
          <div style={styles.logoIcon}>🛡️</div>
          <h2 style={styles.logoTitle}>YT Stealth</h2>
        </div>
        <nav style={styles.nav}>
          <div style={styles.navSection}>
            <p style={styles.navSectionTitle}>MAIN</p>
            <a style={{...styles.navItem, ...styles.navItemActive}}>
              <span style={styles.navIcon}>⌘</span> Command Center
            </a>
            <a style={styles.navItem}>
              <span style={styles.navIcon}>📊</span> Analytics
            </a>
          </div>
          <div style={styles.navSectionBottom}>
            <p style={styles.navSectionTitle}>SYSTEM</p>
            <a style={styles.navItem}>
              <span style={styles.navIcon}>⚙️</span> Settings
            </a>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        <div style={styles.header}>
          <h1 style={styles.pageTitle}>Command Center</h1>
          
          {/* Search Bar Wrapper */}
          <div style={styles.searchWrapper}>
            <div style={styles.searchContainer}>
              <span style={styles.searchIcon}>🔍</span>
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Search channel to block..."
                style={styles.searchInput}
              />
              <button 
                onClick={() => handleBlock(input)}
                style={styles.blockButton}
              >
                Block Target
              </button>
            </div>

            {/* Suggestions Dropdown */}
            {suggestions.length > 0 && (
              <ul style={styles.dropdown}>
                {suggestions.map((suggestion, idx) => (
                  <li 
                    key={idx} 
                    onClick={() => handleBlock(suggestion)}
                    style={styles.dropdownItem}
                    onMouseOver={(e) => e.target.style.background = 'var(--bg-hover)'}
                    onMouseOut={(e) => e.target.style.background = 'transparent'}
                  >
                    {suggestion}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div style={styles.kpiContainer}>
          <div style={styles.kpiCard}>
            <h3 style={styles.kpiTitle}>Active Targets</h3>
            <p style={styles.kpiValue}>{normalizedChannels.length}</p>
          </div>
          <div style={styles.kpiCard}>
            <h3 style={styles.kpiTitle}>Videos Nuked</h3>
            <p style={styles.kpiValue}>0</p>
          </div>
          <div style={styles.kpiCard}>
            <h3 style={styles.kpiTitle}>DB Status</h3>
            <p style={{...styles.kpiValue, color: dbStatus === 'Connected' ? 'var(--accent-green)' : 'var(--accent-red)'}}>{dbStatus}</p>
          </div>
        </div>

        {/* Chart Placeholder */}
        <div style={styles.chartContainer}>
          <div style={styles.chartHeader}>
            <h3 style={styles.chartTitle}>Distractions Blocked Over Time</h3>
            <div style={styles.chartOptions}>...</div>
          </div>
          <div style={styles.chartBody}>
             <svg width="100%" height="100%" viewBox="0 0 100 30" preserveAspectRatio="none">
               <path d="M0,25 Q10,20 20,25 T40,15 T60,20 T80,10 T100,5" fill="none" stroke="var(--accent-blue)" strokeWidth="1.5" />
               <path d="M0,28 Q15,22 30,26 T50,18 T70,22 T90,14 T100,10" fill="none" stroke="var(--accent-green)" strokeWidth="1" opacity="0.5" />
             </svg>
          </div>
        </div>

        {/* Data Table */}
        <div style={styles.tableContainer}>
          <div style={styles.tableHeader}>
            <h3 style={styles.tableTitle}>Managed Targets</h3>
          </div>
          {normalizedChannels.length === 0 ? (
            <div style={styles.emptyState}>No targets actively blocked.</div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Channel Name</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Date Added</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {normalizedChannels.map((ch, idx) => (
                  <tr key={idx} style={styles.tr}>
                    <td style={{...styles.td, fontWeight: 'bold'}}>{ch.name}</td>
                    <td style={styles.td}>
                      <span style={styles.badge}>Blocked</span>
                    </td>
                    <td style={styles.td}>{ch.dateAdded}</td>
                    <td style={styles.td}>
                      <button 
                        onClick={() => handleRemove(ch.name)}
                        style={styles.actionBtn}
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

// ============================================
// STYLES
// ============================================
const styles = {
  // POPUP STYLES
  popupContainer: {
    display: 'flex',
    flexDirection: 'column',
    width: '350px',
    height: '400px',
    background: 'var(--bg-dark)',
    fontFamily: 'var(--font-family, Inter, sans-serif)',
  },
  popupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 20px',
    background: 'var(--bg-sidebar)',
    borderBottom: '1px solid var(--border-color)',
  },
  popupTitle: {
    margin: 0,
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  popupStatus: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
  },
  popupContent: {
    flex: 1,
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
  },
  popupSearchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    padding: '10px 15px',
    outline: 'none',
    fontSize: '13px',
  },
  popupStats: {
    display: 'flex',
    justifyContent: 'center',
    margin: '30px 0',
  },
  popupStatBadge: {
    background: 'var(--bg-sidebar)',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
    border: '1px solid var(--border-color)',
    color: 'var(--accent-blue)',
  },
  popupFooterBtn: {
    marginTop: 'auto',
    width: '100%',
    padding: '12px',
    background: 'var(--accent-blue)',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'opacity 0.2s',
  },

  // DASHBOARD STYLES
  container: {
    display: 'flex',
    width: '100vw',
    height: '100vh',
    // Mesh gradient background so the glassmorphism actually has something to blur
    background: 'radial-gradient(circle at 5% 20%, rgba(47, 129, 247, 0.15), transparent 40%), radial-gradient(circle at 95% 80%, rgba(46, 160, 67, 0.15), transparent 40%), var(--bg-dark)',
    fontFamily: 'var(--font-family, Inter, sans-serif)',
    minWidth: '800px',
  },
  sidebar: {
    width: '240px',
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRight: '1px solid rgba(255, 255, 255, 0.05)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '16px',
    margin: '16px',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 0',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 20px 20px',
    borderBottom: '1px solid var(--border-color)',
  },
  logoIcon: {
    fontSize: '24px',
    marginRight: '10px',
  },
  logoTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  nav: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 0',
    display: 'flex',
    flexDirection: 'column',
  },
  navSection: {
    marginBottom: '20px',
  },
  navSectionBottom: {
    marginTop: 'auto',
    marginBottom: '20px',
  },
  navSectionTitle: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: 'var(--text-secondary)',
    padding: '0 20px',
    marginBottom: '10px',
    letterSpacing: '1px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 20px',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '14px',
    textDecoration: 'none',
  },
  navItemActive: {
    color: 'var(--text-primary)',
    background: 'var(--bg-hover)',
    borderLeft: '3px solid var(--accent-blue)',
  },
  navIcon: {
    marginRight: '12px',
    fontSize: '16px',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    padding: '30px 40px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
  },
  pageTitle: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '600',
  },
  searchWrapper: {
    position: 'relative',
    width: '100%',
    maxWidth: '350px',
  },
  searchContainer: {
    display: 'flex',
    alignItems: 'center',
    background: 'var(--bg-sidebar)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  searchIcon: {
    padding: '0 10px',
    color: 'var(--text-secondary)',
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    padding: '10px 0',
    outline: 'none',
    fontSize: '14px',
  },
  blockButton: {
    background: 'var(--accent-red)',
    color: '#fff',
    border: 'none',
    padding: '0 15px',
    height: '100%',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '13px',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '5px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    padding: 0,
    margin: 0,
    listStyleType: 'none',
    zIndex: 10,
    maxHeight: '200px',
    overflowY: 'auto',
    boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
  },
  dropdownItem: {
    padding: '12px 15px',
    cursor: 'pointer',
    borderBottom: '1px solid var(--border-color)',
    fontSize: '14px',
  },
  kpiContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    marginBottom: '30px',
  },
  kpiCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  kpiTitle: {
    margin: '0 0 10px 0',
    fontSize: '13px',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  kpiValue: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 'bold',
  },
  chartContainer: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '30px',
    height: '250px',
    display: 'flex',
    flexDirection: 'column',
  },
  chartHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  chartTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
  },
  chartOptions: {
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  chartBody: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableContainer: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  tableHeader: {
    padding: '20px',
    borderBottom: '1px solid var(--border-color)',
  },
  tableTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px 20px',
    color: 'var(--text-secondary)',
    fontSize: '12px',
    fontWeight: '500',
    borderBottom: '1px solid var(--border-color)',
  },
  tr: {
    borderBottom: '1px solid var(--border-color)',
  },
  td: {
    padding: '15px 20px',
    fontSize: '14px',
  },
  badge: {
    background: 'rgba(46, 160, 67, 0.15)',
    color: 'var(--accent-green)',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  },
  actionBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '16px',
  },
  emptyState: {
    padding: '40px',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    fontSize: '14px',
  }
};