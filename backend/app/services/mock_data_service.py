"""
Mock data service — simulates real-time sensor data from Solvann power plant.

Most values are pure time-based oscillations with small random noise. The
reservoir level is the one exception: it's a small stateful simulation driven
by the turbines' actual water usage, so outflow, environmental cost and
reservoir level all move together instead of being independent random numbers.
"""

import math
import random
import threading
import time
from datetime import datetime
from typing import Any

# ---------------------------------------------------------------------------
# Plant constants
# ---------------------------------------------------------------------------

TURBINE_DEFS = [
    {
        "id": "T-01", "capacity_mw": 55.0, "base_runtime_h": 4521,
        "manufacturer": "Andritz Hydro", "install_year": 2011, "head_m": 142.0,
        "last_maintenance": "2026-03-12", "next_maintenance": "2026-09-12",
    },
    {
        "id": "T-02", "capacity_mw": 55.0, "base_runtime_h": 2103,
        "manufacturer": "Voith Hydro", "install_year": 2018, "head_m": 140.0,
        "last_maintenance": "2026-05-02", "next_maintenance": "2026-11-02",
    },
    {
        "id": "T-03", "capacity_mw": 60.0, "base_runtime_h": 8734,
        "manufacturer": "Andritz Hydro", "install_year": 2004, "head_m": 148.0,
        "last_maintenance": "2026-01-20", "next_maintenance": "2026-07-20",
    },
    {
        "id": "T-04", "capacity_mw": 55.0, "base_runtime_h": 341,
        "manufacturer": "GE Renewable Energy", "install_year": 2025, "head_m": 141.0,
        "last_maintenance": "2026-06-15", "next_maintenance": "2026-12-15",
    },
    {
        "id": "T-05", "capacity_mw": 60.0, "base_runtime_h": 5678,
        "manufacturer": "Voith Hydro", "install_year": 2009, "head_m": 149.0,
        "last_maintenance": "2026-02-28", "next_maintenance": "2026-08-28",
    },
    {
        "id": "T-06", "capacity_mw": 50.0, "base_runtime_h": 1923,
        "manufacturer": "GE Renewable Energy", "install_year": 2019, "head_m": 138.0,
        "last_maintenance": "2026-07-28", "next_maintenance": "2027-01-28",
    },
]

# Realistic operating band: below ~40% of rated capacity, efficiency drops
# and cavitation risk rises, so a running turbine is kept within this range
# rather than allowed to idle arbitrarily low.
TURBINE_MIN_LOAD_PCT = 40.0
TURBINE_MAX_LOAD_PCT = 100.0
TURBINE_DEFAULT_LOAD_PCT = 85.0
TURBINE_CONTROLLABLE_STATUSES = ("RUNNING", "STANDBY", "OFFLINE", "PUMPING")
TURBINE_LOAD_CAPABLE_STATUSES = ("RUNNING", "PUMPING")

# Round-trip efficiency of running a turbine in reverse as a pump: pumping a
# given flow back uphill costs more grid power than generating from the same
# flow downhill would yield, and lifts less water per MW than that.
TURBINE_PUMP_EFFICIENCY = 0.75

# Initial statuses — T-04 on standby, T-06 under maintenance. Mutable at
# runtime via set_turbine_control(), guarded by _turbine_lock. This is a
# simple manual control model (no ramp rates, automatic optimization or
# capacity goals) — a deliberate starting point for later improvement.
_turbine_lock = threading.Lock()
_turbine_state: dict[str, dict[str, Any]] = {
    "T-01": {"status": "RUNNING", "load_pct": TURBINE_DEFAULT_LOAD_PCT},
    "T-02": {"status": "RUNNING", "load_pct": TURBINE_DEFAULT_LOAD_PCT},
    "T-03": {"status": "RUNNING", "load_pct": TURBINE_DEFAULT_LOAD_PCT},
    "T-04": {"status": "STANDBY", "load_pct": TURBINE_DEFAULT_LOAD_PCT},
    "T-05": {"status": "RUNNING", "load_pct": TURBINE_DEFAULT_LOAD_PCT},
    "T-06": {"status": "MAINTENANCE", "load_pct": TURBINE_DEFAULT_LOAD_PCT},
}


