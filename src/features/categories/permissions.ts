import { readTokenClaims } from '../auth/claims';

// Usado apenas para apresentação. O backend autoriza as operações.
export function hasAdminClaim(token: string): boolean {
  return readTokenClaims(token)?.perfil === 'ADMIN';
}
