import { API_BASE_URL, ApiError } from './http';
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
    throw new ApiError(
      response.status,
      'Não foi possível consultar o serviço.',
    );
  }

  return response.json() as Promise<HealthResponse>;
}
