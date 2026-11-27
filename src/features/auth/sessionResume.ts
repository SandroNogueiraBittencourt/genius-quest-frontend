import { userIdFromJwt } from './userIdFromJwt';

const KEY = 'gq-session-user';

export function readSessionUser(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function forgetSessionUser() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // A sessão ainda pode ser encerrada quando o armazenamento está bloqueado.
  }
}

export function rememberSessionUser(token: string) {
  const userId = userIdFromJwt(token);
  if (!userId) {
    forgetSessionUser();
    return;
  }
  try {
    sessionStorage.setItem(KEY, userId.toLowerCase());
  } catch {
    // O login em memória segue disponível.
  }
}
