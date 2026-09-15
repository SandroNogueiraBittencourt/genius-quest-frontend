# Genius Quest Frontend

Frontend web do **Genius Quest**, desenvolvido com React, Vite, JavaScript, HTML e CSS.

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

## Estrutura inicial

```text
src/
├── components
├── contexts
├── hooks
├── layouts
├── pages
├── routes
├── services
└── styles
```
