import { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Rectangle } from 'recharts';

const CustomActiveBar = (props) => {
  const { x, y, width, height, ...rest } = props;
  if (!height || height <= 0) return null;
  const widthIncrease = 6;
  const heightIncrease = 3;
  return (
    <Rectangle
      {...rest}
      x={x - widthIncrease / 2}
      y={y - heightIncrease}
      width={width + widthIncrease}
      height={height + heightIncrease}
      radius={[6, 6, 0, 0]}
    />
  );
};

export default function TimeSpent() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState({ dailyTrend: [], breakdown: {}, channels: [] });
  const [filterType, setFilterType] = useState('Distraction');

  const fetchTimeAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('http://localhost:5000/api/time/analytics');
      if (!res.ok) {
        throw new Error(`Failed to load data from backend (${res.status} ${res.statusText})`);
      }
      const resJson = await res.json();
      if (resJson.success && resJson.data) {
        setAnalyticsData(resJson.data);
      } else {
        throw new Error("Invalid analytics data schema received");
      }
    } catch (err) {
      console.error("Failed to fetch time spent analytics:", err);
      setError(err.message || "Failed to establish server connection");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeAnalytics();
  }, []);

  const formatTime = (ms) => {
    if (!ms || typeof ms !== 'number') return '0m';
    const totalMin = Math.round(ms / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  const getInitials = (name) => {
    if (!name) return '??';
    const clean = name.replace('@', '').trim();
    const parts = clean.split(/[\s.:_-]+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 bg-transparent">
        <div 
          className="p-8 rounded-2xl flex flex-col items-center gap-4"
          style={{
            background: 'rgba(18, 22, 32, 0.4)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
          }}
        >
          <div className="w-10 h-10 border-4 border-[#3b82f6]/30 border-t-[#3b82f6] rounded-full animate-spin" />
          <span className="text-sm text-[#9ca3af]">Syncing daily usage metrics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 bg-transparent">
        <div 
          className="p-8 rounded-2xl flex flex-col items-center gap-4 max-w-md text-center"
          style={{
            background: 'rgba(239, 68, 68, 0.05)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
          }}
        >
          <span className="text-3xl">⚠️</span>
          <h3 className="m-0 text-lg font-bold text-[#f87171]">Connection Error</h3>
          <p className="text-xs text-[#9ca3af] m-0">{error}</p>
          <button 
            onClick={fetchTimeAnalytics}
            className="mt-2 px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#3b82f6]/20 hover:bg-[#3b82f6]/35 text-white border border-[#3b82f6]/30 cursor-pointer transition-all"
          >
            Retry Sync
          </button>
        </div>
      </div>
    );
  }

  const studyVal = analyticsData.breakdown?.study || 0;
  const distractionVal = analyticsData.breakdown?.distraction || 0;
  const totalVal = studyVal + distractionVal || 1;
  
  const studyPct = Math.round((studyVal / totalVal) * 100);
  const distractionPct = 100 - studyPct;
  
  const dominantPct = distractionVal > studyVal ? distractionPct : studyPct;
  const dominantLabel = distractionVal > studyVal ? "Distraction" : "Study";
  const dominantColor = distractionVal > studyVal ? "#f87171" : "#4ade80";

  const pieData = [
    { name: 'Study', value: studyVal, color: '#4ade80' },
    { name: 'Distraction', value: distractionVal, color: '#f87171' }
  ];

  const filteredChannels = analyticsData.channels.filter(c => c.category === filterType);
  const totalCategoryTime = filteredChannels.reduce((sum, c) => sum + (c.timeSpent || 0), 0) || 1;

  return (
    <>
      {/* Title Row */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="m-0 text-[24px] font-bold text-white tracking-tight">Time Spent</h1>
          <p className="m-0 text-sm text-[#9ca3af] mt-1">Track your daily YouTube usage and activity breakdown</p>
        </div>
        <button
          onClick={fetchTimeAnalytics}
          className="text-white px-4 py-2 flex items-center gap-2 cursor-pointer hover:opacity-80 transition-all"
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
          Refresh Data
        </button>
      </div>

      {/* Daily Time Spent & Time Breakdown Charts */}
      <div className="grid grid-cols-3 gap-5 mb-8">
        {/* Daily Time Spent BarChart (spans 2 columns) */}
        <div 
          className="col-span-2 p-5 rounded-xl flex flex-col justify-between"
          style={{
            background: 'rgba(18, 22, 32, 0.6)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            height: '320px',
            boxSizing: 'border-box'
          }}
        >
          <h3 className="m-0 mb-3 text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <span>🕒</span> Daily Time Spent
          </h3>
          <div className="flex-1 w-full min-h-0">
            {analyticsData.dailyTrend && analyticsData.dailyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.dailyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                  <XAxis dataKey="label" stroke="#4b5563" fontSize={11} tickLine={false} />
                  <YAxis 
                    stroke="#4b5563" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => `${val}h`}
                  />
                  <Tooltip 
                    cursor={false}
                    contentStyle={{ background: '#121620', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                    itemStyle={{ color: '#60a5fa' }}
                  />
                  <Bar 
                    dataKey="totalHours" 
                    fill="#60a5fa" 
                    radius={[6, 6, 0, 0]}
                    barSize={30} 
                    activeBar={<CustomActiveBar />}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[#9ca3af] text-sm">No activity trend recorded yet</div>
            )}
          </div>
        </div>

        {/* Time Breakdown Donut Chart (spans 1 column) */}
        <div 
          className="p-5 rounded-xl flex flex-col justify-between"
          style={{
            background: 'rgba(18, 22, 32, 0.6)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            height: '320px',
            boxSizing: 'border-box'
          }}
        >
          <h3 className="m-0 mb-3 text-sm font-semibold text-white uppercase tracking-wider">
            Time Breakdown
          </h3>
          <div className="flex-1 w-full min-h-0 relative flex items-center justify-center">
            {totalVal > 1 ? (
              <div className="w-full h-full flex flex-col items-center justify-between">
                <div className="relative w-full h-[150px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius="60%"
                        outerRadius="80%"
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span style={{ fontSize: '24px', fontWeight: '800', color: dominantColor }}>
                      {dominantPct}%
                    </span>
                    <span style={{ fontSize: '10px', color: '#8b949e', textTransform: 'uppercase', marginTop: '2px' }}>
                      {dominantLabel}
                    </span>
                  </div>
                </div>
                <div className="w-full flex flex-col gap-1.5 px-2">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-1.5 text-[#9ca3af]">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#f87171]" />
                      <span>Distraction</span>
                    </div>
                    <span className="font-semibold text-white">
                      {distractionPct}% ({formatTime(distractionVal)})
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-1.5 text-[#9ca3af]">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#4ade80]" />
                      <span>Study</span>
                    </div>
                    <span className="font-semibold text-white">
                      {studyPct}% ({formatTime(studyVal)})
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-[#9ca3af] text-sm text-center">No watched durations loaded yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Filter Toggle Buttons */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm text-[#9ca3af]">Showing details for:</span>
        <button
          onClick={() => setFilterType('Distraction')}
          className="px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all border outline-none"
          style={{
            background: filterType === 'Distraction' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.02)',
            borderColor: filterType === 'Distraction' ? '#f87171' : 'rgba(255, 255, 255, 0.1)',
            color: filterType === 'Distraction' ? '#f87171' : '#8b949e',
            boxShadow: filterType === 'Distraction' ? '0 0 10px rgba(239, 68, 68, 0.25)' : 'none'
          }}
        >
          Distraction
        </button>
        <button
          onClick={() => setFilterType('Study')}
          className="px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all border outline-none"
          style={{
            background: filterType === 'Study' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(255, 255, 255, 0.02)',
            borderColor: filterType === 'Study' ? '#4ade80' : 'rgba(255, 255, 255, 0.1)',
            color: filterType === 'Study' ? '#4ade80' : '#8b949e',
            boxShadow: filterType === 'Study' ? '0 0 10px rgba(74, 222, 128, 0.25)' : 'none'
          }}
        >
          Study
        </button>
      </div>

      {/* Top Channels Table - Nested Glass Shadow Container */}
      <div className="outer-glass-container mb-8">
        <div className="outer-header-row flex justify-between items-center">
          <div className="parent-title-group flex items-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mr-2" style={{ color: filterType === 'Distraction' ? '#f87171' : '#4ade80', filter: `drop-shadow(0 0 4px ${filterType === 'Distraction' ? '#f87171' : '#4ade80'})` }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <h3 className="parent-title m-0 text-base font-semibold text-white">
              Top Channels by Time Spent ({filterType})
            </h3>
          </div>
          <div className="cursor-pointer text-[#9ca3af] hover:text-white p-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
          </div>
        </div>

        <div className="inner-glass-content-area">
          {filteredChannels.length === 0 ? (
            <div className="p-10 text-center text-[#9ca3af] text-sm">
              No activity recorded for {filterType} channels.
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['CHANNEL', 'CATEGORY', 'TIME SPENT', 'PERCENTAGE'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-[#9ca3af] text-[11px] font-semibold uppercase tracking-wider border-b border-border-theme/40">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredChannels.slice(0, 5).map((item, idx) => {
                  const pct = ((item.timeSpent / totalCategoryTime) * 100).toFixed(1);
                  const barColor = item.category === 'Study' ? '#4ade80' : '#f87171';
                  
                  return (
                    <tr key={idx} className="border-b border-border-theme/30 hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                      {/* Channel */}
                      <td className="px-5 py-[12px] text-sm text-white font-medium flex items-center">
                        <div 
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mr-3"
                          style={{
                            background: item.category === 'Study' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)',
                            color: item.category === 'Study' ? '#4ade80' : '#f87171',
                            border: `1px solid ${item.category === 'Study' ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)'}`
                          }}
                        >
                          {getInitials(item.name)}
                        </div>
                        <span>{item.name}</span>
                      </td>
                      {/* Category */}
                      <td className="px-5 py-[12px] text-sm">
                        <span 
                          className="px-2 py-0.5 rounded-full text-xs font-semibold border"
                          style={{
                            background: item.category === 'Study' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)',
                            color: item.category === 'Study' ? '#4ade80' : '#f87171',
                            borderColor: item.category === 'Study' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)'
                          }}
                        >
                          {item.category}
                        </span>
                      </td>
                      {/* Time spent */}
                      <td className="px-5 py-[12px] text-sm font-semibold" style={{ color: barColor }}>
                        {formatTime(item.timeSpent)}
                      </td>
                      {/* Percentage bar */}
                      <td className="px-5 py-[12px] text-sm">
                        <div className="flex items-center gap-3 w-full">
                          <span className="text-xs text-[#9ca3af] font-medium w-10">{pct}%</span>
                          <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden max-w-[200px]">
                            <div 
                              style={{
                                width: `${pct}%`,
                                background: barColor,
                                height: '100%',
                                borderRadius: '9999px'
                              }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
