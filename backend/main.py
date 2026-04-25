from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import pandas as pd
import numpy as np
from io import StringIO, BytesIO
from cleaning import (
    fill_missing_timestamps,
    smooth_data,
    normalize_trends,
    detect_outliers,
    get_stats,
    get_all_stats
)

app = FastAPI(title="Time-Series Data Cleaning API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def read_file(file_bytes: bytes, filename: str) -> pd.DataFrame:
    content = file_bytes.decode("utf-8", errors="ignore")
    if filename.endswith(".json"):
        return pd.read_json(StringIO(content))
    return pd.read_csv(StringIO(content))


def get_numeric_cols(df: pd.DataFrame, timestamp_col: str) -> list:
    """Return all numeric columns except timestamp."""
    return [
        c for c in df.columns
        if c != timestamp_col and pd.api.types.is_numeric_dtype(df[c])
    ]


@app.get("/")
def root():
    return {"message": "Time-Series Data Cleaning API is running"}


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        content = await file.read()
        df = read_file(content, file.filename)

        datetime_cols = []
        for col in df.columns:
            try:
                pd.to_datetime(df[col])
                datetime_cols.append(col)
            except Exception:
                pass

        numeric_cols = [
            c for c in df.columns
            if pd.api.types.is_numeric_dtype(df[c])
        ]

        return {
            "filename": file.filename,
            "rows": len(df),
            "columns": list(df.columns),
            "datetime_columns": datetime_cols,
            "numeric_columns": numeric_cols,
            "preview": df.head(10).fillna("").to_dict(orient="records"),
            "missing_values": df.isnull().sum().to_dict(),
            "dtypes": df.dtypes.astype(str).to_dict()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload error: {str(e)}")


@app.post("/clean")
async def clean_data(
    file: UploadFile = File(...),
    timestamp_col: str = Form("timestamp"),
    value_cols: str = Form(""),        # comma-separated, empty = all numeric
    freq: str = Form("10min"),
    smooth_method: str = Form("rolling"),
    smooth_window: int = Form(5),
    norm_method: str = Form("minmax"),
):
    try:
        content = await file.read()
        df = read_file(content, file.filename)

        # Validate timestamp column
        if timestamp_col not in df.columns:
            raise HTTPException(status_code=400,
                detail=f"Timestamp column '{timestamp_col}' not found. Available: {list(df.columns)}")

        df[timestamp_col] = pd.to_datetime(df[timestamp_col])
        df = df.sort_values(timestamp_col).reset_index(drop=True)

        # Determine value columns
        if value_cols.strip():
            cols = [c.strip() for c in value_cols.split(",") if c.strip()]
            missing = [c for c in cols if c not in df.columns]
            if missing:
                raise HTTPException(status_code=400,
                    detail=f"Columns not found: {missing}. Available: {list(df.columns)}")
            selected_cols = cols
        else:
            selected_cols = get_numeric_cols(df, timestamp_col)

        if not selected_cols:
            raise HTTPException(status_code=400, detail="No numeric columns found to clean.")

        # Convert to numeric
        for col in selected_cols:
            df[col] = pd.to_numeric(df[col], errors="coerce")

        original_stats = get_all_stats(df, selected_cols)
        original_missing = {col: int(df[col].isnull().sum()) for col in selected_cols}

        # Pipeline
        keep_cols = [timestamp_col] + selected_cols
        df_work = df[keep_cols].copy()

        df_filled = fill_missing_timestamps(df_work, timestamp_col, selected_cols, freq)
        df_smoothed = smooth_data(df_filled, selected_cols, smooth_method, smooth_window)
        df_final, scaler_info = normalize_trends(df_smoothed, selected_cols, norm_method)
        outliers = detect_outliers(df_filled, selected_cols)

        # Chart data (first value column for main chart, all for multi-chart)
        total = len(df_final)
        step = max(1, total // 500)
        idx = list(range(0, total, step))

        def safe_list(series):
            return [None if pd.isna(x) else round(float(x), 6) for x in series.iloc[idx]]

        chart_data = {
            "timestamps": df_final[timestamp_col].iloc[idx].astype(str).tolist(),
            "columns": {}
        }
        for col in selected_cols:
            chart_data["columns"][col] = {
                "original": safe_list(df_filled[col]),
                "smoothed": safe_list(df_smoothed[col + "_smooth"]) if col + "_smooth" in df_smoothed.columns else [],
                "normalized": safe_list(df_final[col + "_clean"]) if col + "_clean" in df_final.columns else [],
                "outlier_mask": outliers.get(col, pd.Series(False, index=df_filled.index)).reindex(df_filled.index, fill_value=False).iloc[idx].tolist()
            }

        # Cleaned preview - timestamp + all clean columns
        clean_cols = [timestamp_col] + [c + "_clean" for c in selected_cols if c + "_clean" in df_final.columns]
        cleaned_stats = get_all_stats(df_final, [c + "_clean" for c in selected_cols])

        return {
            "status": "success",
            "value_columns": selected_cols,
            "steps": {
                "original_rows": len(df),
                "after_fill_rows": len(df_filled),
                "filled_timestamps": len(df_filled) - len(df),
                "original_missing": original_missing,
                "still_missing_after_fill": {col: int(df_filled[col].isnull().sum()) for col in selected_cols},
                "smooth_method": smooth_method,
                "smooth_window": smooth_window,
                "norm_method": norm_method,
                "scaler_info": scaler_info,
                "outliers_detected": {col: int(outliers.get(col, pd.Series()).sum()) for col in selected_cols},
            },
            "original_stats": original_stats,
            "cleaned_stats": cleaned_stats,
            "original_preview": df_work.head(20).fillna("").to_dict(orient="records"),
            "cleaned_preview": df_final[clean_cols].head(20).fillna("").to_dict(orient="records"),
            "chart_data": chart_data,
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"{str(e)}\n{traceback.format_exc()}")


@app.post("/download")
async def download_cleaned(
    file: UploadFile = File(...),
    timestamp_col: str = Form("timestamp"),
    value_cols: str = Form(""),
    freq: str = Form("10min"),
    smooth_method: str = Form("rolling"),
    smooth_window: int = Form(5),
    norm_method: str = Form("minmax"),
    output_format: str = Form("csv"),
):
    try:
        content = await file.read()
        df = read_file(content, file.filename)

        df[timestamp_col] = pd.to_datetime(df[timestamp_col])
        df = df.sort_values(timestamp_col).reset_index(drop=True)

        if value_cols.strip():
            selected_cols = [c.strip() for c in value_cols.split(",") if c.strip()]
        else:
            selected_cols = get_numeric_cols(df, timestamp_col)

        for col in selected_cols:
            df[col] = pd.to_numeric(df[col], errors="coerce")

        df_work = df[[timestamp_col] + selected_cols].copy()
        df_filled = fill_missing_timestamps(df_work, timestamp_col, selected_cols, freq)
        df_smoothed = smooth_data(df_filled, selected_cols, smooth_method, smooth_window)
        df_final, _ = normalize_trends(df_smoothed, selected_cols, norm_method)

        if output_format == "json":
            out = BytesIO(df_final.to_json(orient="records", date_format="iso").encode())
            media_type, fname = "application/json", "cleaned_data.json"
        else:
            out = BytesIO(df_final.to_csv(index=False).encode())
            media_type, fname = "text/csv", "cleaned_data.csv"

        out.seek(0)
        return StreamingResponse(out, media_type=media_type,
                                 headers={"Content-Disposition": f"attachment; filename={fname}"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))