# Pontuação e histórico das partidas multiplayer (V21)

Consolidação das funcionalidades de pontuação e histórico propostas nos PRs
#22 e #23, adaptadas ao fluxo de sala real da `main`. O backend deve incluir
a migração V21 e o histórico persistido de resultados. Nenhuma pontuação é
calculada no navegador.

## Navegação

| Rota                  | Funcionalidade                                                                |
| --------------------- | ----------------------------------------------------------------------------- |
| `?view=real-room`     | Sala real com UUID, perguntas, classificação final e votação de continuação.  |
| `?view=match-results` | Resultados das partidas multiplayer concluídas da conta.                      |
| `?view=quiz`          | Minhas partidas, com estado real, tema, categoria, origem e acesso ao placar. |
| `?view=history`       | Histórico de votação e preparação individual a partir dos temas vencedores.   |
| `?view=lobby`         | Demonstração em memória, sem conexão entre dispositivos.                      |

As implementações anteriores de lobby e abertura dos PRs de referência
foram adaptadas ao fluxo de sala real já publicado; a demonstração, a
autenticação, a recuperação de senha, as telas de moderação e a retomada
por UUID da `main` são preservadas.

## Contratos utilizados

- `GET /api/partidas/minhas?incluirSalas=true`: histórico da conta autenticada,
  incluindo partidas de sala. O ciclo pode ser nulo quando o tema foi
  escolhido diretamente na sala.
- `GET /api/salas/{codigo}/partidas/{partidaId}/resultado`: classificação
  persistida de uma partida concluída. Exibe posição, nome, pontos, acertos
  e erros retornados pela API. Continua disponível pelo histórico depois
  de uma nova rodada ou do encerramento da sala, conforme a autorização
  do backend.
- A votação de continuação continua a utilizar os endpoints já existentes.
  Se outro participante encerrar a votação antes de um voto chegar, o
  cliente consulta o estado atualizado. Um conflito só é tratado como
  encerramento normal ou voto já registrado se a API confirmar esse estado.

As consultas usam a sessão atual e isolamento de cache por conta.
Trocas de sessão e cancelamento de solicitações descartam respostas antigas.
O UUID da sala continua no sessionStorage da aba, associado ao jogador;
JWT e resultados não são persistidos no armazenamento do navegador.
As perguntas e a resposta registrada são identificadas pela partida e
pelo número da pergunta, evitando reaproveitamento entre rodadas.

## Homologação

1. Entrar em duas contas de teste, criar uma sala e entrar com o UUID completo.
2. Escolher um tema com pelo menos dez perguntas aprovadas e concluir a partida.
3. Verificar o mesmo placar nas duas contas, incluindo os acertos e erros.
4. Votar para encerrar ou continuar. Em outra rodada, confirmar que a primeira
   pergunta pode ser respondida normalmente.
5. Acessar Minhas partidas e Resultados, abrir o placar concluído e conferir
   os valores depois de sair ou encerrar a sala.
6. Trocar de conta e verificar que não são exibidos históricos da sessão
   anterior. Confirmar também o histórico de votação e a sala demonstrativa.

Executar `npm ci`, `npm run format:check`, `npm run lint`, `npm test` e
`npm run build` antes de revisar o PR. A homologação com contas e o deploy
em produção são etapas separadas.
