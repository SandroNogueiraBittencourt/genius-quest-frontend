/**
 * Exclusivamente para apresentação da navegação.
 * O backend é a única autoridade para autorizar operações ADMIN.
 */
export function hasAdminClaim(token: string): boolean {
  try {
    const payload = token.split('.')[1];
    if (!payload) return false;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const data: unknown = JSON.parse(atob(normalized));
    return (
      typeof data === 'object' &&
      data !== null &&
      'perfil' in data &&
      data.perfil === 'ADMIN'
    );
  } catch {
    return false;
  }
}
