import React from 'react';
import './StepsPanel.css';

// Safely render a value — objects get converted to readable strings
function renderVal(val) {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'object') {
    // e.g. { heart_rate: 20, spo2_pct: 15 } → "heart_rate: 20 | spo2_pct: 15"
    return Object.entries(val)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' | ');
  }
  return String(val);
}

export default function StepsPanel({ steps, valueCols }) {
  const s = steps || {};

  const pipeline = [
    {
      num: '01',
      title: 'Fill Missing Timestamps',
      color: '#ef4444',
      desc: 'Creates a complete datetime range at the specified frequency, reindexes the DataFrame, and fills missing values using time-based linear interpolation. Forward/backward fill handles edge cases.',
      items: [
        { label: 'Original Rows',            value: s.original_rows },
        { label: 'Timestamps Added',         value: s.filled_timestamps, good: s.filled_timestamps > 0 },
        { label: 'After Fill Rows',          value: s.after_fill_rows },
        { label: 'Original Missing (total)', value: s.original_missing },
        { label: 'Still Missing After Fill', value: s.still_missing_after_fill },
      ],
    },
    {
      num: '02',
      title: 'Smooth Data',
      color: '#f59e0b',
      desc: 'Applies the selected smoothing algorithm to reduce noise. Rolling average is best for steady signals; Savitzky-Golay preserves peaks; EWM gives more weight to recent values; Gaussian uses bell-curve weighting.',
      items: [
        { label: 'Method Used',       value: s.smooth_method },
        { label: 'Window Size',       value: s.smooth_window },
        { label: 'Outliers Detected', value: s.outliers_detected },
      ],
    },
    {
      num: '03',
      title: 'Normalize Trends',
      color: '#00d4ff',
      desc: 'Scales the smoothed values to a consistent range. Min-Max maps to [0,1]; Z-Score standardizes to mean=0, std=1; Robust Scaler uses median/IQR and is resistant to outliers; Log Transform handles skewed data.',
      items: [
        { label: 'Method Used', value: s.norm_method },
        // Show per-column scaler info if available
        ...(s.scaler_info?.columns
          ? Object.entries(s.scaler_info.columns).map(([col, info]) => ({
              label: col,
              value: Object.entries(info).map(([k,v]) => `${k}: ${v}`).join(', '),
            }))
          : []
        ),
      ],
    },
  ];

  // Helper: show per-column breakdown for missing / outlier counts
  function renderPerColumn(obj) {
    if (!obj || typeof obj !== 'object') return renderVal(obj);
    return (
      <div className="per-col-grid">
        {Object.entries(obj).map(([col, val]) => (
          <div key={col} className="per-col-item">
            <span className="per-col-name">{col}</span>
            <span className="per-col-val">{val}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="steps-panel">
      {/* Summary bar */}
      {valueCols && valueCols.length > 0 && (
        <div className="cols-summary">
          🔬 Pipeline ran on <b>{valueCols.length}</b> column{valueCols.length > 1 ? 's' : ''}:
          {valueCols.map(c => <span key={c} className="col-chip-sm">{c}</span>)}
        </div>
      )}

      {/* Step 1 */}
      <div className="step-card" style={{'--step-color': '#ef4444'}}>
        <div className="step-head">
          <div className="step-num" style={{color:'#ef4444'}}>01</div>
          <div className="step-title" style={{color:'#ef4444'}}>Fill Missing Timestamps</div>
          <div className="step-badge">✅ Done</div>
        </div>
        <p className="step-desc">{pipeline[0].desc}</p>
        <div className="step-metrics">
          <div className="step-metric"><span className="sm-label">Original Rows</span><span className="sm-val">{s.original_rows ?? '—'}</span></div>
          <div className="step-metric"><span className="sm-label">Timestamps Added</span><span className="sm-val good">{s.filled_timestamps ?? '—'}</span></div>
          <div className="step-metric"><span className="sm-label">After Fill Rows</span><span className="sm-val">{s.after_fill_rows ?? '—'}</span></div>
        </div>
        {/* Per-column missing breakdown */}
        {s.original_missing && typeof s.original_missing === 'object' && (
          <div className="breakdown-section">
            <div className="breakdown-title">Missing values per column (before):</div>
            {renderPerColumn(s.original_missing)}
          </div>
        )}
        {s.still_missing_after_fill && typeof s.still_missing_after_fill === 'object' && (
          <div className="breakdown-section">
            <div className="breakdown-title">Still missing after fill:</div>
            {renderPerColumn(s.still_missing_after_fill)}
          </div>
        )}
      </div>

      {/* Step 2 */}
      <div className="step-card" style={{'--step-color': '#f59e0b'}}>
        <div className="step-head">
          <div className="step-num" style={{color:'#f59e0b'}}>02</div>
          <div className="step-title" style={{color:'#f59e0b'}}>Smooth Data</div>
          <div className="step-badge">✅ Done</div>
        </div>
        <p className="step-desc">{pipeline[1].desc}</p>
        <div className="step-metrics">
          <div className="step-metric"><span className="sm-label">Method</span><span className="sm-val">{s.smooth_method ?? '—'}</span></div>
          <div className="step-metric"><span className="sm-label">Window</span><span className="sm-val">{s.smooth_window ?? '—'}</span></div>
        </div>
        {s.outliers_detected && typeof s.outliers_detected === 'object' && (
          <div className="breakdown-section">
            <div className="breakdown-title">Outliers detected per column:</div>
            {renderPerColumn(s.outliers_detected)}
          </div>
        )}
      </div>

      {/* Step 3 */}
      <div className="step-card" style={{'--step-color': '#00d4ff'}}>
        <div className="step-head">
          <div className="step-num" style={{color:'#00d4ff'}}>03</div>
          <div className="step-title" style={{color:'#00d4ff'}}>Normalize Trends</div>
          <div className="step-badge">✅ Done</div>
        </div>
        <p className="step-desc">{pipeline[2].desc}</p>
        <div className="step-metrics">
          <div className="step-metric"><span className="sm-label">Method</span><span className="sm-val">{s.norm_method ?? '—'}</span></div>
        </div>
        {s.scaler_info?.columns && (
          <div className="breakdown-section">
            <div className="breakdown-title">Scaler parameters per column:</div>
            {Object.entries(s.scaler_info.columns).map(([col, info]) => (
              <div key={col} className="scaler-row">
                <span className="scaler-col">{col}</span>
                {Object.entries(info).map(([k, v]) => (
                  <span key={k} className="scaler-kv">{k}: <b>{v}</b></span>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}