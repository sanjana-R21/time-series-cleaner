import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ChartPanel from './components/ChartPanel';
import StatsPanel from './components/StatsPanel';
import StepsPanel from './components/StepsPanel';
import './App.css';

const API = 'http://localhost:8000';

function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chart');
  const [config, setConfig] = useState({
    timestamp_col: 'timestamp',
    value_cols: '',
    freq: '10min',
    smooth_method: 'rolling',
    smooth_window: 5,
    norm_method: 'minmax',
  });

  const onDrop = useCallback(async (acceptedFiles) => {
    const f = acceptedFiles[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    const fd = new FormData();
    fd.append('file', f);
    try {
      const res = await axios.post(`${API}/upload`, fd);
      setPreview(res.data);
      if (res.data.datetime_columns.length > 0) {
        setConfig(c => ({ ...c, timestamp_col: res.data.datetime_columns[0] }));
      }
      toast.success(`📂 Loaded ${f.name} — ${res.data.rows} rows, ${res.data.columns.length} columns`);
    } catch (e) {
      toast.error('Upload failed: ' + (e.response?.data?.detail || e.message));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'application/json': ['.json'] },
    maxFiles: 1,
  });

  const handleClean = async () => {
    if (!file) return toast.warning('Please upload a file first.');
    setLoading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('timestamp_col', config.timestamp_col);
    fd.append('value_cols', config.value_cols);
    fd.append('freq', config.freq);
    fd.append('smooth_method', config.smooth_method);
    fd.append('smooth_window', config.smooth_window);
    fd.append('norm_method', config.norm_method);
    try {
      const res = await axios.post(`${API}/clean`, fd);
      setResult(res.data);
      setActiveTab('chart');
      const cols = res.data.value_columns || [];
      toast.success(`✅ Cleaned ${cols.length} column${cols.length > 1 ? 's' : ''}: ${cols.join(', ')}`);
    } catch (e) {
      toast.error('Cleaning failed: ' + (e.response?.data?.detail || e.message));
    }
    setLoading(false);
  };

  const handleDownload = async (fmt) => {
    if (!file) return toast.warning('Please upload and clean a file first.');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('timestamp_col', config.timestamp_col);
    fd.append('value_cols', config.value_cols);
    fd.append('freq', config.freq);
    fd.append('smooth_method', config.smooth_method);
    fd.append('smooth_window', config.smooth_window);
    fd.append('norm_method', config.norm_method);
    fd.append('output_format', fmt);
    try {
      const res = await axios.post(`${API}/download`, fd, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `cleaned_data.${fmt}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`📥 Downloaded cleaned_data.${fmt}`);
    } catch (e) {
      toast.error('Download failed');
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">◈</span>
            <span className="logo-text">TimeSeries<span className="logo-accent">Cleaner</span></span>
          </div>
          <span className="header-tag">Fill · Smooth · Normalize</span>
        </div>
        <div className="header-right">
          {result && (
            <div className="download-group">
              <button className="btn-dl" onClick={() => handleDownload('csv')}>⬇ CSV</button>
              <button className="btn-dl" onClick={() => handleDownload('json')}>⬇ JSON</button>
            </div>
          )}
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <div className={`dropzone ${isDragActive ? 'drag-active' : ''} ${file ? 'has-file' : ''}`} {...getRootProps()}>
            <input {...getInputProps()} />
            <div className="drop-icon">{isDragActive ? '📥' : file ? '✅' : '📂'}</div>
            <div className="drop-title">{file ? file.name : 'Drop your dataset'}</div>
            <div className="drop-sub">{file ? `${(file.size / 1024).toFixed(1)} KB` : 'CSV or JSON · Drag & drop or click'}</div>
          </div>

          {preview && (
            <div className="preview-badge">
              <div className="badge-row"><span>Rows</span><b>{preview.rows}</b></div>
              <div className="badge-row"><span>Columns</span><b>{preview.columns.length}</b></div>
              <div className="badge-row"><span>Numeric Cols</span><b className="accent">{(preview.numeric_columns || []).length}</b></div>
              <div className="badge-row"><span>Missing</span><b className="warn">{Object.values(preview.missing_values).reduce((a,b)=>a+b,0)}</b></div>
              {/* {preview.numeric_columns && preview.numeric_columns.length > 0 && (
                <div className="cols-detected">
                  <span className="cols-label">Detected value columns:</span>
                  <div className="cols-chips">
                    {preview.numeric_columns.map(c => (
                      <span key={c} className="col-chip-small">{c}</span>
                    ))}
                  </div>
                </div>
              )} */}
            </div>
          )}

          <div className="config-panel">
            <div className="config-title">⚙ Configuration</div>

            <label>Timestamp Column</label>
            <input className="inp" value={config.timestamp_col}
              onChange={e => setConfig(c => ({ ...c, timestamp_col: e.target.value }))} />

            <label>Value Columns <span className="label-hint">(comma-separated, blank = all numeric)</span></label>
            <input className="inp" placeholder="e.g. temp,humidity,pressure  or leave blank"
              value={config.value_cols}
              onChange={e => setConfig(c => ({ ...c, value_cols: e.target.value }))} />

            <label>Fill Frequency</label>
            <select className="inp" value={config.freq}
              onChange={e => setConfig(c => ({ ...c, freq: e.target.value }))}>
              <option value="1min">1 Minute</option>
              <option value="5min">5 Minutes</option>
              <option value="10min">10 Minutes</option>
              <option value="30min">30 Minutes</option>
              <option value="1h">1 Hour</option>
              <option value="1D">1 Day</option>
            </select>

            <label>Smooth Method</label>
            <select className="inp" value={config.smooth_method}
              onChange={e => setConfig(c => ({ ...c, smooth_method: e.target.value }))}>
              <option value="rolling">Rolling Average</option>
              <option value="ewm">Exponential Weighted</option>
              <option value="savgol">Savitzky-Golay</option>
              <option value="gaussian">Gaussian</option>
            </select>

            <label>Smooth Window: <b>{config.smooth_window}</b></label>
            <input type="range" min="3" max="21" step="2" value={config.smooth_window}
              onChange={e => setConfig(c => ({ ...c, smooth_window: parseInt(e.target.value) }))} />

            <label>Normalization</label>
            <select className="inp" value={config.norm_method}
              onChange={e => setConfig(c => ({ ...c, norm_method: e.target.value }))}>
              <option value="minmax">Min-Max [0,1]</option>
              <option value="zscore">Z-Score</option>
              <option value="robust">Robust Scaler</option>
              <option value="log">Log Transform</option>
            </select>

            <button className={`btn-clean ${loading ? 'loading' : ''}`} onClick={handleClean} disabled={loading}>
              {loading ? <><span className="spinner" />Processing...</> : '▶ Run Cleaning Pipeline'}
            </button>
          </div>
        </aside>

        <main className="main">
          {!result && !preview && (
            <div className="empty-state">
              <div className="empty-icon">◈</div>
              <div className="empty-title">Time-Series Data Cleaning System</div>
              <div className="empty-desc">Upload a CSV or JSON dataset. Works with 2, 4, or any number of columns — all numeric columns are cleaned automatically.</div>
              <div className="pipeline-steps">
                <div className="ps"><span>01</span>Fill Missing Timestamps</div>
                <div className="ps-arrow">→</div>
                <div className="ps"><span>02</span>Smooth Data</div>
                <div className="ps-arrow">→</div>
                <div className="ps"><span>03</span>Normalize Trends</div>
              </div>
            </div>
          )}

          {preview && !result && (
            <div className="preview-table-wrap">
              <div className="section-title">📋 Dataset Preview — {preview.columns.length} columns detected</div>
              <div className="cols-row">
                {preview.columns.map(c => (
                  <span key={c} className={`col-chip ${preview.datetime_columns?.includes(c) ? 'dt' : ''} ${preview.numeric_columns?.includes(c) ? 'num' : ''}`}>
                    {c}
                    {preview.datetime_columns?.includes(c) && <em> 🕐</em>}
                    {preview.numeric_columns?.includes(c) && <em> #</em>}
                  </span>
                ))}
              </div>
              <div className="table-scroll">
                <table className="data-table">
                  <thead><tr>{preview.columns.map(c => <th key={c}>{c}</th>)}</tr></thead>
                  <tbody>
                    {preview.preview.map((row, i) => (
                      <tr key={i}>{preview.columns.map(c => (
                        <td key={c}>{row[c] === '' || row[c] === null || row[c] === undefined
                          ? <span className="null-val">null</span>
                          : String(row[c]).length > 15 ? String(row[c]).slice(0, 15) + '…' : row[c]}
                        </td>
                      ))}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result && (
            <>
              {result.value_columns && (
                <div className="result-cols-bar">
                  ✅ Cleaned <b>{result.value_columns.length}</b> column{result.value_columns.length > 1 ? 's' : ''}:
                  {result.value_columns.map(c => <span key={c} className="col-chip-small accent">{c}</span>)}
                </div>
              )}
              <div className="tabs">
                {['chart','stats','steps','preview'].map(t => (
                  <button key={t} className={`tab ${activeTab===t?'active':''}`} onClick={() => setActiveTab(t)}>
                    {t === 'chart' ? '📈 Chart' : t === 'stats' ? '📊 Stats' : t === 'steps' ? '🔬 Pipeline' : '📋 Data'}
                  </button>
                ))}
              </div>
              {activeTab === 'chart' && <ChartPanel data={result.chart_data} valueCols={result.value_columns} />}
              {activeTab === 'stats' && <StatsPanel originalStats={result.original_stats} cleanedStats={result.cleaned_stats} valueCols={result.value_columns} />}
              {activeTab === 'steps' && <StepsPanel steps={result.steps} valueCols={result.value_columns} />}
              {activeTab === 'preview' && (
                <div className="preview-table-wrap">
                  <div className="section-title">Cleaned Data Preview</div>
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead><tr>{Object.keys(result.cleaned_preview[0]||{}).map(k=><th key={k}>{k}</th>)}</tr></thead>
                      <tbody>
                        {result.cleaned_preview.map((row,i)=>(
                          <tr key={i}>{Object.values(row).map((v,j)=><td key={j}>{typeof v==='number'?v.toFixed(4):v}</td>)}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
      <ToastContainer position="bottom-right" theme="dark" className="toast-container" />
    </div>
  );
}

export default App;