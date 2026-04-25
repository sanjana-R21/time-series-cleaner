import React, { useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import './ChartPanel.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const COLORS = [
  { orig: '#ef4444', smooth: '#f97316', norm: '#00d4ff' },
  { orig: '#a855f7', smooth: '#ec4899', norm: '#10b981' },
  { orig: '#f59e0b', smooth: '#84cc16', norm: '#06b6d4' },
  { orig: '#6366f1', smooth: '#8b5cf6', norm: '#14b8a6' },
];

export default function ChartPanel({ data, valueCols }) {
  const [activeCol, setActiveCol] = useState(0);
  const [view, setView] = useState('all');

  if (!data || !valueCols || valueCols.length === 0) return null;

  const col = valueCols[activeCol];
  const colData = data.columns?.[col];
  const colors = COLORS[activeCol % COLORS.length];
  const labels = data.timestamps || [];

  if (!colData) return null;

  const datasets = {
    all: [
      { label: 'Original (filled)', data: colData.original, borderColor: colors.orig, backgroundColor: colors.orig + '15', borderWidth: 1.5, pointRadius: 0, tension: 0.3, fill: false },
      { label: 'Smoothed', data: colData.smoothed, borderColor: colors.smooth, backgroundColor: colors.smooth + '15', borderWidth: 2, pointRadius: 0, tension: 0.4, fill: false },
      { label: 'Normalized', data: colData.normalized, borderColor: colors.norm, backgroundColor: colors.norm + '15', borderWidth: 2, pointRadius: 0, tension: 0.4, fill: true, yAxisID: 'y2' },
    ],
    original: [{ label: 'Original', data: colData.original, borderColor: colors.orig, backgroundColor: colors.orig + '20', borderWidth: 1.5, pointRadius: 0, tension: 0.3, fill: true }],
    smoothed: [{ label: 'Smoothed', data: colData.smoothed, borderColor: colors.smooth, backgroundColor: colors.smooth + '20', borderWidth: 2, pointRadius: 0, tension: 0.4, fill: true }],
    normalized: [{ label: 'Normalized', data: colData.normalized, borderColor: colors.norm, backgroundColor: colors.norm + '20', borderWidth: 2, pointRadius: 0, tension: 0.4, fill: true }],
  };

  const opts = {
    responsive: true, maintainAspectRatio: false, animation: { duration: 300 },
    plugins: {
      legend: { labels: { color: '#94a3b8', font: { family: 'Space Mono', size: 11 }, boxWidth: 20 } },
      tooltip: { backgroundColor: '#111827', borderColor: '#1f2d45', borderWidth: 1, titleColor: '#e2e8f0', bodyColor: '#94a3b8' }
    },
    scales: {
      x: { ticks: { color: '#475569', maxTicksLimit: 8, font: { size: 10, family: 'Space Mono' } }, grid: { color: 'rgba(31,45,69,0.6)' } },
      y: { ticks: { color: '#475569', font: { size: 10, family: 'Space Mono' } }, grid: { color: 'rgba(31,45,69,0.6)' } },
      ...(view === 'all' ? { y2: { position: 'right', ticks: { color: colors.norm, font: { size: 10 } }, grid: { drawOnChartArea: false } } } : {})
    }
  };

  const outlierCount = colData.outlier_mask?.filter(Boolean).length || 0;

  return (
    <div className="chart-panel">
      {valueCols.length > 1 && (
        <div className="col-tabs">
          {valueCols.map((c, i) => (
            <button key={c} className={`col-tab ${activeCol === i ? 'active' : ''}`}
              style={activeCol === i ? { borderColor: COLORS[i % COLORS.length].norm, color: COLORS[i % COLORS.length].norm } : {}}
              onClick={() => setActiveCol(i)}>{c}</button>
          ))}
        </div>
      )}

      <div className="chart-header">
        <div className="chart-title">📈 {col}</div>
        <div className="chart-controls">
          {['all','original','smoothed','normalized'].map(v => (
            <button key={v} className={`view-btn ${view===v?'active':''}`} onClick={() => setView(v)}>
              {v === 'all' ? 'All Layers' : v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {outlierCount > 0 && (
        <div className="outlier-alert">⚠ {outlierCount} outlier{outlierCount > 1 ? 's' : ''} detected in <b>{col}</b></div>
      )}

      <div className="chart-wrap">
        <Line data={{ labels, datasets: datasets[view] }} options={opts} />
      </div>

      <div className="chart-legend">
        <div className="legend-item"><span style={{background: colors.orig}} />Original (gap-filled)</div>
        <div className="legend-item"><span style={{background: colors.smooth}} />Smoothed</div>
        <div className="legend-item"><span style={{background: colors.norm}} />Normalized</div>
      </div>
    </div>
  );
}