# Genius Quest · Etapa 1

Configuração base do frontend, preservando o histórico existente. Branch: `chore/01-frontend-setup`.

## Escopo desta entrega

React + Vite com TypeScript estrito, Tailwind CSS 4, ESLint, Prettier, Vitest, React Testing Library e GitHub Actions. A tela inicial e a consulta de saúde da API existente foram preservadas.

O Design System e as telas de jogo ficam nas etapas seguintes. React Query, Zustand, contratos das partidas e PWA entram quando forem necessários ao fluxo correspondente.

## Executar

Use Node.js 24 (mínimo: 22.12).

```bash
npm ci
npm run dev
```

Acesse `http://localhost:5173`. Por padrão, `/api` usa o proxy para `http://localhost:8080`. A indisponibilidade do backend não impede abrir a aplicação.

Se precisar de outra base da API, copie `.env.example` para `.env` e ajuste `VITE_API_URL`. Variáveis `VITE_*` são públicas no build; nunca inclua segredos.

## Verificar

```bash
npm run lint
npm run format:check
npm test
npm run build
```

Para formatar: `npm run format`. Para testes interativos: `npm run test:watch`. Para conferir o build: `npm run preview`.

## Estrutura

```text
src/
  App.tsx              Tela inicial preservada
  App.test.tsx         Estado de carregamento e falha da API
  main.tsx             Entrada React
  index.css            Importação Tailwind e CSS existente
  services/
    api.ts             Cliente tipado do endpoint de saúde
    api.test.ts        Contrato HTTP e falha de rede
  test/setup.ts        Configuração RTL
```

## Commits e próximas branches

Consulte [docs/ETAPAS.md](docs/ETAPAS.md). A etapa 1 possui commits separados de migração, Tailwind, qualidade e testes/CI. Todos foram criados localmente, com a identidade Git configurada no ambiente (`Codex`). Nenhum push ou merge foi feito.

Para manter os commits individuais em um Pull Request, use a opção de merge que preserva os commits. Squash consolida a etapa em um único commit.
