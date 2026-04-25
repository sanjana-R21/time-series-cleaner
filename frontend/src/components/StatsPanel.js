import React, { useState } from 'react';
import './StatsPanel.css';

const METRICS = [
  { key: 'count', label: 'Count', icon: '🔢' },
  { key: 'missing', label: 'Missing', icon: '❓' },
  { key: 'mean', label: 'Mean', icon: '∑' },
  { key: 'std', label: 'Std Dev', icon: '±' },
  { key: 'min', label: 'Min', icon: '▼' },
  { key: 'max', label: 'Max', icon: '▲' },
  { key: 'median', label: 'Median', icon: '◆' },
  { key: 'q25', label: 'Q1 (25%)', icon: '◁' },
  { key: 'q75', label: 'Q3 (75%)', icon: '▷' },
];

export default function StatsPanel({ originalStats, cleanedStats, valueCols }) {
  const [activeCol, setActiveCol] = useState(0);

  if (!valueCols || valueCols.length === 0) return <div style={{color:'#94a3b8',padding:20}}>No columns found.</div>;

  const col = valueCols[activeCol] || valueCols[0];

  // Try both "temperature" and "temperature_clean" as keys
  const original = (originalStats && (originalStats[col] || originalStats[col + '_clean'])) || {};
  const cleaned  = (cleanedStats  && (cleanedStats[col + '_clean'] || cleanedStats[col])) || {};

  return (
    <div className="stats-panel">
      {/* Column selector tabs */}
      {valueCols.length > 1 && (
        <div className="col-tabs" style={{ marginBottom: 16 }}>
          {valueCols.map((c, i) => (
            <button
              key={c}
              className={`col-tab ${activeCol === i ? 'active' : ''}`}
              onClick={() => setActiveCol(i)}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="stats-grid">
        {/* Original */}
        <div className="stats-col">
          <div className="stats-header original">📊 Original — {col}</div>
          {METRICS.map(m => {
            const val = original[m.key];
            return (
              <div key={m.key} className={`stat-row ${m.key === 'missing' && val > 0 ? 'warn' : ''}`}>
                <span className="stat-icon">{m.icon}</span>
                <span className="stat-label">{m.label}</span>
                <span className="stat-val">{val !== undefined && val !== null ? val : '—'}</span>
              </div>
            );
          })}
        </div>

        <div className="stats-divider">→</div>

        {/* Cleaned */}
        <div className="stats-col">
          <div className="stats-header cleaned">✅ Cleaned — {col}</div>
          {METRICS.map(m => {
            const val = cleaned[m.key];
            return (
              <div key={m.key} className={`stat-row ${m.key === 'missing' && val === 0 ? 'good' : ''}`}>
                <span className="stat-icon">{m.icon}</span>
                <span className="stat-label">{m.label}</span>
                <span className="stat-val">{val !== undefined && val !== null ? val : '—'}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}