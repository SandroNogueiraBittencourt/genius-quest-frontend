# Etapa 2.2.7 — Interface administrativa de geração IA

## Objetivo

Acoplar a geração de candidatas IA à fila administrativa sem alterar a curadoria
existente. **Nunca há geração automática ao abrir a página.**

## Comportamento

- A área `/?view=questions-admin` oferece `Gerar candidatas com IA` apenas
  para sessões com claim ADMIN (o servidor revalida o papel).
- Ao abrir, faz somente `GET /api/admin/perguntas/geracao/status` (sem custo).
- Se o backend ainda não publicou a rota, ou ambos os flags estiverem off,
  mostra aviso; nenhum POST fica disponível.
- Com recurso habilitado, apresenta os temas aprovados e quantidade 1–3,
  cota diária e uma confirmação **explícita** de possível cobrança de tokens.
- `POST /api/admin/perguntas/geracao` inclui JWT e `Idempotency-Key: UUID`,
  gerada somente no momento da confirmação.
- Os IDs retornados como `PENDENTE` atualizam a fila de revisão e a primeira
  candidata fica selecionada para curadoria humana. Não há aprovação automática.
- Se houver erro/timeout, o botão é bloqueado nesta sessão de formulário; o
  administrador deve verificar a fila antes de iniciar uma nova solicitação.
- A API valida o formato de JSON, status, IDs e limites; nada do gabarito é
  exposto nesse POST de geração.

## Integração dependente do backend

O frontend depende do contrato proposto no backend **PR #29**.
Até haver **autorização e deploy separados** do backend + migration V12,
a interface não executará geração. O backend deverá permanecer com flags
`APP_IA_ENABLED=false` e `APP_IA_HTTP_ENABLED=false` inicialmente.

Cotas e idempotência são responsabilidade do backend. O frontend apenas
repete os limites ao usuário; **não deve ser considerado controle de segurança**.

## Qualidade e homologação

- CI: `npm ci`, `npm run format:check`, `npm run lint`, `npm test`,
  `npm run build`.
- Testar GET off sem POST; confirmação obrigatória; formato de resposta;
  autorização 401/403 e erro sem retry automático.
- Geração real com API chave e custos depende de aprovação separada.

**Draft: não realizar merge ou deploy nesta subetapa.**
