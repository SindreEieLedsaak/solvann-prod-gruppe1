import axios, { type AxiosInstance, type AxiosResponse } from 'axios';

// When VITE_API_BASE_URL is unset, requests go to the same origin.
// The Vite dev proxy then forwards /api/* to Flask on port 5000.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

const apiClient: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000,
});

// Surface readable error messages from Flask's JSON error responses
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    const message =
      error.response?.data?.message ??
      error.response?.data?.error ??
      error.message ??
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
