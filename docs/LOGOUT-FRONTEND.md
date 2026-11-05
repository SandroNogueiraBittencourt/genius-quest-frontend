# Etapa 0.2 — Integração do logout no frontend

O frontend mantém o JWT apenas na memória (Zustand) e não utiliza localStorage nem sessionStorage.

Os dois botões de saída, no cabeçalho e em **Minha conta**, enviam:
```http
POST /api/auth/logout
Authorization: Bearer <JWT>
```

Com **204 No Content**, a sessão local é limpa, os caches e o estado demonstrativo são descartados por AuthLifecycle, e o usuário volta à tela inicial.

Com **401 Unauthorized**, a API já não aceita o token; a aplicação limpa a sessão local e informa que ela não está mais válida.

Com falha de rede, **5xx** ou outro erro, a aplicação **não afirma** que o JWT foi revogado: mantém a sessão atual, apresenta aviso acessível e permite tentar novamente.

Durante a operação, os botões de logout mostram estado pendente e impedem cliques duplicados. Respostas atrasadas de uma sessão antiga não podem encerrar uma sessão nova.

## Checklist de implantação
- O backend de produção deve conter o PR #10 e a migration Flyway V4 **antes** do deploy do frontend com esta alteração.
- Executar `npm ci && npm run lint && npm test -- --run && npm run build` (ou `npm test`, que já roda Vitest uma vez).
- Validar login, logout, segunda requisição com token revogado (401) e novo login no ambiente de testes.
- Não registrar nem expor tokens em logs.
