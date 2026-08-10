import apiClient from './api';
import type { Item, CreateItemRequest, ItemsResponse } from '../types/api';

export const itemsService = {
  async getAll(): Promise<Item[]> {
    const response = await apiClient.get<ItemsResponse>('/items');
    return response.data.items;
  },

  async create(payload: CreateItemRequest): Promise<Item> {
    const response = await apiClient.post<Item>('/items', payload);
    return response.data;
  },
};
