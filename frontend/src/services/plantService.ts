import apiClient from './api';
import type { PlantOverview, Turbine, ReservoirData, MarketData, SolarData } from '../types/plant';

export const plantService = {
  async getOverview(): Promise<PlantOverview> {
    const res = await apiClient.get<PlantOverview>('/plant/overview');
    return res.data;
  },

  async getTurbines(): Promise<Turbine[]> {
    const res = await apiClient.get<{ turbines: Turbine[] }>('/turbines');
    return res.data.turbines;
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
