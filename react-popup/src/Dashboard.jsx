// src/Dashboard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AnalyticsCharts from './AnalyticsCharts';

export default function Dashboard() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/blocks');
        const result = await response.json();
        
        if (result.success) {
          setStats(result.data);
        } else {
          generateFallback();
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        generateFallback();
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const generateFallback = () => {
    setStats([
      { _id: 'mock-1', handle: 'MrBeast', blockCount: 42, createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
      { _id: 'mock-2', handle: 'T-Series', blockCount: 28, createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
      { _id: 'mock-3', handle: 'PewDiePie', blockCount: 15, createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
    ]);
  };

  const barData = stats.map(item => ({
    handle: item.handle,
    blockCount: item.blockCount
  }));

  const getLineData = () => {
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const result = [];
    
    const dailyCounts = {};
    stats.forEach(item => {
      if (item.createdAt) {
        const d = new Date(item.createdAt);
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + item.blockCount;
      }
    });

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const count = dailyCounts[dateKey] || 0;
      result.push({
        label: daysOfWeek[d.getDay()],
        count: count
      });
    }
    return result;
  };

  const lineData = getLineData();

  return (
    <div
      className="min-h-screen flex flex-col font-sans py-10 px-8 text-text-primary"
      style={{ background: 'radial-gradient(circle at 5% 20%, rgba(47,129,247,0.12), transparent 40%), var(--bg-dark)' }}
    >
      <div className="max-w-5xl w-full mx-auto flex flex-col flex-1">
        {/* Navigation Link Back */}
        <div className="mb-6">
          <Link to="/" className="text-accent-blue hover:underline text-sm font-semibold flex items-center gap-1 cursor-pointer no-underline">
            <span>←</span> Back to Command Center
          </Link>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center mb-8 border-b border-border-theme pb-6">
          <div>
            <h1 className="m-0 text-3xl font-bold tracking-tight">Standalone Analytics</h1>
            <p className="m-0 text-sm text-text-secondary mt-1">Direct view of YT Stealth Blocker database history</p>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              fetch('http://localhost:5000/api/blocks')
                .then(res => res.json())
                .then(data => {
                  if (data?.success && data?.data) setStats(data.data);
                })
                .catch(() => generateFallback())
                .finally(() => setLoading(false));
            }}
            className="bg-bg-sidebar border border-border-theme text-text-primary px-4 py-2 rounded-lg text-sm cursor-pointer hover:bg-bg-hover transition-all"
          >
            🔄 Sync Database
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <span className="text-lg text-text-secondary animate-pulse">Querying database records...</span>
          </div>
        ) : (
          <>
            <AnalyticsCharts barData={barData} lineData={lineData} />
            <div className="bg-bg-card border border-border-theme rounded-xl overflow-hidden shadow-xl">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-bg-sidebar/55">
                    {['TARGET HANDLE', 'TIMES BLOCKED (API COUNT)', 'FIRST BLOCKED DATE'].map((h) => (
                      <th key={h} className="text-left px-6 py-4 text-text-secondary text-xs font-semibold tracking-wider uppercase border-b border-border-theme">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.map((target, idx) => (
                    <tr key={target._id || idx} className="border-b border-border-theme hover:bg-bg-hover transition-colors">
                      <td className="px-6 py-4 text-sm font-semibold text-text-primary flex items-center">
                        <span className="w-6 h-6 rounded-full bg-accent-blue/15 text-accent-blue text-xs font-bold flex items-center justify-center mr-3">
                          {target.handle.slice(0, 2).toUpperCase()}
                        </span>
                        {target.handle}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <span className="bg-accent-red/10 text-accent-red px-3 py-1 rounded-full text-xs font-bold border border-accent-red/15">
                          {target.blockCount} times
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-text-secondary font-medium">
                        {new Date(target.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}