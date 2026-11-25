const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readRoomInvite(search = window.location.search): string | null {
  const params = new URLSearchParams(search);
  const codes = params.getAll('room');
  if (codes.length !== 1 || !UUID.test(codes[0])) return null;
  return codes[0].toLowerCase();
}

export function buildRoomInvite(
  code: string,
  origin = window.location.origin,
): string {
  if (!UUID.test(code)) throw new Error('Código de sala inválido.');
  const url = new URL('/', origin);
  url.searchParams.set('view', 'real-room');
  url.searchParams.set('room', code.toLowerCase());
  return url.toString();
}

export function clearRoomInvite() {
  const url = new URL(window.location.href);
  url.searchParams.delete('room');
  window.history.replaceState(window.history.state, '', url);
}
