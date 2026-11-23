import { validRoomCode } from './realApi';

// Dado não sensível: somente código UUID da sala, por UUID do jogador.
// sessionStorage dura apenas a aba, e não guarda JWT nem email.
const PREFIX = 'gq-real-room-code-v1:';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function chave(jogadorId: string | null): string | null {
  return jogadorId && UUID.test(jogadorId) ? PREFIX + jogadorId.toLowerCase() : null;
}

export function readRoomCode(jogadorId: string | null): string | null {
  const key = chave(jogadorId);
  if (!key) return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return validRoomCode(raw);
  } catch {
    // Storage bloqueado, UUID inválido ou indisponível: segue sem restauração.
    return null;
  }
}

export function rememberRoomCode(jogadorId: string | null, code: string): void {
  const key = chave(jogadorId);
  if (!key) return;
  try {
    sessionStorage.setItem(key, validRoomCode(code));
  } catch {
    // O jogo continua mesmo com storage desativado.
  }
}

export function forgetRoomCode(jogadorId: string | null): void {
  const key = chave(jogadorId);
  if (!key) return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // O jogo continua mesmo com storage desativado.
  }
}
