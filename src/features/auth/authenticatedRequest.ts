import { ApiError, apiRequest, type ApiOptions } from '../../services/http';
import { useAuthStore } from './store';
export async function authenticatedRequest<T>(
  path: string,
  options: Omit<ApiOptions, 'token'> = {},
): Promise<T> {
  const session = useAuthStore.getState().session;
  if (!session) throw new ApiError(401, 'Entre na sua conta para continuar.');
  if (session.expiresAt <= Date.now()) {
    useAuthStore.getState().end('expired', session.token);
    throw new ApiError(401, 'Sua sessão expirou. Entre novamente.');
  }
  try {
    return await apiRequest<T>(path, { ...options, token: session.token });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401)
      useAuthStore.getState().end('unauthorized', session.token);
    throw error;
  }
}
