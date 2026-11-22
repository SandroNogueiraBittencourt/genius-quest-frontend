# Genius Quest — Etapa 2.2.4: interface de curadoria de perguntas

## Escopo

A navegação `/?view=questions-admin` mostra a fila de perguntas para contas com a claim `perfil=ADMIN` no JWT. Essa verificação é **somente de apresentação**. Todas as rotas `/api/admin/perguntas` verificam a autorização de fato no backend com `@PreAuthorize` e retornam 401/403 conforme a sessão.

A integração contempla:

- Lista paginada (10 por página) com filtros por status e ID do tema.
- Detalhes administrativos com alternativas e gabarito, sem endpoint público.
- Edição de perguntas `PENDENTE`: enunciado, quatro alternativas, resposta correta, dificuldade, fonte e motivo obrigatório.
- Aprovação, rejeição e bloqueio com confirmação explícita. Rejeição e bloqueio exigem motivo.
- Visualização opcional de auditoria, inclusive snapshots antes/depois, exclusivamente para administradores.
- Estados de carregamento, erro, 403, lista vazia e mudança de sessão.
- Testes de API e interface; autenticação JWT via cliente HTTP já existente.

## Contrato de backend

Requer os arquivos locais da branch backend `feat/etapa2-02-perguntas-ia` após os commits `3824679`, `cc7647c`, `5754488` e `44a5d82`, além das migrations Flyway V8/V9. O backend **ainda não foi integrado à develop/Render**. Não use a API de produção para verificar a curadoria.

| Método | Endpoint                                              | Uso                           |
| ------ | ----------------------------------------------------- | ----------------------------- |
| GET    | `/api/admin/perguntas?status=PENDENTE&page=0&size=10` | Lista                         |
| GET    | `/api/admin/perguntas/{id}`                           | Detalhes                      |
| GET    | `/api/admin/perguntas/{id}/historico`                 | Auditoria                     |
| PATCH  | `/api/admin/perguntas/{id}/revisar`                   | Revisão                       |
| PATCH  | `/api/admin/perguntas/{id}/decisao`                   | Aprovar, rejeitar ou bloquear |

Geração de perguntas por IA permanece desativada por padrão e ainda não há endpoint HTTP para dispará-la. Para testar a tela com perguntas, é necessário ter candidatas válidas no banco de desenvolvimento, geradas/registradas por um fluxo administrativo seguro.

## Validação

```bash
npm ci
npm audit
npm run format:check
npm run lint
npm test
npm run build
```

Valide também localmente com backend atualizado (não basta iniciar a imagem antiga do container `genius-quest-api`). Verifique respostas 401/403 e o fluxo ADMIN com o banco de desenvolvimento separado do banco de testes.

Não realizar merge na `main` nem publicar o frontend até o backend correspondente estar pronto para deploy seguro. A `develop` do backend publica automaticamente no Render após CI.
