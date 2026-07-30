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

const ProfileChartTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const fallbackPic = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
    const profilePic = data.profilePic || fallbackPic;
    const name = data.name || data.handle || 'Unknown';
    const value = payload[0].value;
    
    return (
      <div
        style={{
          background: '#0d0e12',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '8px',
          padding: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src={profilePic}
            alt={name}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              objectFit: 'cover',
            }}
            onError={(e) => {
              e.target.src = fallbackPic;
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '13px' }}>
              {name}
            </span>
            <span style={{ color: '#3b82f6', fontSize: '12px', marginTop: '2px' }}>
              Videos Nuked: {value}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function AnalyticsCharts({ barData, lineData }) {
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
        <h3 style={chartTitleStyle}>Target Sequence</h3>
        <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
          {barData && barData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 5, right: 5, left: -25, bottom: 60 }}>
                <XAxis
                  dataKey={barData[0]?.name !== undefined ? 'name' : 'handle'}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  angle={-90}
                  textAnchor="end"
                  interval={0}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#4b5563', fontSize: 11 }}
                  allowDecimals={false}
                />
                <Tooltip content={<ProfileChartTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
                <Bar
                  dataKey={barData[0]?.count !== undefined ? 'count' : 'blockCount'}
                  fill="#2563eb"
                  radius={[4, 4, 0, 0]}
                  name="Blocks"
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
        <h3 style={chartTitleStyle}>Intervention Frequency (7 Days)</h3>
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
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={3.5}
                  filter="url(#neonGlow)"
                  name="Blocks"
                  activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#0d0e12' }}
                  dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: '13px' }}>
              No block stats recorded
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
