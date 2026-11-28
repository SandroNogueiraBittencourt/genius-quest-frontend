import { ApiError, apiRequest } from '../../services/http';
import { authenticatedRequest } from './authenticatedRequest';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  UserResponse,
} from './types';
export async function requestPasswordReset(
  email: string,
  signal?: AbortSignal,
): Promise<void> {
  await apiRequest<unknown>('/auth/esqueci-senha', {
    method: 'POST',
    json: { email: email.trim().toLowerCase() },
    signal,
  });
}
export async function resetPassword(
  token: string,
  novaSenha: string,
  signal?: AbortSignal,
): Promise<void> {
  await apiRequest<void>('/auth/redefinir-senha', {
    method: 'POST',
    json: { token, novaSenha },
    signal,
  });
}
export async function verifyEmail(
  email: string,
  codigo: string,
  signal?: AbortSignal,
): Promise<void> {
  await apiRequest<void>('/auth/verificar-email', {
    method: 'POST',
    json: { email: email.trim().toLowerCase(), codigo },
    signal,
  });
}

export async function resendEmailVerification(
  email: string,
  signal?: AbortSignal,
): Promise<void> {
  await apiRequest<void>('/auth/reenviar-verificacao', {
    method: 'POST',
    json: { email: email.trim().toLowerCase() },
    signal,
    allowEmptyAccepted: true,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function parseLoginResponse(data: unknown): LoginResponse {
  if (
    !isRecord(data) ||
    typeof data.token !== 'string' ||
    !data.token.trim() ||
    data.tipo !== 'Bearer' ||
    typeof data.expiraEm !== 'number' ||
    !Number.isSafeInteger(data.expiraEm) ||
    data.expiraEm <= 0 ||
    !Number.isSafeInteger(Date.now() + data.expiraEm * 1000)
  )
    throw new ApiError(
      502,
      'A API retornou uma sessão inválida. Tente entrar novamente.',
    );
  return data as LoginResponse;
}
export async function login(
  request: LoginRequest,
  signal?: AbortSignal,
): Promise<LoginResponse> {
  const data = await apiRequest<unknown>('/auth/login', {
    method: 'POST',
    json: { email: request.email.trim().toLowerCase(), senha: request.senha },
    includeCookies: true,
    signal,
  });
  return parseLoginResponse(data);
}

export async function restoreSession(signal: AbortSignal) {
  const data = await apiRequest<unknown>('/auth/sessao', {
    method: 'POST',
    json: {},
    includeCookies: true,
    signal,
  });
  const session = parseLoginResponse(data);
  if (!isRecord(data) || typeof data.email !== 'string' || !data.email.trim())
    throw new ApiError(502, 'A API retornou uma sessão inválida.');
  return { session, email: data.email };
}

export async function register(
  request: RegisterRequest,
  signal?: AbortSignal,
): Promise<UserResponse> {
  const data = await apiRequest<unknown>('/usuarios', {
    method: 'POST',
    json: {
      nome: request.nome.trim(),
      email: request.email.trim().toLowerCase(),
      senha: request.senha,
    },
    signal,
  });
  if (
    !isRecord(data) ||
    typeof data.id !== 'string' ||
    typeof data.nome !== 'string' ||
    typeof data.email !== 'string' ||
    !['USUARIO', 'ADMIN'].includes(String(data.perfil)) ||
    typeof data.moedas !== 'number' ||
    typeof data.ativo !== 'boolean' ||
    typeof data.criadoEm !== 'string' ||
    typeof data.atualizadoEm !== 'string'
  )
    throw new ApiError(
      502,
      'Não foi possível confirmar os dados da conta criada. Tente entrar com seu e-mail.',
    );
  return data as UserResponse;
}

/**
 * Solicita ao backend a revogação da sessão atual.
 * Não altera a store: a interface só limpa a sessão após confirmação.
 */
export async function logout(
  token: string,
  signal?: AbortSignal,
): Promise<void> {
  await apiRequest<void>('/auth/logout', {
    method: 'POST',
    token,
    includeCookies: true,
    signal,
  });
}

export async function changePassword(
  userId: string,
  senhaAtual: string,
  novaSenha: string,
  signal: AbortSignal,
): Promise<void> {
  await authenticatedRequest<void>(
    `/usuarios/${encodeURIComponent(userId)}/senha`,
    {
      method: 'PATCH',
      json: { senhaAtual, novaSenha },
      signal,
    },
  );
}

async function requestProfileName(
  userId: string,
  signal: AbortSignal,
  nome?: string,
): Promise<string> {
  const data = await authenticatedRequest<unknown>(
    `/usuarios/${encodeURIComponent(userId)}`,
    nome === undefined
      ? { signal }
      : { method: 'PATCH', json: { nome }, signal },
  );
  if (!isRecord(data) || typeof data.nome !== 'string')
    throw new ApiError(502, 'Não foi possível confirmar o nome da conta.');
  return data.nome;
}

export function getProfileName(userId: string, signal: AbortSignal) {
  return requestProfileName(userId, signal);
}

export function updateProfileName(
  userId: string,
  nome: string,
  signal: AbortSignal,
) {
  return requestProfileName(userId, signal, nome);
}

export async function requestEmailChange(
  userId: string,
  email: string,
  senhaAtual: string,
  signal: AbortSignal,
): Promise<void> {
  await authenticatedRequest<unknown>(
    `/usuarios/${encodeURIComponent(userId)}`,
    {
      method: 'PATCH',
      json: { email, senhaAtual },
      signal,
    },
  );
}

export async function confirmEmailChange(
  codigo: string,
  signal: AbortSignal,
): Promise<void> {
  await authenticatedRequest<void>('/auth/confirmar-troca-email', {
    method: 'POST',
    json: { codigo },
    signal,
  });
}
