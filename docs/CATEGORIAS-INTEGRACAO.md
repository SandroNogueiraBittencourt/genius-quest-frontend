# Etapa 0.3 — Categorias no frontend

Esta entrega consolida a antiga branch `feat/categories-integration` na versão atual do frontend sem substituir o logout real.

## Fluxos

- Navegação **Categorias**: `?view=categories`.
- Usuários autenticados consultam `GET /api/categorias/aprovadas` e sugerem uma nova categoria via `POST /api/categorias`.
- Uma sugestão recebe status `PENDENTE`, e só aparece na lista pública após aprovação.
- O formulário valida nome (máximo de 80 caracteres) e descrição (máximo de 255), preserva os campos em caso de erro e bloqueia envio duplicado.
- Para perfil ADMIN, a navegação oferece **Moderação** (`?view=categories-admin`), que lista `GET /api/categorias`, permite edição e aprovação, e exige confirmação da remoção. Uma categoria `REMOVIDA` pode ser **restaurada** pelo endpoint existente de aprovação.
- Os estados `PENDENTE`, `APROVADA` e `REMOVIDA` têm cores distintas e rótulos textuais. As ações administrativas expõem nomes específicos da categoria para leitores de tela.
- O cliente apenas decodifica a claim `perfil` do JWT para decidir mostrar o link de navegação. A claim **não é prova de autorização**. O backend aplica as permissões e retorna 403 em caso de acesso indevido.
- Logout e troca de usuário limpam caches autenticados e cancelam solicitações pendentes.

## Contratos e limites

O frontend reutiliza o modelo de Categoria do backend: `id`, `nome`, `descricao`, `status`, `criadoEm` e `atualizadoEm`. As operações de moderação utilizam `PATCH /api/categorias/{id}`, `/{id}/aprovar` e `/{id}/remover`.

**Categoria não é equivalente a Tema**: votação, autor de tema e ciclos de moderação de temas continuam fora do escopo desta integração.

## Validação

Executar `npm ci`, `npm run format:check`, `npm run lint`, `npm test` e `npm run build` na branch do PR. Antes do deploy, validar os fluxos de usuário comum e ADMIN no ambiente com backend atualizado.
