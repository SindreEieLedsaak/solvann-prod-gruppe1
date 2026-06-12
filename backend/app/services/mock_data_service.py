"""
Mock data service — simulates real-time sensor data from Solvann power plant.

Uses time-based oscillations and small random noise so values change naturally
on every call without requiring persistent state or a real database.
"""

import math
import random
import time
from datetime import datetime
from typing import Any

# ---------------------------------------------------------------------------
# Plant constants
# ---------------------------------------------------------------------------

TURBINE_DEFS = [
    {"id": "T-01", "capacity_mw": 55.0, "base_runtime_h": 4521},
    {"id": "T-02", "capacity_mw": 55.0, "base_runtime_h": 2103},
    {"id": "T-03", "capacity_mw": 60.0, "base_runtime_h": 8734},
    {"id": "T-04", "capacity_mw": 55.0, "base_runtime_h": 341},
    {"id": "T-05", "capacity_mw": 60.0, "base_runtime_h": 5678},
    {"id": "T-06", "capacity_mw": 50.0, "base_runtime_h": 1923},
]

# Fixed statuses — T-04 on standby, T-06 under maintenance
TURBINE_STATUSES = ["RUNNING", "RUNNING", "RUNNING", "STANDBY", "RUNNING", "MAINTENANCE"]

PANEL_COUNT = 10_000
PANEL_PEAK_KW = 0.40  # 400 W per panel

_START_TIME = time.time()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _t() -> float:
    return time.time()


def _osc(base: float, amp: float, period_s: float, phase: float = 0.0) -> float:
    """Sinusoidal oscillation around `base`."""
    return base + amp * math.sin(2 * math.pi * _t() / period_s + phase)


def _noise(amplitude: float) -> float:
    return random.uniform(-amplitude, amplitude)


def _solar_factor() -> float:
    """0–1 day/night cycle based on current local time (sunrise 06:00, sunset 20:00)."""
    now = datetime.now()
    h = now.hour + now.minute / 60.0
    if 6.0 <= h <= 20.0:
        return max(0.0, math.sin(math.pi * (h - 6.0) / 14.0))
    return 0.0


def _market_price_base() -> float:
    """Simulate Norwegian spot-price pattern: peaks at 07–09 and 17–19."""
    h = datetime.now().hour
    if 7 <= h <= 9:
        return 96.0
    if 17 <= h <= 19:
        return 89.0
    if h >= 22 or h <= 5:
        return 43.0
    return 68.5


def _turbine_production(capacity_mw: float, status: str) -> float:
    if status in ("STANDBY", "MAINTENANCE", "OFFLINE"):
        return 0.0
    base = capacity_mw * 0.87
    amp = capacity_mw * 0.05
    prod = _osc(base, amp, 120, hash(status) % 7) + _noise(capacity_mw * 0.015)
    return max(0.0, round(prod, 2))


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def get_turbines() -> list[dict[str, Any]]:
    elapsed_h = (_t() - _START_TIME) / 3600.0
    result = []
    for i, defn in enumerate(TURBINE_DEFS):
        status = TURBINE_STATUSES[i]
        result.append(
            {
                "id": defn["id"],
                "status": status,
                "production_mw": _turbine_production(defn["capacity_mw"], status),
                "pump_mode": False,
                "runtime_h": round(defn["base_runtime_h"] + elapsed_h, 1),
                "capacity_mw": defn["capacity_mw"],
            }
        )
    return result


def get_reservoir() -> dict[str, Any]:
    level = _osc(72.0, 4.5, 3600) + _noise(0.3)
    inflow = _osc(32.0, 6.0, 900, 1.2) + _noise(0.5)
    outflow = _osc(46.0, 8.0, 600, 0.5) + _noise(0.8)
    return {
        "level_pct": round(max(0.0, min(100.0, level)), 2),
        "inflow_m3s": round(max(0.0, inflow), 2),
        "outflow_m3s": round(max(0.0, outflow), 2),
    }


def get_market() -> dict[str, Any]:
    base = _market_price_base()
    price = _osc(base, 5.0, 300) + _noise(2.0)
    price = max(0.0, round(price, 2))
    h = datetime.now().hour
    if 7 <= h <= 9 or 17 <= h <= 19:
        status = "PEAK"
    elif h >= 22 or h <= 5:
        status = "LOW"
    else:
        status = "NORMAL"
    return {
        "price_nok_mwh": price,
        "status": status,
        "timestamp": datetime.now().isoformat(timespec="seconds"),
    }


def get_solar() -> dict[str, Any]:
    factor = _solar_factor()
    max_kw = PANEL_COUNT * PANEL_PEAK_KW
    prod = _osc(max_kw * factor, max_kw * 0.03 * factor, 60) + _noise(max_kw * 0.01)
    prod = max(0.0, round(prod, 1))
    efficiency = 18.5 + _noise(0.3)
    return {
        "production_kw": prod,
        "panel_count": PANEL_COUNT,
        "efficiency_pct": round(efficiency, 2),
    }


def get_overview() -> dict[str, Any]:
    turbines = get_turbines()
    reservoir = get_reservoir()
    market = get_market()
    solar = get_solar()

    active_turbines = sum(1 for t in turbines if t["status"] == "RUNNING")
    total_water_mw = sum(t["production_mw"] for t in turbines)
    total_mw = total_water_mw + solar["production_kw"] / 1000.0

    # Environmental cost: proportional to outflow above minimum ecological flow (15 m³/s)
    env_rate = 1.80  # NOK per m³/s above ecological minimum, per hour concept
    excess_outflow = max(0.0, reservoir["outflow_m3s"] - 15.0)
    environmental_cost = round(excess_outflow * env_rate * 3600, 0)

    revenue = round(total_mw * market["price_nok_mwh"], 0)

    plant_status = {
        "total_production_mw": round(total_mw, 2),
        "revenue_nok_h": revenue,
        "environmental_cost_nok_h": environmental_cost,
        "water_inflow_m3s": reservoir["inflow_m3s"],
        "reservoir_level_pct": reservoir["level_pct"],
        "active_turbines": active_turbines,
        "total_turbines": len(turbines),
    }

    return {
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "plant_status": plant_status,
        "turbines": turbines,
        "reservoir": reservoir,
        "market": market,
        "solar": solar,
    }
