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
- Com recurso habilitado, apresenta os temas aprovados e quantidade de 1 a 3,
  limitada ao saldo diário disponível, e uma confirmação **explícita** de possível cobrança de tokens.
- Com cota esgotada, a interface não oferece geração nem consulta temas desnecessariamente.
- `POST /api/admin/perguntas/geracao` inclui JWT e `Idempotency-Key: UUID`,
  gerada somente no momento da confirmação.
- Os IDs retornados como `PENDENTE` atualizam a fila de revisão e a primeira
  candidata fica selecionada para curadoria humana. Não há aprovação automática.
- Se houver erro/timeout, o botão é bloqueado nesta sessão de formulário; o
  administrador deve verificar a fila antes de iniciar uma nova solicitação.
- A API valida o formato de JSON, status, IDs e limites; nada do gabarito é
  exposto nesse POST de geração.

## Integração dependente do backend

O backend **PR #29** foi integrado a `develop`, mas a migration V12 e o
serviço de IA não foram homologados em produção. A publicação do frontend,
isoladamente, não ativa geração: caso o endpoint não exista ou esteja
indisponível, o administrador recebe um aviso e nenhum POST de geração é
exibido. O backend deve permanecer com os flags
`APP_IA_ENABLED=false` e `APP_IA_HTTP_ENABLED=false` inicialmente.

O backend somente poderá ser publicado com V12 após backup restaurado em
homologação isolada e aprovação específica. A integração do frontend não
constitui autorização de deploy do backend nem de consumo da API OpenAI.

Cotas e idempotência são responsabilidade do backend. O frontend apenas
repete os limites ao usuário; **não deve ser considerado controle de segurança**.

## Qualidade e homologação

- CI: `npm ci`, `npm run format:check`, `npm run lint`, `npm test`,
  `npm run build`.
- Testar GET off sem POST; confirmação obrigatória; formato de resposta;
  autorização 401/403 e erro sem retry automático.
- Geração real com API chave e custos depende de aprovação separada.

**Liberação frontend:** merge autorizado apenas para a interface com geração
inativa no servidor. A ativação de IA e o deploy com migration V12 exigem
homologação separada; não executar chamadas pagas durante esta integração.
