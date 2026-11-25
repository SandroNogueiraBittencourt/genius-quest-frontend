export const passwordHint =
  'Use pelo menos 8 caracteres, com maiúscula, minúscula, número e símbolo.';

export function passwordError(password: string): string | undefined {
  if (!password.trim()) return 'Informe sua senha.';
  if (new TextEncoder().encode(password).length > 72)
    return 'A senha excede o limite de 72 bytes. Use menos caracteres.';
  if (
    [...password].length < 8 ||
    !/\p{Lu}/u.test(password) ||
    !/\p{Ll}/u.test(password) ||
    !/\p{Nd}/u.test(password) ||
    !/[\p{P}\p{S}]/u.test(password)
  )
    return passwordHint;
}
