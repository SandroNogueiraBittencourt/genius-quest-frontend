# Adapter de demonstração · etapa 3

As salas desta etapa existem apenas na memória desta aba. Recarregar a página apaga as salas criadas e a sessão. Nenhum convite conecta dispositivos diferentes. O código `GQ2026` identifica uma sala de exemplo; criação gera outro código de 6 caracteres.

`features/demo/roomGateway.ts` fornece dados locais e valida as ações demonstrativas: nome, tema, capacidade 20, mínimo 2 e permissão do anfitrião. Não é contrato de API, autenticação ou garantia de elegibilidade real. O frontend exibe `isHost` e `canStart` retornados pelo adapter. Na integração, a autorização e a elegibilidade devem vir do backend.

React Query mantém temas e snapshots da sala em cache. Zustand guarda somente código da sala e identificador do participante atual; dados da sala não são duplicados no store. As consultas locais podem operar sem rede e não são repetidas automaticamente em caso de erro.

A consulta existente `/api/health` continua real e não controla a disponibilidade do protótipo. Auth, temas e partidas reais aguardam os contratos OpenAPI da etapa 5. Esta etapa não calcula pontuação, moedas ou resultados.

Referências de configuração: [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/quick-start) e [Zustand](https://github.com/pmndrs/zustand).
