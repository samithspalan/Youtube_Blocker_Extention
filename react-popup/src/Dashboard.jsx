// src/Dashboard.jsx
import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch the data from our Express/MongoDB backend
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/blocks');
        const result = await response.json();
        
        if (result.success) {
          setStats(result.data);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) return <h2>Loading Analytics...</h2>;

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Analytics Dashboard</h1>
      <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #333' }}>
            <th>Target Handle</th>
            <th>Times Blocked (API Count)</th>
            <th>First Blocked Date</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((target) => (
            <tr key={target._id} style={{ borderBottom: '1px solid #ccc' }}>
              <td style={{ padding: '8px 0' }}>{target.handle}</td>
              <td>{target.blockCount}</td>
              <td>{new Date(target.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}