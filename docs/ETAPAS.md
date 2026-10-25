# Desenvolvimento por etapas

A etapa 1 foi incorporada em `main` pelo PR #1, merge `f31b5f2447d6a3e50475c7ac825d53180b391b9d`. O histórico preserva os quatro commits de configuração e o ajuste de segurança de `source-map-js` feito no repositório (`2bfd92e`).

A etapa 2 foi incorporada em `main` pelo PR #2, merge `502692735570ee07e109077bfe3aaf6e652d26b0`, preservando seus quatro commits. A etapa 3 foi incorporada pelo PR #3, merge `3323167911cda51c9219f50b0fdf0dfb60a53782`. A branch adicional `feat/auth-integration` parte desse merge.

## Commits da etapa 2

| Ordem | Commit                                                                 | Conteúdo                                                                                         |
| ----- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1     | feat(brand): adicionar SVGs originais e fontes locais                  | SVGs, favicon, fontes e licenças preservados                                                     |
| 2     | feat(tokens): definir cores, tipografia e espaçamento da marca         | Tokens Tailwind, CSS global, foco e movimento reduzido                                           |
| 3     | feat(ui): criar componentes básicos acessíveis e testes                | Button, Card, Input, ProgressBar, Avatar, Notice e testes; tipos Node para ler tokens nos testes |
| 4     | feat(design-system): adicionar catálogo e documentação dos componentes | Demonstração responsiva, interações locais, testes e documentação                                |

## Commits da etapa 3

| Ordem | Commit                                                                 | Conteúdo                                                       |
| ----- | ---------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1     | feat(state): configurar cache e sessões de salas demonstrativas        | React Query, Zustand, adapter local e testes de regras         |
| 2     | feat(home): criar abertura e formulários para reunir a turma           | Marca, criação/entrada de sala, temas e testes de recuperação  |
| 3     | feat(room): implementar lobby e estados da sala demonstrativa          | Participantes, convite, controle do anfitrião, prévia e testes |
| 4     | feat(navigation): conectar abertura, lobby e catálogo com documentação | Navegação, foco, retomada da sala, verificações e documentação |

## Roteiro de branches

| Etapa | Branch                  | Escopo                                                | Estado                        |
| ----- | ----------------------- | ----------------------------------------------------- | ----------------------------- |
| 1     | chore/01-frontend-setup | Configuração e ferramentas                            | Incorporada em main           |
| 2     | feat/02-design-system   | SVG original, fontes, tokens e componentes atômicos   | Incorporada em main           |
| 3     | feat/03-home-lobby      | Abertura e sala demonstrativas; estado e cache        | Incorporada em main           |
| 4     | feat/04-quiz-result     | Seleção, confirmação, explicação, revisão e resultado | Planejada                     |
| 5     | feat/05-api-integration | Endpoints reais e DTOs obtidos do OpenAPI             | Planejada; depende do backend |
| 6     | feat/06-pwa             | Manifest, Service Worker e instalação                 | Planejada                     |

Cada etapa começa após a anterior ser incorporada em `main`. As branches futuras serão criadas quando começarmos suas etapas.

## Conferir e publicar

```bash
git log --graph --oneline --decorate --all
git log --oneline origin/main..HEAD
git diff origin/main...feat/auth-integration
git push -u origin feat/auth-integration
```

No GitHub, abra o Pull Request para `main`. Preserve os commits individuais ao fazer o merge para manter o detalhamento da etapa.

## Autenticação real antes da etapa 4

Branch adicional: `feat/auth-integration`. Contratos do backend `develop` em `c3f2bfd7359b1374a6b3705ba264d31218c6adcd`.

| Ordem | Commit                                                           | Escopo                                                           |
| ----- | ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1     | feat(api): integrar contratos reais de cadastro e login          | Cliente HTTP, normalização de erros e DTOs                       |
| 2     | feat(auth): gerenciar sessão JWT, expiração e limpeza de estado  | Sessão em memória, 401/403 e cache                               |
| 3     | feat(auth-ui): criar telas de cadastro, login e saída da conta   | Formulários, navegação e feedback acessível                      |
| 4     | fix(deps): atualizar Vite e dependências transitivas vulneráveis | Correções compatíveis da auditoria                               |
| 5     | test(auth): validar fluxos e documentar integração com backend   | Testes de interface, script HTTP, revisão de foco e documentação |

A configuração Docker entregue em `chore/local-docker-tests` é independente e ainda não faz parte desta base publicada. As branches devem ser revisadas e incorporadas conforme o fluxo do repositório. Categorias reais vêm depois da autenticação; a branch planejada de Quiz e Resultado continua `feat/04-quiz-result`.
