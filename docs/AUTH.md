# Autenticação real

Branch `feat/auth-integration`, baseada no frontend `main` (`3323167`). Contratos conferidos no backend `develop`, commit `c3f2bfd7359b1374a6b3705ba264d31218c6adcd`.

## Executar

Use Node.js 24.15+ na linha 24; os limites de outras linhas compatíveis estão em `engines.node`.

1. Inicie o backend da branch `develop`, com PostgreSQL, migrations e `JWT_SECRET` configurados. Confirme `http://localhost:8080/api/health`.
2. Nesta branch do frontend, rode `npm ci` e `npm run dev`.
3. Abra `http://localhost:5173`, clique em Criar conta, cadastre-se e entre com os dados cadastrados.

As rotas diretas são `/?view=register` e `/?view=login`. O menu Minha conta mostra a sessão conectada e oferece saída.

A base padrão é `/api`, encaminhada pelo proxy do Vite para `http://localhost:8080`. Se o backend estiver em outra URL, ajuste `VITE_API_URL` conforme `.env.example`; acesso direto a outra origem também exige configuração CORS no backend. Segredos de assinatura JWT pertencem somente ao backend.

O ambiente Docker foi entregue em uma branch de infraestrutura separada. Esta branch de autenticação parte do `main` publicado e não incorpora automaticamente aquela branch. Para testar um build em Docker, as configurações de infraestrutura e esta implementação precisam estar no checkout usado para reconstruir a imagem do frontend. A imagem anterior não recebe novas telas sem rebuild.

## Contratos implementados

| Operação               | Requisição                                          | Resposta                                      |
| ---------------------- | --------------------------------------------------- | --------------------------------------------- |
| Cadastro               | `POST /api/usuarios`, JSON `{ nome, email, senha }` | 201 com `UsuarioResponseDTO`                  |
| Login                  | `POST /api/auth/login`, JSON `{ email, senha }`     | 200 com `{ token, tipo: "Bearer", expiraEm }` |
| Requisição autenticada | Header `Authorization: Bearer <token>`              | Tratada pelo helper `authenticatedRequest`    |

`expiraEm` é duração em segundos, não timestamp. O frontend usa esse prazo para sua sessão local; o backend continua responsável por validar o token e autorizar cada operação. O token é tratado como opaco: nenhum perfil ou permissão é concedido decodificando claims no navegador.

Cadastro não abre sessão automaticamente. Após a confirmação do servidor, a tela de login recebe o e-mail e uma mensagem de conta criada. Nome e e-mail são normalizados; a senha é enviada exatamente como digitada. A confirmação de senha é validada somente na interface e não faz parte do JSON enviado.

Validações de cadastro: nome com 3–100 caracteres após trim, e-mail de até 150, senha de 8–72 caracteres e confirmação correspondente. Erros de validação do backend continuam sendo exibidos por campo.

## Sessão e limpeza

- JWT, e-mail usado no login e expiração ficam somente na memória do Zustand. Não há persistência em localStorage, sessionStorage ou cookies. Recarregar a página exige entrar novamente; abas têm sessões independentes.
- Senhas ficam no estado local do formulário e são limpas após sucesso ou desmontagem. As operações de autenticação não usam o cache de mutations do React Query.
- Trocar de sessão, sair ou expirar cancela consultas, limpa o cache e encerra a sala demonstrativa, evitando compartilhar estado entre contas.
- O prazo é reavaliado pelo timer e quando a aba recupera foco/visibilidade, inclusive após suspensão do dispositivo.
- `authenticatedRequest` bloqueia envio após expiração e encerra a sessão em 401. Uma resposta 401 de uma sessão antiga não encerra um login mais recente. Respostas 403 mantêm a sessão e representam falta de permissão.
- Sair limpa o estado deste navegador. O backend atual não oferece revogação ou refresh; um token previamente emitido permanece sujeito à expiração e às regras do servidor.
- Navegar para outra tela aborta o envio pendente e descarta conclusões tardias na interface. Não há repetição automática de cadastro ou login.

## Erros e acessibilidade

