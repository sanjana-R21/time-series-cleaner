import pandas as pd
import numpy as np
from scipy.signal import savgol_filter
from sklearn.preprocessing import MinMaxScaler, StandardScaler, RobustScaler
from typing import Tuple, Dict, Any, List


def fill_missing_timestamps(
    df: pd.DataFrame,
    timestamp_col: str,
    value_cols: List[str],
    freq: str = "10min"
) -> pd.DataFrame:
    """Fill missing timestamps and interpolate all value columns."""
    df = df.copy()
    df[timestamp_col] = pd.to_datetime(df[timestamp_col])
    df = df.drop_duplicates(subset=[timestamp_col])
    df = df.set_index(timestamp_col).sort_index()

    full_range = pd.date_range(start=df.index.min(), end=df.index.max(), freq=freq)
    df = df.reindex(full_range)
    df.index.name = timestamp_col

    for col in value_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
            df[col] = df[col].interpolate(method="time")
            df[col] = df[col].fillna(method="bfill").fillna(method="ffill")

    return df.reset_index()


def smooth_data(
    df: pd.DataFrame,
    value_cols: List[str],
    method: str = "rolling",
    window: int = 5
) -> pd.DataFrame:
    """Smooth all value columns."""
    df = df.copy()

    for col in value_cols:
        if col not in df.columns:
            continue
        series = df[col].copy()

        if method == "rolling":
            smoothed = series.rolling(window=window, center=True, min_periods=1).mean()

        elif method == "ewm":
            smoothed = series.ewm(span=window, adjust=False).mean()

        elif method == "savgol":
            win = window if window % 2 == 1 else window + 1
            poly = min(3, win - 1)
            arr = series.fillna(method="ffill").fillna(method="bfill").values
            smoothed = pd.Series(savgol_filter(arr, win, poly), index=series.index)

        elif method == "gaussian":
            weights = np.exp(-0.5 * np.arange(-(window // 2), window // 2 + 1) ** 2)
            weights /= weights.sum()
            arr = series.fillna(method="ffill").fillna(method="bfill").values
            from scipy.ndimage import convolve1d
            smoothed = pd.Series(convolve1d(arr.astype(float), weights, mode="reflect"), index=series.index)

        else:
            smoothed = series

        df[col + "_smooth"] = smoothed

    return df


def normalize_trends(
    df: pd.DataFrame,
    value_cols: List[str],
    method: str = "minmax"
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """Normalize all value columns."""
    df = df.copy()
    scaler_info = {"method": method, "columns": {}}

    for col in value_cols:
        smooth_col = col + "_smooth" if col + "_smooth" in df.columns else col
        if smooth_col not in df.columns:
            continue

        series = df[smooth_col].fillna(df[smooth_col].median())
        arr = series.values.reshape(-1, 1)

        if method == "minmax":
            scaler = MinMaxScaler()
            normalized = scaler.fit_transform(arr).flatten()
            scaler_info["columns"][col] = {
                "min": round(float(scaler.data_min_[0]), 4),
                "max": round(float(scaler.data_max_[0]), 4)
            }

        elif method == "zscore":
            scaler = StandardScaler()
            normalized = scaler.fit_transform(arr).flatten()
            scaler_info["columns"][col] = {
                "mean": round(float(scaler.mean_[0]), 4),
                "std": round(float(scaler.scale_[0]), 4)
            }

        elif method == "robust":
            scaler = RobustScaler()
            normalized = scaler.fit_transform(arr).flatten()
            scaler_info["columns"][col] = {
                "center": round(float(scaler.center_[0]), 4),
                "scale": round(float(scaler.scale_[0]), 4)
            }

        elif method == "log":
            min_val = series.min()
            shift = abs(min_val) + 1 if min_val <= 0 else 0
            normalized = np.log1p(series.values + shift)
            scaler_info["columns"][col] = {"shift": round(float(shift), 4)}

        else:
            normalized = series.values

        df[col + "_clean"] = normalized

    return df, scaler_info


def detect_outliers(df: pd.DataFrame, value_cols: List[str], z_thresh: float = 3.0) -> Dict[str, pd.Series]:
    """Detect outliers in all value columns. Returns dict of boolean Series."""
    result = {}
    for col in value_cols:
        if col not in df.columns:
            continue
        series = df[col].dropna()
        mean, std = series.mean(), series.std()
        if std == 0:
            result[col] = pd.Series(False, index=df.index)
        else:
            result[col] = (df[col] - mean).abs() / std > z_thresh
    return result


def get_stats(df: pd.DataFrame, col: str) -> Dict[str, Any]:
    """Descriptive statistics for a column."""
    if col not in df.columns:
        return {}
    series = df[col].dropna()
    if len(series) == 0:
        return {}
    return {
        "count": int(series.count()),
        "missing": int(df[col].isnull().sum()),
        "mean": round(float(series.mean()), 4),
        "std": round(float(series.std()), 4),
        "min": round(float(series.min()), 4),
        "max": round(float(series.max()), 4),
        "median": round(float(series.median()), 4),
        "q25": round(float(series.quantile(0.25)), 4),
        "q75": round(float(series.quantile(0.75)), 4),
    }


def get_all_stats(df: pd.DataFrame, value_cols: List[str]) -> Dict[str, Any]:
    """Get stats for all value columns."""
    return {col: get_stats(df, col) for col in value_cols if col in df.columns}