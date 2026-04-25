"""
Generate sample time-series datasets for testing the cleaning system.
Run: python generate_samples.py
"""
import pandas as pd
import numpy as np

np.random.seed(42)

# ---- Sample 1: Temperature sensor with gaps ----
timestamps = pd.date_range("2024-01-01", periods=200, freq="10min")
values = 20 + 5 * np.sin(np.linspace(0, 4 * np.pi, 200)) + np.random.normal(0, 0.8, 200)

# Introduce random missing values
drop_idx = np.random.choice(range(200), size=30, replace=False)
values[drop_idx] = np.nan

# Introduce irregular gaps (remove some rows entirely)
keep_mask = np.ones(200, dtype=bool)
keep_mask[50:60] = False
keep_mask[120:125] = False

df1 = pd.DataFrame({
    "timestamp": timestamps[keep_mask],
    "value": values[keep_mask]
})
df1.to_csv("sample_data/temperature_sensor.csv", index=False)
print(f"✅ temperature_sensor.csv — {len(df1)} rows, {df1['value'].isnull().sum()} missing values")

# ---- Sample 2: Stock price (hourly) ----
timestamps2 = pd.date_range("2024-01-01 09:00", periods=300, freq="1h")
price = 150 + np.cumsum(np.random.randn(300) * 0.5)
volume = np.random.randint(1000, 5000, 300).astype(float)

# Missing stretches
price[80:90] = np.nan
volume[80:90] = np.nan
price[200] = np.nan

df2 = pd.DataFrame({
    "timestamp": timestamps2,
    "value": price,
    "volume": volume
})
df2.to_csv("sample_data/stock_price.csv", index=False)
print(f"✅ stock_price.csv — {len(df2)} rows, {df2['value'].isnull().sum()} missing values")

# ---- Sample 3: IoT energy consumption (1min) ----
timestamps3 = pd.date_range("2024-03-01", periods=500, freq="1min")
base = 100 + 50 * np.sin(np.linspace(0, 10 * np.pi, 500))
noise = np.random.exponential(scale=5, size=500)
energy = base + noise

# Spike outliers
energy[100] = 800
energy[250] = -50
energy[400] = 750

# Gaps
energy[150:165] = np.nan

df3 = pd.DataFrame({
    "timestamp": timestamps3,
    "value": energy
})
df3.to_csv("sample_data/energy_consumption.csv", index=False)
print(f"✅ energy_consumption.csv — {len(df3)} rows, {df3['value'].isnull().sum()} missing values")

print("\n✅ All sample datasets created in sample_data/")
