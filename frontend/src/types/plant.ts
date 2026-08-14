export type TurbineStatus = 'RUNNING' | 'STANDBY' | 'OFFLINE' | 'MAINTENANCE' | 'PUMPING';
export type MarketStatus = 'NORMAL' | 'PEAK' | 'LOW';

export interface Turbine {
  id: string;
  status: TurbineStatus;
  load_pct: number;
  production_mw: number;
  pump_mode: boolean;
  runtime_h: number;
  capacity_mw: number;
}

export interface TurbineDetail extends Turbine {
  label: string;
  manufacturer: string;
  install_year: number;
  head_m: number;
  flow_m3s: number;
  bearing_temp_c: number;
  vibration_mm_s: number;
  last_maintenance: string;
  next_maintenance: string;
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

export interface HistoryPoint {
  timestamp: string;
  total_production_mw: number;
  revenue_nok_h: number;
  environmental_cost_nok_h: number;
  price_nok_mwh: number;
  reservoir_level_pct: number;
}

export interface HistorySummary {
  total_energy_mwh: number;
  total_revenue_nok: number;
  total_environmental_cost_nok: number;
}

export interface PlantHistory {
  hours: number;
  sample_count: number;
  points: HistoryPoint[];
  summary: HistorySummary;
}

export interface HourlyHistoryPoint {
  hour: string;
  avg_production_mw: number;
  energy_mwh: number;
  revenue_nok: number;
  environmental_cost_nok: number;
  avg_price_nok_mwh: number;
  avg_reservoir_level_pct: number;
  sample_count: number;
}

export interface HourlyHistory {
  hours: number;
  hour_count: number;
  points: HourlyHistoryPoint[];
}

export interface DailyReportProduction {
  total_energy_mwh: number;
  solar_energy_mwh: number;
  active_turbines: number;
  total_turbines: number;
  standby_or_maintenance_turbines: number;
  avg_reservoir_level_pct: number;
}

export interface DailyReportEconomy {
  gross_revenue_nok: number;
  total_environmental_cost_nok: number;
  net_result_nok: number;
  avg_spot_price_nok_mwh: number;
  high_spot_price_nok_mwh: number;
  low_spot_price_nok_mwh: number;
}

export interface DailyReportDecisionAnalysis {
  standby_turbine_ids: string[];
  standby_lost_revenue_nok: number;
  standby_should_run_hours: number;
  peak_underproduction_hours: number;
  price_optimization_loss_nok: number;
  net_deviation_nok: number;
}

export interface DailyReportEnvironment {
  hours_with_environmental_cost: number;
  hours_without_environmental_cost: number;
  total_environmental_cost_nok: number;
  avg_outflow_m3s: number;
}

export interface DailyReport {
  timestamp: string;
  production: DailyReportProduction;
  economy: DailyReportEconomy;
  decision_analysis: DailyReportDecisionAnalysis;
  environment: DailyReportEnvironment;
}
