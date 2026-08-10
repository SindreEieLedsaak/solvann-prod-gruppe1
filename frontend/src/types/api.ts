// Shared API types — keep in sync with the Flask backend response shapes

export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
}

export interface Item {
  id: string;
  name: string;
  description: string;
}

export interface ItemsResponse {
  items: Item[];
  total: number;
}

export interface CreateItemRequest {
  name: string;
  description?: string;
}

export interface ApiError {
  error: string;
  message?: string;
}
