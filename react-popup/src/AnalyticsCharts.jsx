import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';

const getInitials = (name) => {
  if (!name) return 'UN';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const getChannelColor = (name) => {
  const colors = ['#818cf8', '#60a5fa', '#c084fc', '#f472b6', '#34d399', '#fbbf24'];
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: '#0d0e12',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          padding: '8px 12px',
          borderRadius: '6px',
        }}
      >
        <p style={{ margin: 0, fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
          {label}
        </p>
        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#3b82f6', fontWeight: 700 }}>
          {payload[0].value} {payload[0].name || ''}
        </p>
      </div>
    );
  }
  return null;
};

const CustomPillTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const name = data.name || data.handle || 'Unknown';
    const value = payload[0].value;
    const channelColor = getChannelColor(name);
    const initials = getInitials(name);
    
    return (
      <div
        style={{
          background: 'rgba(15, 20, 30, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: channelColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 'bold',
            }}
          >
            {initials}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '14px' }}>
              {name}
            </span>
            <span style={{ color: '#9ca3af', fontSize: '12px', marginTop: '2px' }}>
              Targeted {value} times
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const CustomPillBar = (props) => {
  const { x, y, width, height, payload, background } = props;
  if (!payload) return null;

  const bgY = background ? background.y : 5;
  const bgHeight = background ? background.height : 230;
  const bottomY = bgY + bgHeight;
  const name = payload.name || payload.handle || 'Unknown';
  const color = getChannelColor(name);
  const initials = getInitials(name);
  const textY = bottomY - 45;

  return (
    <g>
      <defs>
        <filter id={`glowBar-${name.replace(/[^a-zA-Z0-9]/g, '')}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      {/* Background Pill */}
      <rect 
        x={x} 
        y={bgY} 
        width={width} 
        height={bgHeight} 
        fill="rgba(255, 255, 255, 0.03)" 
        rx={width / 2} 
        ry={width / 2} 
      />
      
      {/* Data Fill (The Bar) */}
      {height > 0 && (
        <rect 
          x={x} 
          y={y} 
          width={width} 
          height={height} 
          fill={color} 
          rx={width / 2} 
          ry={width / 2} 
          filter={`url(#glowBar-${name.replace(/[^a-zA-Z0-9]/g, '')})`}
        />
      )}
      
      {/* Avatar Circle */}
      <circle 
        cx={x + width / 2} 
        cy={bottomY - 20} 
        r={14} 
        fill="#0b0f19" 
      />
      
      {/* Avatar Initials */}
      <text 
        x={x + width / 2} 
        y={bottomY - 20} 
        dy=".3em" 
        textAnchor="middle" 
        fill="#ffffff" 
        fontSize="10px" 
        fontWeight="bold"
      >
        {initials}
      </text>
      
      {/* Vertical Text */}
      <text 
        x={x + width / 2} 
        y={textY} 
        transform={`rotate(-90, ${x + width / 2}, ${textY})`} 
        textAnchor="start" 
        fill="#e5e7eb" 
        fontSize="12px" 
        fontWeight="500"
      >
        {name}
      </text>
    </g>
  );
};

export default function AnalyticsCharts({ 
  barData, 
  lineData, 
  barTitle = "Target Sequence", 
  lineTitle = "Intervention Frequency (7 Days)",
  barKey,
  lineKey = "count"
}) {
  const cardStyle = {
    background: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: '16px',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    boxShadow: 'var(--glass-shadow)',
    padding: '20px',
    height: '320px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  const chartTitleStyle = {
    margin: '0 0 16px 0',
    fontSize: '12px',
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const activeBarKey = barKey || (barData?.[0]?.count !== undefined ? 'count' : 'blockCount');
  const lineName = lineTitle.includes("Videos Displayed") ? "Displays" : "Blocks";

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '20px',
        marginBottom: '32px',
      }}
    >
      {/* Target Sequence Bar Chart */}
      <div style={cardStyle}>
        <h3 style={chartTitleStyle}>{barTitle}</h3>
        <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
          {barData && barData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 5, right: 5, left: -25, bottom: 20 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey={barData[0]?.name !== undefined ? 'name' : 'handle'}
                  tick={false}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomPillTooltip />} cursor={false} />
                <Bar
                  dataKey={activeBarKey}
                  shape={<CustomPillBar />}
                  barSize={45}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: '13px' }}>
              No sequence history mapped
            </div>
          )}
        </div>
      </div>

      {/* Intervention Frequency Line Chart */}
      <div style={cardStyle}>
        <h3 style={chartTitleStyle}>{lineTitle}</h3>
        <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
          {lineData && lineData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                <defs>
                  <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                <CartesianGrid stroke="rgba(255, 255, 255, 0.03)" vertical={false} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#4b5563', fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#4b5563', fontSize: 11 }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey={lineKey}
                  stroke="#3b82f6"
                  strokeWidth={3.5}
                  filter="url(#neonGlow)"
                  name={lineName}
                  activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#0d0e12' }}
                  dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: '13px' }}>
              No stats recorded
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
