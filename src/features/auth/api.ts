import { ApiError, apiRequest } from '../../services/http';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  UserResponse,
} from './types';
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export async function login(
  request: LoginRequest,
  signal?: AbortSignal,
): Promise<LoginResponse> {
  const data = await apiRequest<unknown>('/auth/login', {
    method: 'POST',
    json: { email: request.email.trim().toLowerCase(), senha: request.senha },
    signal,
  });
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
