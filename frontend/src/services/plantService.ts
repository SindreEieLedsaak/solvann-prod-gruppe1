import apiClient from './api';
import type {
  PlantOverview,
  Turbine,
  TurbineDetail,
  TurbineStatus,
  ReservoirData,
  MarketData,
  SolarData,
  PlantHistory,
  HourlyHistory,
} from '../types/plant';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api`;

export const plantService = {
  async getOverview(): Promise<PlantOverview> {
    const res = await apiClient.get<PlantOverview>('/plant/overview');
    return res.data;
  },

  async getHistory(hours = 24): Promise<PlantHistory> {
    const res = await apiClient.get<PlantHistory>('/plant/history', { params: { hours } });
    return res.data;
  },

  async getHourlyHistory(hours = 24): Promise<HourlyHistory> {
    const res = await apiClient.get<HourlyHistory>('/plant/history/hourly', { params: { hours } });
    return res.data;
  },

  /** URL for the CSV export endpoint — use directly as a download link href. */
  getHistoryExportUrl(hours = 24, resolution: 'hourly' | 'raw' = 'hourly'): string {
    return `${API_BASE_URL}/plant/history/export?hours=${hours}&resolution=${resolution}`;
  },

  async getTurbines(): Promise<Turbine[]> {
    const res = await apiClient.get<{ turbines: Turbine[] }>('/turbines');
    return res.data.turbines;
  },

  async getTurbine(id: string): Promise<TurbineDetail> {
    const res = await apiClient.get<TurbineDetail>(`/turbines/${id}`);
    return res.data;
  },

  async setTurbineControl(
    id: string,
    payload: { status?: TurbineStatus; load_pct?: number }
  ): Promise<TurbineDetail> {
    const res = await apiClient.patch<TurbineDetail>(`/turbines/${id}`, payload);
    return res.data;
  },

  async getReservoir(): Promise<ReservoirData> {
    const res = await apiClient.get<ReservoirData>('/reservoir');
    return res.data;
  },

  async getMarket(): Promise<MarketData> {
    const res = await apiClient.get<MarketData>('/market');
    return res.data;
  },

  async getSolar(): Promise<SolarData> {
    const res = await apiClient.get<SolarData>('/solar');
    return res.data;
  },
};
