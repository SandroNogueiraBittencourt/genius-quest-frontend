# Desenvolvimento por etapas

A etapa 1 foi incorporada em `main` pelo PR #1, merge `f31b5f2447d6a3e50475c7ac825d53180b391b9d`. O histórico preserva os quatro commits de configuração e o ajuste de segurança de `source-map-js` feito no repositório (`2bfd92e`).

A etapa 2 parte desse merge na branch `feat/02-design-system`.

## Commits da etapa 2

| Ordem | Commit                                                                 | Conteúdo                                                                                         |
| ----- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1     | feat(brand): adicionar SVGs originais e fontes locais                  | SVGs, favicon, fontes e licenças preservados                                                     |
| 2     | feat(tokens): definir cores, tipografia e espaçamento da marca         | Tokens Tailwind, CSS global, foco e movimento reduzido                                           |
| 3     | feat(ui): criar componentes básicos acessíveis e testes                | Button, Card, Input, ProgressBar, Avatar, Notice e testes; tipos Node para ler tokens nos testes |
| 4     | feat(design-system): adicionar catálogo e documentação dos componentes | Demonstração responsiva, interações locais, testes e documentação                                |

## Roteiro de branches

| Etapa | Branch                  | Escopo                                                | Estado                        |
| ----- | ----------------------- | ----------------------------------------------------- | ----------------------------- |
| 1     | chore/01-frontend-setup | Configuração e ferramentas                            | Incorporada em main           |
| 2     | feat/02-design-system   | SVG original, fontes, tokens e componentes atômicos   | Criada com commits            |
| 3     | feat/03-home-lobby      | Abertura e sala demonstrativas; estado e cache        | Planejada                     |
| 4     | feat/04-quiz-result     | Seleção, confirmação, explicação, revisão e resultado | Planejada                     |
| 5     | feat/05-api-integration | Endpoints reais e DTOs obtidos do OpenAPI             | Planejada; depende do backend |
| 6     | feat/06-pwa             | Manifest, Service Worker e instalação                 | Planejada                     |

Cada etapa começa após a anterior ser incorporada em `main`. As branches futuras serão criadas quando começarmos suas etapas.

## Conferir e publicar

```bash
git log --graph --oneline --decorate --all
git log --oneline origin/main..HEAD
git diff origin/main...feat/02-design-system
git push -u origin feat/02-design-system
```

No GitHub, abra o Pull Request para `main`. Preserve os commits individuais ao fazer o merge para manter o detalhamento da etapa.
