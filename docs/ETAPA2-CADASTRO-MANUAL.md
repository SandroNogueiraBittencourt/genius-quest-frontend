# Genius Quest — Etapa 2.2.5: cadastro manual de candidatas

## Objetivo

Permitir que uma conta administradora crie perguntas pendentes a partir da tela
`/?view=questions-admin`, para iniciar a homologação da curadoria sem consumir
chamadas de IA.

## Contrato com backend

Requer o backend com o PR #28 integrado em `develop`, commit `e66c8df`,
**e um deploy manual desse commit**. O deploy backend anterior `2dcfb73`
não implementa o POST de criação.

- `GET /api/temas/moderacao`: oferece somente temas aprovados na seleção.
- `POST /api/admin/perguntas`: envia tema, enunciado, 4 alternativas,
  índice correto, dificuldade e fonte opcional; requer JWT ADMIN.
- Resposta esperada HTTP 201: `{"id":"UUID"}`. Nenhum gabarito retorna na criação.
- Pergunta criada é sempre `MANUAL/PENDENTE`, exigindo curadoria humana.

## Segurança

- Proteção no frontend é apenas UX; a autorização real é Spring Security
  e `@PreAuthorize("hasRole('ADMIN')")` no backend.
- Em caso de login expirado/usuário diferente, a resposta antiga é descartada.
- A interface bloqueia enunciado inválido e alternativas duplicadas; o backend
  faz novamente as validações.
- O botão de criação fica oculto até aberto pelo administrador, sem carregar
  temas ou enviar novas perguntas automaticamente.
- Não cria perguntas por IA, não faz chamadas pagas e não habilita
  `OPENAI_API_KEY`.

## Homologação

1. Conferir `npm ci`, `npm run format:check`, `npm run lint`,
   `npm test` e `npm run build` no CI.
2. Publicar o backend **somente após autorização específica**; observar que
   não há migrações adicionais além da V11 já em produção.
3. Publicar o frontend **somente após autorização específica**.
4. Com ADMIN, cadastrar uma candidata para um tema aprovado e confirmar
   sua presença na fila `PENDENTE`.
5. Revisar conteúdo, aprovar, consultar histórico. Usar outras candidatas
   para testar rejeição e bloqueio, sempre com justificativa.
6. Verificar 401 sem JWT, 403 com conta não ADMIN, campos inválidos e
   tentativa de duplicação. Nunca enviar gabarito a clientes não ADMIN.

**Não inserir dados de homologação no PostgreSQL de produção sem autorização.**
