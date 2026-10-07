# Desenvolvimento por etapas

A etapa 1 parte do commit existente `94d2bb79829b38efea6fafc21ab923a792007ec4` e usa a branch `chore/01-frontend-setup`. `main` permanece na base original.

## Commits desta etapa

| Ordem | Commit                                                    | Conteúdo                                                       |
| ----- | --------------------------------------------------------- | -------------------------------------------------------------- |
| 1     | chore(frontend): migrar base React e Vite para TypeScript | Entradas TS/TSX, tipagem da API, configuração estrita e idioma |
| 2     | chore(styles): configurar Tailwind CSS com plugin do Vite | Plugin, importação CSS e dependências                          |
| 3     | chore(quality): configurar ESLint e Prettier              | ESLint 10 compatível com os plugins, formatação e scripts      |
| 4     | test(tooling): configurar Vitest, RTL e GitHub Actions    | Testes de transporte/estado da API, configuração e CI          |

## Roteiro de branches

| Etapa | Branch                  | Escopo                                                | Estado                        |
| ----- | ----------------------- | ----------------------------------------------------- | ----------------------------- |
| 1     | chore/01-frontend-setup | Configuração e ferramentas                            | Criada com commits            |
| 2     | feat/02-design-system   | SVG original, fontes, tokens e componentes atômicos   | Planejada                     |
| 3     | feat/03-home-lobby      | Abertura e sala demonstrativas; estado e cache        | Planejada                     |
| 4     | feat/04-quiz-result     | Seleção, confirmação, explicação, revisão e resultado | Planejada                     |
| 5     | feat/05-api-integration | Endpoints reais e DTOs obtidos do OpenAPI             | Planejada; depende do backend |
| 6     | feat/06-pwa             | Manifest, Service Worker e instalação                 | Planejada                     |

Cada etapa deve iniciar a partir da anterior incorporada em `main`, ter commits pequenos e passar pela revisão e pelas verificações antes da próxima entrega. As branches futuras serão criadas quando começarmos suas etapas.

## Conferir o histórico

```bash
git log --graph --oneline --decorate --all
git show --stat HEAD
git diff main...chore/01-frontend-setup
```

Para publicar a branch após revisar localmente:

```bash
git push -u origin chore/01-frontend-setup
```

No GitHub, abra o Pull Request dessa branch para `main`. Preserve os commits individuais ao fazer o merge para manter o detalhamento da etapa.
