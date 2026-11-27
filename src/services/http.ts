export const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(
  /\/$/,
  '',
);
const serviceUnavailable =
  'O serviço está indisponível no momento. Tente novamente em instantes.';
const requestFailed =
  'Não foi possível concluir a solicitação. Tente novamente.';
const httpCode = /\bHTTP(?:\s*\/\s*\d(?:\.\d)?)?\s*[:=-]?\s*[1-5]\d{2}\b/i;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly fields: Record<string, string> = {},
  ) {
    super(status >= 500 ? serviceUnavailable : message);
    this.name = 'ApiError';
  }
}
export type ApiOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  json?: unknown;
  token?: string;
  idempotencyKey?: string;
  signal?: AbortSignal;
  allowEmptyAccepted?: boolean;
  includeCookies?: boolean;
};
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export async function apiRequest<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  if (!path.startsWith('/') || path.startsWith('//'))
    throw new Error('Use um caminho relativo à API.');
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.json !== undefined) headers['Content-Type'] = 'application/json';
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.idempotencyKey) {
    if (
      !/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(
        options.idempotencyKey,
      )
    )
      throw new Error('Chave de idempotência inválida.');
    headers['Idempotency-Key'] = options.idempotencyKey;
  }
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body:
        options.json === undefined ? undefined : JSON.stringify(options.json),
      signal: options.signal,
      credentials: options.includeCookies ? 'include' : 'omit',
      cache: 'no-store',
    });
  } catch (error) {
    if (
      options.signal?.aborted ||
      (error instanceof DOMException && error.name === 'AbortError')
    )
      throw error;
    throw new ApiError(
      0,
      'Não foi possível conectar à API. Verifique sua conexão e tente novamente.',
    );
  }
  const text = await response.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = undefined;
  }
  if (!response.ok) {
    const fields: Record<string, string> = {};
    if (record(data) && record(data.campos))
      for (const [key, value] of Object.entries(data.campos))
        if (typeof value === 'string' && !httpCode.test(value))
          fields[key] = value;
    const message =
      record(data) && typeof data.mensagem === 'string'
        ? data.mensagem
        : record(data) && typeof data.erro === 'string'
          ? data.erro
          : requestFailed;
    throw new ApiError(
      response.status,
      httpCode.test(message) ? requestFailed : message,
      response.status >= 500 ? {} : fields,
    );
  }
  if (
    response.status === 204 ||
    (response.status === 202 && !text && options.allowEmptyAccepted)
  )
    return undefined as T;
  if (
    data === undefined ||
    !response.headers
      .get('Content-Type')
      ?.toLowerCase()
      .includes('application/json')
  )
    throw new ApiError(502, serviceUnavailable);
  return data as T;
}