class TurbineControlError(ValueError):
    """Raised when a requested turbine control change is invalid."""


PANEL_COUNT = 10_000
PANEL_PEAK_KW = 0.40  # 400 W per panel

_START_TIME = time.time()

# Effective reservoir volume (m³) used to convert an inflow/outflow imbalance
# into a rate of level change, plus a gentle long-term pull back towards a
# baseline (representing seasonal inflow/operational adjustments) so the
# level responds to turbine usage without permanently draining to zero.
RESERVOIR_CAPACITY_M3 = 1_800_000.0
RESERVOIR_BASELINE_PCT = 50.0
RESERVOIR_REVERSION_RATE = 0.0002  # fraction of the gap to baseline per second

# Below this, continued full-scale operation risks breaching the license's
# ecological minimum flow requirement (see SYS_RESERVOIR_MIN in Settings) as
# the reservoir keeps draining faster than it refills. This is where head loss
# starts capping deliverable power (see _head_derate_factor) — falling water
# level means falling head/pressure.
RESERVOIR_LOW_LEVEL_WARNING_PCT = 50.0
RESERVOIR_HEAD_DERATE_FLOOR = 0.5  # at 0% level, output falls to this fraction of nominal

# A rain event occasionally boosts Tilsig well above the normal baseline for
# a while, then tapers back off — a simplified stand-in for weather.
RAIN_EVENT_BUCKET_S = 600.0  # length of one candidate rain "episode"
RAIN_EVENT_CHANCE = 0.25  # probability any given bucket is a rain event
RAIN_EVENT_BOOST_MIN_M3S = 15.0
RAIN_EVENT_BOOST_MAX_M3S = 45.0

_level_pct = RESERVOIR_BASELINE_PCT
_last_reservoir_update = _START_TIME
_reservoir_lock = threading.Lock()

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


PEAK_HOURS = {7, 8, 9, 17, 18, 19}


def _market_price_base_for_hour(h: int) -> float:
    """Base NOK/MWh for a given hour-of-day (roughly NO5-scale): peaks at
    07-09 and 17-19 (see PEAK_HOURS), cheapest overnight."""
    if h in PEAK_HOURS:
        return 560.0 if h <= 9 else 500.0
    if h >= 22 or h <= 5:
        return 150.0
    return 350.0


def _market_price_base() -> float:
    return _market_price_base_for_hour(datetime.now().hour)


def _turbine_production(capacity_mw: float, status: str, load_pct: float) -> float:
    """Production follows the operator-set load, capped by head derate at low
    reservoir levels — no automatic optimization. PUMPING draws grid power
    instead of producing it, so it's returned as negative."""
    if status == "RUNNING":
        target = capacity_mw * (load_pct / 100.0) * _head_derate_factor(_level_pct)
        return max(0.0, round(target + _noise(capacity_mw * 0.01), 2))
    if status == "PUMPING":
        target = capacity_mw * (load_pct / 100.0) / TURBINE_PUMP_EFFICIENCY
        return min(0.0, round(-target + _noise(capacity_mw * 0.01), 2))
    return 0.0


def _turbine_bearing_temp(status: str) -> float:
    if status not in ("RUNNING", "PUMPING"):
        return round(18.0 + _noise(1.0), 1)
    return round(_osc(58.0, 4.0, 180) + _noise(1.5), 1)


def _turbine_vibration(status: str) -> float:
    if status not in ("RUNNING", "PUMPING"):
        return round(max(0.0, 0.1 + _noise(0.05)), 2)
    return round(max(0.0, _osc(2.2, 0.6, 90) + _noise(0.3)), 2)


def _turbine_flow(capacity_mw: float, status: str, load_pct: float) -> float:
    """Flow follows load linearly — a simplified stand-in for a real turbine's
    head/efficiency curve (a good target for later improvement). Negative while
    PUMPING: water is returned to the reservoir instead of drawn from it, so
    this directly offsets Avløp/outflow (see _total_turbine_outflow)."""
    if status == "RUNNING":
        target = capacity_mw * 0.78 * (load_pct / 100.0)
        return round(max(0.0, target + _noise(capacity_mw * 0.01)), 2)
    if status == "PUMPING":
        target = capacity_mw * 0.78 * (load_pct / 100.0) * TURBINE_PUMP_EFFICIENCY
        return min(0.0, round(-target + _noise(capacity_mw * 0.01), 2))
    return 0.0



