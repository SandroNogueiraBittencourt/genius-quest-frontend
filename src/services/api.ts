import { API_BASE_URL } from './http';
export type HealthResponse = {
  status: string;
  application: string;
  timestamp: string;
};

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Falha ao consultar a API: HTTP ${response.status}`);
  }

  return response.json() as Promise<HealthResponse>;
}
