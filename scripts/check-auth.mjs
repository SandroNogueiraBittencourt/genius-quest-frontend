import { randomBytes, randomUUID } from 'node:crypto';
const base = (
  process.env.GQ_AUTH_API_URL || 'http://localhost:8080/api'
).replace(/\/$/, '');
const email = `auth-smoke-${randomUUID()}@example.test`;
const senha = `Aa!${randomBytes(24).toString('base64url')}`;
async function request(path, options = {}) {
  return fetch(`${base}${path}`, {
    ...options,
    signal: AbortSignal.timeout(15000),
    headers: { Accept: 'application/json', ...options.headers },
    cache: 'no-store',
  });
}
function requireStatus(response, status, label) {
  if (response.status !== status)
    throw new Error(
      `${label}: esperado HTTP ${status}, recebido ${response.status}.`,
    );
}
async function run() {
  const url = new URL(base);
  if (!['http:', 'https:'].includes(url.protocol))
    throw new Error('Use uma URL HTTP ou HTTPS em GQ_AUTH_API_URL.');
  const registration = await request('/usuarios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome: 'Teste de autenticação', email, senha }),
  });
  requireStatus(registration, 201, 'Cadastro');
  console.log(`OK: conta de teste criada (${email}).`);
  const response = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha }),
  });
  requireStatus(response, 200, 'Login');
  const data = await response.json();
  if (
    typeof data.token !== 'string' ||
    !data.token ||
    data.tipo !== 'Bearer' ||
    !Number.isInteger(data.expiraEm) ||
    data.expiraEm <= 0
  )
    throw new Error('Contrato de login inválido.');
  console.log('OK: login retornou Bearer e duração em segundos.');
  const invalid = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha: 'senha-incorreta' }),
  });
  requireStatus(invalid, 401, 'Credenciais inválidas');
  console.log('OK: credenciais inválidas retornaram 401.');
  requireStatus(await request('/usuarios'), 401, 'Consulta sem token');
  requireStatus(
    await request('/usuarios', {
      headers: { Authorization: `Bearer ${data.token}` },
    }),
    403,
    'Listagem com perfil USUARIO',
  );
  console.log(
    'OK: sem token = 401; usuário comum autenticado = 403 na listagem administrativa.',
  );
  console.log(
    'Teste concluído. A conta criada permanece no banco. Token e senha não foram exibidos.',
  );
}
run().catch((error) => {
  console.error(`Falha: ${error.message}`);
  process.exitCode = 1;
});
