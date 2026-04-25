# ◈ Time-Series Data Cleaning System

A full-stack application to **Fill Missing Timestamps → Smooth Data → Normalize Trends** on any time-series CSV/JSON dataset.

---

## 📁 Project Structure

```
time-series-cleaner/
│
├── backend/                    ← FastAPI Python backend
│   ├── main.py                 ← API routes (upload, clean, download)
│   ├── cleaning.py             ← Core cleaning algorithms
│   └── requirements.txt        ← Python dependencies
│
├── frontend/                   ← React frontend
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js              ← Main app with drag-drop UI
│   │   ├── App.css
│   │   ├── index.js
│   │   ├── index.css
│   │   └── components/
│   │       ├── ChartPanel.js   ← Interactive time-series chart
│   │       ├── ChartPanel.css
│   │       ├── StatsPanel.js   ← Before/after statistics
│   │       ├── StatsPanel.css
│   │       ├── StepsPanel.js   ← Pipeline step details
│   │       └── StepsPanel.css
│   └── package.json
│
├── sample_data/
│   └── generate_samples.py     ← Generate test CSV datasets
│
├── .vscode/
│   ├── launch.json             ← Debug config
│   └── settings.json           ← Editor settings
│
└── README.md
```

---

## ⚙️ Prerequisites

Make sure these are installed on your system:

| Tool | Version | Check |
|------|---------|-------|
| Python | 3.9+ | `python --version` |
| Node.js | 16+ | `node --version` |
| npm | 8+ | `npm --version` |
| VS Code | Latest | — |

---


## 🔬 How the Pipeline Works

### Step 1: Fill Missing Timestamps
```
Input:  Irregular timestamps with gaps
Method: pd.date_range() full index → reindex → time-based interpolation
Output: Complete, evenly-spaced time-series
```
- Detects the start/end of your data
- Creates a complete datetime index at your chosen frequency
- Reindexes the DataFrame (creates NaN rows for missing timestamps)
- Interpolates missing values using **time-weighted linear interpolation**
- Edge cases handled with forward-fill then backward-fill

### Step 2: Smooth Data
```
Input:  Gap-filled but noisy series
Methods:
  - rolling   → Simple moving average (symmetric window)
  - ewm       → Exponential weighted moving average (recent bias)
  - savgol    → Savitzky-Golay filter (preserves peaks/shape)
  - gaussian  → Gaussian-weighted convolution
Output: Noise-reduced time-series
```
- Configurable window size (3–21 points)
- Also runs Z-score based outlier detection (flags values > 3σ)

### Step 3: Normalize Trends
```
Input:  Smoothed series
Methods:
  - minmax  → Scale to [0, 1]
  - zscore  → Standardize (mean=0, std=1)
  - robust  → Median/IQR scale (outlier-resistant)
  - log     → Log(1+x) transform for skewed data
Output: Normalized, analysis-ready time-series
```

### Output Columns in Downloaded File
| Column | Description |
|--------|-------------|
| `timestamp` | Complete, evenly-spaced timestamps |
| `value` | Original values (with NaN for missing) |
| `value_smooth` | Smoothed values |
| `value_clean` | Final normalized values (use this for analysis) |

---



## 🧪 Supported File Formats

| Format | Extension | Notes |
|--------|-----------|-------|
| CSV | `.csv` | Most common; needs `timestamp` + `value` columns |
| JSON | `.json` | Array of records format |

**Minimum required columns:**
- A datetime column (e.g., `timestamp`, `date`, `time`)
- A numeric value column (e.g., `value`, `price`, `temperature`)

---

## 🛠 Troubleshooting

| Problem | Fix |
|---------|-----|
| `uvicorn: command not found` | Activate venv: `source venv/bin/activate` |
| `CORS error` in browser | Make sure backend is running on port 8000 |
| `Module not found` (Python) | Run `pip install -r requirements.txt` again |
| `npm: command not found` | Install Node.js from nodejs.org |
| Frontend won't start | Delete `node_modules/` and run `npm install` again |
| `Column not found` error | Check exact column names match your file headers |

---

## 📦 Tech Stack

**Backend:** Python · FastAPI · Pandas · NumPy · SciPy · scikit-learn · Uvicorn

**Frontend:** React 18 · Chart.js · react-chartjs-2 · react-dropzone · Axios · React-Toastify
