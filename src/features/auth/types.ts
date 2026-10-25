export type LoginRequest = { email: string; senha: string };
export type RegisterRequest = LoginRequest & { nome: string };
export type LoginResponse = { token: string; tipo: 'Bearer'; expiraEm: number };
export type UserResponse = {
  id: string;
  nome: string;
  email: string;
  perfil: 'USUARIO' | 'ADMIN';
  moedas: number;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
};
export type AuthSession = { token: string; email: string; expiresAt: number };
