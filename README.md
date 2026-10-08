# Genius Quest · Etapa 3

Abertura e Lobby demonstrativos na branch `feat/03-home-lobby`, baseada no merge da etapa 2 em `main` (`5026927`). O histórico das etapas anteriores foi preservado.

## Escopo

- Abertura com a marca original, ação Reunir a turma e entrada por código.
- Criação de sala com nome e tema; entrada na sala de exemplo `GQ2026`.
- Lobby com participantes, código copiável, contador até 20 e modo Sem pressa.
- Prévia dos estados Aguardando, Pronta e Em andamento. O anfitrião precisa reunir 2 pessoas antes de iniciar a prévia.
- Cache de temas/sala com React Query e sessão da sala com Zustand.
- Catálogo do Design System preservado e navegação acessível entre as telas.

**As salas são demonstrações locais, somente nesta aba.** Recarregar apaga a sessão e salas criadas. Os códigos não conectam outros dispositivos. A prévia em andamento demonstra o estado do lobby; as perguntas e os resultados serão implementados na etapa 4.

A consulta de saúde do backend permanece real. Auth, temas e partidas via API aguardam a etapa 5 e seus contratos OpenAPI. PWA entra na etapa 6.

## Executar

Use Node.js 24 (mínimo: 22.12).

```bash
npm ci
npm run dev
```

Acesse `http://localhost:5173`. O catálogo está em `http://localhost:5173/?view=design-system`.

Por padrão, `/api` usa o proxy para `http://localhost:8080`. A indisponibilidade do backend não impede usar o protótipo. Para outra base da API, copie `.env.example` para `.env` e ajuste `VITE_API_URL`. Variáveis `VITE_*` são públicas no build; nunca inclua segredos.

## Experimentar

1. Clique em Reunir a turma, informe seu nome, escolha um tema e crie uma sala.
2. No lobby, adicione uma pessoa de exemplo para atingir o mínimo de 2.
3. Inicie a rodada demonstrativa e retorne ao lobby para conferir seus estados.
4. Saia da sala. Use Entrar em uma sala com o código `GQ2026` para conferir a vista de um convidado.

## Verificar

```bash
npm run lint
npm run format:check
npm test
npm run build
npm audit
```

Para formatar: `npm run format`. Testes interativos: `npm run test:watch`. Conferir o build: `npm run preview`.

## Estrutura e documentação

`src/features/home` contém a Abertura; `src/features/room` reúne Lobby, tipos, consultas e sessão; `src/features/demo` contém o adapter local; `src/app` configura navegação e cache. Componentes reutilizáveis continuam em `src/components/ui`.

- [Comportamento e limites da demonstração](docs/DEMO.md)
- [Design System e componentes](docs/DESIGN_SYSTEM.md)
- [Uso dos assets originais](docs/BRAND.md)
- [Branches e histórico por etapa](docs/ETAPAS.md)

Os commits desta etapa foram criados localmente com a identidade Git `Codex`. Nenhum push ou merge da etapa 3 foi realizado. Preserve os commits individuais ao incorporar a branch no GitHub.
