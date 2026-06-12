export type TurbineStatus = 'RUNNING' | 'STANDBY' | 'OFFLINE' | 'MAINTENANCE';
export type MarketStatus = 'NORMAL' | 'PEAK' | 'LOW';

export interface Turbine {
  id: string;
  status: TurbineStatus;
  production_mw: number;
  pump_mode: boolean;
  runtime_h: number;
  capacity_mw: number;
}

export interface ReservoirData {
  level_pct: number;
  inflow_m3s: number;
  outflow_m3s: number;
}

export interface MarketData {
  price_nok_mwh: number;
  status: MarketStatus;
  timestamp: string;
}

export interface SolarData {
  production_kw: number;
  panel_count: number;
  efficiency_pct: number;
}

export interface PlantStatus {
  total_production_mw: number;
  revenue_nok_h: number;
  environmental_cost_nok_h: number;
  water_inflow_m3s: number;
  reservoir_level_pct: number;
  active_turbines: number;
  total_turbines: number;
}

export interface PlantOverview {
  timestamp: string;
  plant_status: PlantStatus;
  turbines: Turbine[];
  reservoir: ReservoirData;
  market: MarketData;
  solar: SolarData;
}
