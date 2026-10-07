# Genius Quest · Etapa 2

Design System básico na branch `feat/02-design-system`, criada a partir da etapa 1 incorporada em `main` (`f31b5f2`).

## Escopo

Assets SVG originais, fontes locais Sora/Inter/Caveat, tokens de cores e espaçamento, componentes Button/Card/Input/ProgressBar/Avatar/Notice e catálogo interativo responsivo. O catálogo demonstra estados e interações locais; a consulta existente de saúde do backend continua no rodapé.

As telas de Abertura, Lobby, Quiz e Resultado serão desenvolvidas nas próximas branches. React Query, Zustand, contratos das partidas e PWA entram nas respectivas etapas.

## Executar

Use Node.js 24 (mínimo: 22.12).

```bash
npm ci
npm run dev
```

Acesse `http://localhost:5173`. Por padrão, `/api` usa o proxy para `http://localhost:8080`. A indisponibilidade do backend não impede usar o catálogo.

Para outra base da API, copie `.env.example` para `.env` e ajuste `VITE_API_URL`. Variáveis `VITE_*` são públicas no build; nunca inclua segredos.

## Verificar

```bash
npm run lint
npm run format:check
npm test
npm run build
```

Para formatar: `npm run format`. Testes interativos: `npm run test:watch`. Conferir o build: `npm run preview`.

## Documentação e estrutura

- [Design System e componentes](docs/DESIGN_SYSTEM.md)
- [Uso dos assets originais](docs/BRAND.md)
- [Branches, commits e próximas etapas](docs/ETAPAS.md)

`src/components/ui` contém os componentes reutilizáveis; `src/styles` contém tokens e estilos; `src/features/design-system` contém o catálogo. `src/services/api.ts` mantém o cliente tipado do endpoint de saúde. Fontes e SVGs são servidos localmente a partir de `public`.

Os commits da etapa 2 foram criados localmente com a identidade Git `Codex`. Nenhum push ou merge desta branch foi feito. Preserve os commits individuais ao revisar e incorporar a etapa no GitHub.
