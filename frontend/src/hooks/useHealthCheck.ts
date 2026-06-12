import { useState, useEffect } from 'react';
import apiClient from '../services/api';
import type { HealthResponse } from '../types/api';

type HealthStatus = 'loading' | 'healthy' | 'unhealthy';

export function useHealthCheck(): HealthStatus {
  const [status, setStatus] = useState<HealthStatus>('loading');

  useEffect(() => {
    apiClient
      .get<HealthResponse>('/health')
      .then((res) => setStatus(res.data.status))
      .catch(() => setStatus('unhealthy'));
  }, []);

  return status;
}
