# Categorias reais

Branch `feat/categories-integration`, baseada no frontend `main`, merge `085faffc5784549dbc7419a73fab2e6e46bcdf90` do PR #4. Contratos conferidos no backend `develop`, commit `c3f2bfd7359b1374a6b3705ba264d31218c6adcd`.

## Contratos consumidos pela interface

| Operação            | Endpoint                        | Corpo / resposta                                      |
| ------------------- | ------------------------------- | ----------------------------------------------------- |
| Consultar aprovadas | `GET /api/categorias/aprovadas` | Array de `CategoriaResponseDTO`                       |
| Enviar sugestão     | `POST /api/categorias`          | `{ nome, descricao }`; 201 com `CategoriaResponseDTO` |

Ambos exigem `Authorization: Bearer <token>`. Usuários comuns podem consultar aprovadas e sugerir categorias. Listagem de pendentes e operações de aprovação, edição e remoção são administrativas e ficam para outra etapa.

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "nome": "Astronomia",
  "descricao": "Uma conversa sobre o universo.",
  "status": "PENDENTE",
  "criadoEm": "2026-10-25T12:00:00Z",
  "atualizadoEm": "2026-10-25T12:00:00Z"
}
```

`descricao` pode ser `null`. O enum de status é `PENDENTE`, `APROVADA` ou `REMOVIDA`. O backend define o status; o frontend não aprova nem altera a elegibilidade de uma categoria. O serviço atual cria sugestões como pendentes.

A listagem de aprovadas é ordenada por nome pelo backend. Não há paginação nesse contrato. O cliente valida o formato e rejeita uma lista que contenha categorias fora de `APROVADA`; não utiliza categorias demonstrativas como substituto de uma falha da API.

Validações do envio: nome obrigatório, até 80 caracteres, descrição opcional de até 255. Os limites são conferidos antes do envio, e os espaços nas extremidades são aparados no JSON. Descrição vazia é enviada como `null`. Validações e conflitos retornados pelo backend continuam prevalecendo.

## Interface e navegação

- Menu **Categorias**, rota `/?view=categories` e título de documento próprio.
- Visitantes recebem convite para entrar; nenhum endpoint de categorias é chamado antes do login.
- Quem inicia o login a partir das categorias retorna à página após autenticar, inclusive passando pelo cadastro.
- Lista com carregamento, atualização manual, estado vazio, falha de rede e falta de permissão.
- Formulário com labels, ajuda, descrição multilinha, erros associados e foco no primeiro campo inválido. Corrigir um campo não desloca o foco para outro campo.
- Envio bloqueado enquanto a solicitação está em andamento. A confirmação mostra nome e status retornados pelo backend, com foco e anúncio acessível.
- Sugestões pendentes não são acrescentadas à lista de aprovadas. A consulta é invalidada após sucesso para buscar novamente o estado do servidor.
- Não há banner de demonstração na página de categorias reais. O banner permanece em Abertura e Lobby, cujas salas e temas ainda são demonstrativos.

O backend atual não oferece histórico de sugestões do usuário comum. A confirmação permanece somente enquanto a tela está montada. Para ver novas aprovações, use Atualizar lista. Não há promessa de prazo de revisão ou aprovação automática.

## Cache, sessão e erros

`src/features/categories/queries.ts` usa React Query com uma chave por sessão (e-mail e prazo de expiração, sem token na chave), sem repetição automática em erro. Os dados permanecem em memória. A sessão JWT continua no Zustand, conforme a etapa de autenticação.

Consultas encaminham o `AbortSignal` ao cliente HTTP. Sair, expirar ou trocar a conta cancela consultas e limpa o cache; o formulário é desmontado, limpa seus campos e aborta a espera pelo POST. Respostas que chegam após troca de sessão são descartadas. Navegar para outra página também cancela a consulta sem observadores e a espera pelo envio.

Cancelar a espera no navegador não desfaz uma gravação que o servidor já tenha concluído. Não há repetição automática de POST. Em falha de rede, os campos são mantidos e a interface informa que não foi possível confirmar o envio; uma nova tentativa com o mesmo nome pode receber 409.

| Situação                  | Comportamento                                              |
| ------------------------- | ---------------------------------------------------------- |
| 400 com `campos`          | Erros associados a nome/descrição; mantém o formulário     |
| 401                       | Encerra a sessão atual, limpa dados e oferece nova entrada |
| 403                       | Informa falta de permissão e mantém a sessão               |
| 409                       | Destaca nome já cadastrado e mantém os campos              |
| Rede indisponível         | Informa falha e permite tentativa manual                   |
| Resposta fora do contrato | Trata como erro de API, sem exibir dados inválidos         |

## Testar no ambiente local

No ambiente já validado, o Genius Quest usa API `8081` e frontend `5173`; o VoltaPet continua na `8080`. Confira primeiro:

```bash
curl -i http://localhost:8081/api/health
```

A resposta deve ser 200, com `status: UP` e `application: Genius Quest Backend`. Com o backend aberto:

```bash
VITE_API_URL=http://localhost:8081/api npm run dev
```

1. Abra Categorias sem login e use Entrar para ver categorias.
2. Autentique-se e confira o retorno à página. Sem categorias aprovadas, o estado vazio é esperado.
3. Envie um nome único e, opcionalmente, uma descrição. Confira Pendente de revisão.
4. Envie o mesmo nome novamente e confira o conflito. O backend compara sem distinguir maiúsculas.
5. Saia da conta e retorne a Categorias: a consulta e o formulário exigem uma nova sessão.

Para verificar diretamente o contrato HTTP, execute no diretório do frontend:

```bash
GQ_API_URL=http://localhost:8081/api npm run test:categories-api
```

O script identifica o Genius Quest antes de criar dados, verifica 401 sem token, cria uma conta, faz login, consulta aprovadas, verifica 400 para nome em branco, cria uma categoria pendente, verifica 409 por duplicidade, confirma que a pendente não consta das aprovadas e que o usuário comum recebe 403 ao listar pendentes.

**Cada execução cria uma conta e uma categoria pendente que permanecem no banco.** Nenhum token ou senha é exibido. A base vem de `GQ_API_URL`, com compatibilidade para `GQ_AUTH_API_URL`; o padrão é `http://localhost:8080/api`. O script não carrega `.env.local`.

