# Genius Quest · Autenticação real

Branch `feat/auth-integration`, criada a partir do `main` que incorporou a etapa 3 (`3323167`). Cadastro e login consomem os endpoints reais do backend Spring Boot; o JWT fica em memória no Zustand, com expiração e saída. Os assets originais e o Design System foram preservados.

## Executar

Use Node.js 24, a partir da versão 24.15. Também são aceitas as versões declaradas em `engines.node` no `package.json`. O backend deve estar ativo na porta 8080, preferencialmente na branch `develop` revisada em `c3f2bfd`.

```bash
npm ci
npm run dev
```

Acesse `http://localhost:5173`. Use Criar conta, entre com seu e-mail e senha e confira Minha conta e Sair. Recarregar a página encerra a sessão local.

Por padrão, `/api` usa o proxy do Vite para `http://localhost:8080`. Para outra base, ajuste `VITE_API_URL` conforme `.env.example`. Essas variáveis são públicas no build; segredos JWT pertencem ao backend.

Abertura e Lobby continuam demonstrativos. Cadastro e login não estão disponíveis na branch antiga `main` do backend, que ainda contém a estrutura inicial. Veja [docs/AUTH.md](docs/AUTH.md) para contratos, execução com Docker, sessão e limites da implementação.

## Verificar

```bash
npm run lint
npm run format:check
npm test
npm run build
```

Com a API real ativa, é possível rodar:

```bash
npm run test:auth-api
```

Esse último comando cria uma conta de teste por execução e verifica os endpoints HTTP de autenticação e autorização. A conta permanece no banco; senha e token não são exibidos.

## Documentação

- [Autenticação e configuração da API](docs/AUTH.md)
- [Demonstração de Abertura e Lobby](docs/DEMO.md)
- [Design System](docs/DESIGN_SYSTEM.md)
- [Marca original](docs/BRAND.md)
- [Branches e commits](docs/ETAPAS.md)

`src/features/auth` contém contratos, sessão, ciclo de expiração, telas e testes; `src/services/http.ts` trata JSON e erros; `scripts/check-auth.mjs` verifica uma API em execução. React Query continua responsável pelos dados de temas e salas demonstrativas.

Os cinco commits desta entrega foram criados localmente com a identidade Git `Codex`. Nenhum push ou merge desta branch foi realizado. Preserve os commits individuais ao incorporar a entrega no GitHub.
