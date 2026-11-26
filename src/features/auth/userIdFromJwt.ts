const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function userIdFromJwt(jwt: string): string | null {
  // A identidade e as permissões são verificadas pelo backend.
  try {
    const segment = jwt.split('.')[1];
    if (!segment) return null;
    const value = segment.replace(/-/g, '+').replace(/_/g, '/');
    const parsed: unknown = JSON.parse(atob(value));
    if (!parsed || typeof parsed !== 'object' || !('usuarioId' in parsed))
      return null;
    const id = (parsed as { usuarioId: unknown }).usuarioId;
    return typeof id === 'string' && UUID.test(id) ? id : null;
  } catch {
    return null;
  }
}