## Histórico e limites

A autenticação foi integrada à `main` no PR #4 e seu teste HTTP passou contra o backend real no ambiente do usuário em 25/10/2026. A integração HTTP de categorias desta entrega ainda deve ser executada nesse ambiente.

Salas, partidas e pontuação não foram alteradas. Administração de categorias, perfil editável e paginação dependem de etapas próprias. O frontend não chama endpoints de aprovação, remoção ou edição. Os SVGs e as fontes originais não foram modificados.

## Verificação desta entrega

- 95 testes em 19 arquivos, incluindo contratos, estados da tela, recuperação, validação, envio duplicado, cancelamento, retorno após login e isolamento entre contas.
- Lint, formatação e build de produção aprovados; nenhuma dependência nova; auditoria npm com zero vulnerabilidades.
- 37 vistas verificadas com respostas HTTP controladas em 320, 375, 768 e 1440 px, incluindo estados vazio, carregamento, erros, sucesso e textos longos. Sem rolagem horizontal, imagens quebradas ou erros JavaScript.
- Axe sem violações nos critérios WCAG A/AA habilitados nessas vistas; isso não equivale a uma certificação de conformidade. Primeiro foco de teclado no link Pular para o conteúdo.
- Script HTTP validado com servidor controlado, incluindo bloqueio de outro serviço antes de criar conta/categoria e ausência de senha/token na saída. A API Spring Boot real não foi executada neste ambiente.

Fontes: [CategoriaController](https://github.com/SandroNogueiraBittencourt/genius-quest-backend/blob/c3f2bfd7359b1374a6b3705ba264d31218c6adcd/src/main/java/br/com/geniusquest/controller/CategoriaController.java), [DTOs](https://github.com/SandroNogueiraBittencourt/genius-quest-backend/tree/c3f2bfd7359b1374a6b3705ba264d31218c6adcd/src/main/java/br/com/geniusquest/dto/categoria), [CategoriaService](https://github.com/SandroNogueiraBittencourt/genius-quest-backend/blob/c3f2bfd7359b1374a6b3705ba264d31218c6adcd/src/main/java/br/com/geniusquest/service/CategoriaService.java) e [SecurityConfig](https://github.com/SandroNogueiraBittencourt/genius-quest-backend/blob/c3f2bfd7359b1374a6b3705ba264d31218c6adcd/src/main/java/br/com/geniusquest/security/SecurityConfig.java).
