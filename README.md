# Genius Quest Frontend

Frontend web do **Genius Quest**, desenvolvido com React, Vite, TypeScript e Tailwind CSS 4.

## Requisitos

- Node.js 24+
- npm

## Instalar dependencias

```bash
npm ci
```

## Executar em desenvolvimento

```bash
npm run dev
```

A aplicacao ficara disponivel em:

```text
http://localhost:5173
```

Por padrao, chamadas para `/api` sao encaminhadas pelo proxy do Vite para:

```text
http://localhost:8080
```

Se preferir uma URL explicita para o backend:

```bash
cp .env.example .env
```

## Validacao

```bash
npm run lint
npm run build
```

## Docker

```bash
docker build -t genius-quest-frontend .
docker run --rm -p 5173:80 genius-quest-frontend
```

Para usar uma API diferente durante o build:

```bash
docker build \
  --build-arg VITE_API_URL=https://api.exemplo.com/api \
  -t genius-quest-frontend .
```

## Etapa 1 — configuração base

Branch: `chore/01-frontend-setup`. A primeira mudança migra a base existente para TypeScript estrito, preservando a consulta de saúde da API. Design System, telas do jogo e PWA serão implementados em branches posteriores.

```text
src/
  App.tsx
  main.tsx
  services/api.ts
```

Tailwind utiliza o plugin oficial do Vite e a importação CSS. Os tokens de marca e componentes reutilizáveis pertencem à etapa 2.

Qualidade: ESLint para React/TypeScript e Prettier. Use `npm run format:check` para conferir e `npm run format` para aplicar a formatação.
