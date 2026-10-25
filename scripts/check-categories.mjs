import { randomBytes, randomUUID } from 'node:crypto';

const base = (
  process.env.GQ_API_URL ||
  process.env.GQ_AUTH_API_URL ||
  'http://localhost:8080/api'
).replace(/\/+$/, '');
const email = 'categories-smoke-' + randomUUID() + '@example.test';
const senha = 'Aa!' + randomBytes(24).toString('base64url');
const nome = 'Descobertas de teste ' + randomUUID();

async function request(path, { token, json, ...options } = {}) {
  return fetch(base + path, {
    ...options,
    signal: AbortSignal.timeout(15000),
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(json === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: json === undefined ? undefined : JSON.stringify(json),
    cache: 'no-store',
    credentials: 'omit',
  });
}
function requireStatus(response, expected, label) {
  if (response.status !== expected)
    throw new Error(
      label +
        ': esperado HTTP ' +
        expected +
        ', recebido ' +
        response.status +
        '.',
    );
}
async function approved(token) {
  const response = await request('/categorias/aprovadas', { token });
  requireStatus(response, 200, 'Categorias aprovadas');
  const data = await response.json();
  if (
    !Array.isArray(data) ||
    !data.every(
      (item) =>
        item && typeof item.id === 'string' && item.status === 'APROVADA',
    )
  )
    throw new Error('Contrato da lista de categorias inválido.');
  return data;
}
async function run() {
  const url = new URL(base);
  if (!['http:', 'https:'].includes(url.protocol))
    throw new Error('Use uma URL HTTP ou HTTPS em GQ_API_URL.');
  console.log('API: ' + url.origin + url.pathname);
  const health = await request('/health');
  requireStatus(health, 200, 'Health');
  const identity = await health.json();
  if (
    identity.application !== 'Genius Quest Backend' ||
    identity.status !== 'UP'
  )
    throw new Error(
      'A API informada não se identificou como Genius Quest Backend ativo. Nenhuma conta ou categoria foi criada.',
    );

  requireStatus(
    await request('/categorias/aprovadas'),
    401,
    'Categorias sem token',
  );
  console.log('OK: consulta de categorias sem token retornou 401.');
  const registration = await request('/usuarios', {
    method: 'POST',
    json: { nome: 'Teste de categorias', email, senha },
  });
  requireStatus(registration, 201, 'Cadastro de teste');
  console.log('OK: conta de teste criada (' + email + ').');
  const login = await request('/auth/login', {
    method: 'POST',
    json: { email, senha },
  });
  requireStatus(login, 200, 'Login');
  const session = await login.json();
  if (
    typeof session.token !== 'string' ||
    !session.token ||
    session.tipo !== 'Bearer'
  )
    throw new Error('Contrato de login inválido.');
  const token = session.token;
  await approved(token);
  console.log('OK: lista autenticada contém somente categorias aprovadas.');

  requireStatus(
    await request('/categorias', {
      method: 'POST',
      token,
      json: { nome: ' ', descricao: null },
    }),
    400,
    'Nome em branco',
  );
  console.log('OK: nome em branco retornou 400.');
  const response = await request('/categorias', {
    method: 'POST',
    token,
    json: { nome, descricao: 'Sugestão criada pelo teste HTTP de integração.' },
  });
  requireStatus(response, 201, 'Sugestão de categoria');
  const category = await response.json();
  if (
    typeof category.id !== 'string' ||
    category.nome !== nome ||
    category.status !== 'PENDENTE'
  )
    throw new Error(
      'A categoria criada não retornou o contrato esperado com status PENDENTE.',
    );
  console.log('OK: sugestão criada com status PENDENTE (' + category.id + ').');

  requireStatus(
    await request('/categorias', {
      method: 'POST',
      token,
      json: { nome: nome.toUpperCase(), descricao: null },
    }),
    409,
    'Nome duplicado',
  );
  console.log('OK: nome duplicado sem distinção de maiúsculas retornou 409.');
  const list = await approved(token);
  if (list.some((item) => item.id === category.id))
    throw new Error('A sugestão pendente apareceu na lista de aprovadas.');
  console.log('OK: sugestão pendente permanece fora da lista de aprovadas.');
  requireStatus(
    await request('/categorias/pendentes', { token }),
    403,
    'Listagem administrativa',
  );
  console.log('OK: usuário comum recebeu 403 na listagem de pendentes.');
  console.log(
    'Teste concluído. A conta e a categoria pendente permanecem no banco. Token e senha não foram exibidos.',
  );
}
run().catch((error) => {
  console.error('Falha: ' + error.message);
  process.exitCode = 1;
});