def _head_derate_factor(level_pct: float) -> float:
    """Falling reservoir level reduces net head, which caps how much power a
    turbine can deliver for a given load setting (P ~ Q * H). Flow/Avløp is
    unaffected — only production drops, which is the realistic incentive to
    throttle back and let the reservoir recover."""
    if level_pct >= RESERVOIR_LOW_LEVEL_WARNING_PCT:
        return 1.0
    frac = max(0.0, level_pct) / RESERVOIR_LOW_LEVEL_WARNING_PCT
    return RESERVOIR_HEAD_DERATE_FLOOR + (1.0 - RESERVOIR_HEAD_DERATE_FLOOR) * frac


def _rain_boost_m3s() -> float:
    """Occasionally simulate a rain event that temporarily raises Tilsig well
    above the normal baseline, ramping smoothly in and out within one bucket
    so there's no discontinuity at the edges."""
    now = _t()
    bucket = int(now // RAIN_EVENT_BUCKET_S)
    rng = random.Random(bucket)
    if rng.random() > RAIN_EVENT_CHANCE:
        return 0.0
    boost = rng.uniform(RAIN_EVENT_BOOST_MIN_M3S, RAIN_EVENT_BOOST_MAX_M3S)
    phase = (now % RAIN_EVENT_BUCKET_S) / RAIN_EVENT_BUCKET_S
    ramp = math.sin(math.pi * phase)  # 0 at the bucket's edges, 1 in the middle
    return boost * ramp


def _total_turbine_outflow() -> float:
    """Avløp — net water flow through all turbines (m³/s). Running turbines add
    to it, PUMPING turbines subtract (return water to the reservoir instead),
    so this can go negative if pumping outweighs generation."""
    total = 0.0
    for defn in TURBINE_DEFS:
        state = _turbine_state[defn["id"]]
        total += _turbine_flow(defn["capacity_mw"], state["status"], state["load_pct"])
    return total


def set_turbine_control(
    turbine_id: str, status: str | None = None, load_pct: float | None = None
) -> dict[str, Any] | None:
    """Apply an operator control change to a turbine.

    Deliberately simple manual control — no ramp rates, automatic
    optimization or capacity goals — meant as a starting point to build on.
    Returns the updated turbine detail, or None if `turbine_id` is unknown.
    """
    if turbine_id not in _turbine_state:
        return None

    with _turbine_lock:
        state = _turbine_state[turbine_id]
        current_status = state["status"]

        if current_status == "MAINTENANCE":
            raise TurbineControlError("Turbinen er under vedlikehold og kan ikke fjernstyres.")

        new_status = current_status if status is None else status
        if new_status == "MAINTENANCE":
            raise TurbineControlError("Vedlikeholdsstatus kan ikke settes fra fjernkontrollen.")
        if new_status not in TURBINE_CONTROLLABLE_STATUSES:
            raise TurbineControlError(f"Ugyldig status: {status!r}")

        if load_pct is not None:
            if new_status not in TURBINE_LOAD_CAPABLE_STATUSES:
                raise TurbineControlError("Last kan bare settes når turbinen er i drift eller pumper.")
            try:
                load_pct = float(load_pct)
            except (TypeError, ValueError):
                raise TurbineControlError("Last må være et tall.") from None
            if not (TURBINE_MIN_LOAD_PCT <= load_pct <= TURBINE_MAX_LOAD_PCT):
                raise TurbineControlError(
                    f"Last må være mellom {TURBINE_MIN_LOAD_PCT:.0f}% og "
                    f"{TURBINE_MAX_LOAD_PCT:.0f}% (under dette bør turbinen settes i standby)."
                )
            state["load_pct"] = load_pct
        elif new_status in TURBINE_LOAD_CAPABLE_STATUSES and state["status"] not in TURBINE_LOAD_CAPABLE_STATUSES:
            state["load_pct"] = max(state["load_pct"], TURBINE_MIN_LOAD_PCT)

        state["status"] = new_status

    return get_turbine(turbine_id)


def _advance_reservoir_level(outflow_m3s: float, inflow_m3s: float) -> float:
    """Integrate the reservoir level using real elapsed time, so higher outflow
    drains it faster and higher inflow fills it faster — not independent numbers."""
    global _level_pct, _last_reservoir_update
    with _reservoir_lock:
        now = _t()
        dt = max(0.0, min(now - _last_reservoir_update, 300.0))  # cap against long gaps
        net_m3s = inflow_m3s - outflow_m3s
        flow_change_pct = (net_m3s / RESERVOIR_CAPACITY_M3) * 100.0 * dt
        reversion_pct = (RESERVOIR_BASELINE_PCT - _level_pct) * RESERVOIR_REVERSION_RATE * dt
        _level_pct = max(0.0, min(100.0, _level_pct + flow_change_pct + reversion_pct + _noise(0.03)))
        _last_reservoir_update = now
        return _level_pct


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def get_turbines() -> list[dict[str, Any]]:
    elapsed_h = (_t() - _START_TIME) / 3600.0
    result = []
    for defn in TURBINE_DEFS:
        state = _turbine_state[defn["id"]]
        status = state["status"]
        load_pct = state["load_pct"]
        result.append(
            {
                "id": defn["id"],
                "status": status,
                "load_pct": load_pct,
                "production_mw": _turbine_production(defn["capacity_mw"], status, load_pct),
                "pump_mode": status == "PUMPING",
                "runtime_h": round(defn["base_runtime_h"] + elapsed_h, 1),
                "capacity_mw": defn["capacity_mw"],
            }
        )
    return result


def get_turbine(turbine_id: str) -> dict[str, Any] | None:
    """Extended detail for a single turbine, including maintenance and sensor data."""
    elapsed_h = (_t() - _START_TIME) / 3600.0
    for defn in TURBINE_DEFS:
        if defn["id"] != turbine_id:
            continue
        state = _turbine_state[turbine_id]
        status = state["status"]
        load_pct = state["load_pct"]
        return {
            "id": defn["id"],
            "label": defn["id"],
            "status": status,
            "load_pct": load_pct,
            "production_mw": _turbine_production(defn["capacity_mw"], status, load_pct),
            "capacity_mw": defn["capacity_mw"],
            "pump_mode": status == "PUMPING",
            "runtime_h": round(defn["base_runtime_h"] + elapsed_h, 1),
            "manufacturer": defn["manufacturer"],
            "install_year": defn["install_year"],
            "head_m": defn["head_m"],
            "flow_m3s": _turbine_flow(defn["capacity_mw"], status, load_pct),
            "bearing_temp_c": _turbine_bearing_temp(status),
            "vibration_mm_s": _turbine_vibration(status),
            "last_maintenance": defn["last_maintenance"],
            "next_maintenance": defn["next_maintenance"],
        }
    return None


def get_reservoir() -> dict[str, Any]:
    inflow = round(max(0.0, _osc(32.0, 6.0, 900, 1.2) + _rain_boost_m3s() + _noise(0.5)), 2)
    outflow = round(_total_turbine_outflow(), 2)
    level = _advance_reservoir_level(outflow_m3s=outflow, inflow_m3s=inflow)
    return {
        "level_pct": round(level, 2),
        "inflow_m3s": inflow,
        "outflow_m3s": outflow,
    }


def get_market() -> dict[str, Any]:
    base = _market_price_base()
    price = _osc(base, 40.0, 300) + _noise(25.0)
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

    active_turbines = sum(1 for t in turbines if t["status"] in ("RUNNING", "PUMPING"))
    total_water_mw = sum(t["production_mw"] for t in turbines)
    total_mw = total_water_mw + solar["production_kw"] / 1000.0

    # Environmental cost: proportional to outflow above minimum ecological flow (15 m³/s),
    # scaled to stay a meaningful ~10-20% of revenue now that prices are at realistic NOK/MWh levels
    env_rate = 90.0  # NOK per m³/s of excess outflow, per hour
    excess_outflow = max(0.0, reservoir["outflow_m3s"] - 15.0)
    environmental_cost = round(excess_outflow * env_rate, 0)

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


def get_daily_report() -> dict[str, Any]:
    """Daglig driftsrapport — a management-facing daily summary.

    There's no persisted daily history here (see history_service for the
    Postgres-backed snapshot log); this projects the plant's *current*
    instantaneous state across a full 24h day, and reasons about "today"
    using the known peak-price schedule (PEAK_HOURS) rather than an actual
    hour-by-hour log. Good enough for a live operations snapshot, not a
    substitute for real historical aggregation.
    """
    turbines = get_turbines()
    reservoir = get_reservoir()
    market = get_market()
    solar = get_solar()

    running = [t for t in turbines if t["status"] == "RUNNING"]
    standby = [t for t in turbines if t["status"] == "STANDBY"]
    maintenance = [t for t in turbines if t["status"] == "MAINTENANCE"]
    active_count = sum(1 for t in turbines if t["status"] in ("RUNNING", "PUMPING"))

    solar_mw = solar["production_kw"] / 1000.0
    total_mw = sum(t["production_mw"] for t in turbines) + solar_mw

    excess_outflow = max(0.0, reservoir["outflow_m3s"] - 15.0)
    env_cost_h = round(excess_outflow * 90.0, 0)
    revenue_h = round(total_mw * market["price_nok_mwh"], 0)
    revenue_day = round(revenue_h * 24.0, 0)
    env_cost_day = round(env_cost_h * 24.0, 0)

    # Today's price curve: known intraday shape (see _market_price_base_for_hour)
    # shifted by the current live oscillation/noise offset, held constant.
    current_hour = datetime.now().hour
    offset = market["price_nok_mwh"] - _market_price_base_for_hour(current_hour)
    hourly_prices = [
        max(0.0, _market_price_base_for_hour(h) + offset) for h in range(24)
    ]

    peak_hours_count = len(PEAK_HOURS)
    derate = _head_derate_factor(reservoir["level_pct"])

    standby_ids = {t["id"] for t in standby}
    standby_capacity_mw = sum(
        defn["capacity_mw"] for defn in TURBINE_DEFS if defn["id"] in standby_ids
    )
    standby_lost_revenue = round(
        standby_capacity_mw
        * (TURBINE_DEFAULT_LOAD_PCT / 100.0)
        * derate
        * market["price_nok_mwh"]
        * peak_hours_count,
        0,
    )

    # "Underproduction" = running below rated output specifically because low
    # reservoir level is capping head/pressure (_head_derate_factor), not just
    # running below 100% load (85% is the normal operating target).
    underproduction_hours = peak_hours_count if derate < 1.0 else 0
    load_frac = TURBINE_DEFAULT_LOAD_PCT / 100.0
    running_shortfall_mw = sum(
        t["capacity_mw"] * load_frac * (1.0 - derate) for t in running
    )
    optimization_loss = round(
        running_shortfall_mw * market["price_nok_mwh"] * underproduction_hours, 0
    )

    env_hours_with_cost = 24 if env_cost_h > 0 else 0

    return {
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "production": {
            "total_energy_mwh": round(total_mw * 24.0, 1),
            "solar_energy_mwh": round(solar_mw * 24.0, 1),
            "active_turbines": active_count,
            "total_turbines": len(turbines),
            "standby_or_maintenance_turbines": len(standby) + len(maintenance),
            "avg_reservoir_level_pct": reservoir["level_pct"],
        },
        "economy": {
            "gross_revenue_nok": revenue_day,
            "total_environmental_cost_nok": env_cost_day,
            "net_result_nok": revenue_day - env_cost_day,
            "avg_spot_price_nok_mwh": round(sum(hourly_prices) / len(hourly_prices), 1),
            "high_spot_price_nok_mwh": round(max(hourly_prices), 1),
            "low_spot_price_nok_mwh": round(min(hourly_prices), 1),
        },
        "decision_analysis": {
            "standby_turbine_ids": [t["id"] for t in standby],
            "standby_lost_revenue_nok": standby_lost_revenue,
            "standby_should_run_hours": peak_hours_count if standby else 0,
            "peak_underproduction_hours": underproduction_hours,
            "price_optimization_loss_nok": optimization_loss,
            "net_deviation_nok": standby_lost_revenue + optimization_loss,
        },
        "environment": {
            "hours_with_environmental_cost": env_hours_with_cost,
            "hours_without_environmental_cost": 24 - env_hours_with_cost,
            "total_environmental_cost_nok": env_cost_day,
            "avg_outflow_m3s": reservoir["outflow_m3s"],
        },
    }