O cliente aceita `mensagem`/`campos` do tratamento global e `erro` das respostas de segurança. Login com 401 recebe mensagem genérica de credenciais inválidas; cadastro com 409 aponta o e-mail duplicado. Falhas de rede e respostas HTML inesperadas também são tratadas.

Campos possuem labels, autocomplete, ajuda e erros associados. O foco vai ao primeiro campo inválido; resumos de erro são anunciados. Há botão para mostrar/ocultar senha, estado de carregamento e bloqueio de envio duplicado. Navegação e troca de estado da sessão atualizam o foco do título.

## Verificar a API local em execução

Com o backend ativo:

```bash
npm run test:auth-api
```

Para outra base, inclusive um proxy local:

```bash
GQ_AUTH_API_URL=http://localhost:3000/api npm run test:auth-api
```

Esse comando **cria uma conta de teste por execução**, usando dados aleatórios, que permanece no banco. Verifica cadastro, login, senha incorreta (401), consulta sem token (401) e bloqueio da listagem administrativa para um usuário comum autenticado (403). Não imprime a senha ou o token. É uma verificação HTTP da API; o fluxo visual também deve ser experimentado no navegador.

## Limites desta entrega

Categorias reais foram adicionadas em `feat/categories-integration`; veja [CATEGORIES.md](CATEGORIES.md). Perfil editável e partidas aguardam suas etapas. Abertura, salas e participantes continuam demonstrativos e não exigem login nesta etapa. A tela Minha conta mostra o e-mail da sessão; não consulta `/usuarios/{id}`. A pendência de autorização por proprietário identificada no backend continua sendo responsabilidade do backend.

Testes automatizados da interface usam respostas HTTP controladas para conferir o contrato e os estados. A verificação contra um backend real será registrada separadamente; respostas simuladas não comprovam integração executada com PostgreSQL.

Fontes: [AuthController](https://github.com/SandroNogueiraBittencourt/genius-quest-backend/blob/c3f2bfd7359b1374a6b3705ba264d31218c6adcd/src/main/java/br/com/geniusquest/controller/AuthController.java), [AuthService](https://github.com/SandroNogueiraBittencourt/genius-quest-backend/blob/c3f2bfd7359b1374a6b3705ba264d31218c6adcd/src/main/java/br/com/geniusquest/service/AuthService.java) e [DTOs de usuário](https://github.com/SandroNogueiraBittencourt/genius-quest-backend/tree/c3f2bfd7359b1374a6b3705ba264d31218c6adcd/src/main/java/br/com/geniusquest/dto/usuario).

## Validação da entrega

- 69 testes em 16 arquivos passando; lint, formatação e build de produção aprovados.
- 27 vistas de login, cadastro, validações, duplicidade, credenciais inválidas, conta conectada, expiração e indisponibilidade conferidas em 320, 375 e 1440 px, com respostas HTTP controladas: sem rolagem horizontal ou imagens quebradas.
- Axe não detectou violações nos critérios WCAG A/AA habilitados nessas vistas. Isso não constitui certificação de conformidade.
- Auditoria npm com zero vulnerabilidades após atualizar Vite para 8.3.5 e os pacotes transitivos Undici e Zod.
- Script HTTP verificado com servidor simulado e sem exposição de senha/token na saída. A execução contra o backend Spring Boot real não foi realizada neste ambiente; execute `npm run test:auth-api` com seu backend ativo e experimente também as telas.

## Validação posterior e porta alternativa

A etapa de autenticação foi incorporada à `main` no PR #4 (`085faff`). Em 25/10/2026, o usuário executou com sucesso o teste HTTP contra o backend real na porta `8081`: cadastro, login, credenciais inválidas (401), consulta sem token (401) e bloqueio administrativo (403). A porta 8080 desse ambiente estava ocupada pelo VoltaPet.

Para repetir a execução nesse ambiente:

```bash
GQ_AUTH_API_URL=http://localhost:8081/api npm run test:auth-api
VITE_API_URL=http://localhost:8081/api npm run dev
```

A verificação real acima se refere à autenticação. Categorias têm teste próprio e instruções em [CATEGORIES.md](CATEGORIES.md).
