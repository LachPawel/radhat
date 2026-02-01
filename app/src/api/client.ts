import type {
  HealthResponse,
  ListDepositsResponse,
  CreateDepositRequest,
  CreateDepositResponse,
  RouteResponse,
  DepositInfo,
} from './types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(response.status, text || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  /** Health check */
  health: (): Promise<HealthResponse> => fetchJson(`${API_URL}/health`),

  /** List all deposits */
  listDeposits: (): Promise<ListDepositsResponse> => fetchJson(`${API_URL}/deposits`),

  /** Get single deposit by address */
  getDeposit: (address: string): Promise<DepositInfo> =>
    fetchJson(`${API_URL}/deposits/${address}`),

  /** Create new deposit address */
  createDeposit: (data: CreateDepositRequest): Promise<CreateDepositResponse> =>
    fetchJson(`${API_URL}/deposit`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Route all funded deposits to treasury */
  routeDeposits: (): Promise<RouteResponse> =>
    fetchJson(`${API_URL}/router`, {
      method: 'POST',
    }),
};

export { ApiError };
