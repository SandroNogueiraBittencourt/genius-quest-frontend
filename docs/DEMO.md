# Adapter de demonstração · etapa 3

As salas desta etapa existem apenas na memória desta aba. Recarregar a página apaga as salas criadas e a sessão. Nenhum convite conecta dispositivos diferentes. O código `GQ2026` identifica uma sala de exemplo; criação gera outro código de 6 caracteres.

`features/demo/roomGateway.ts` fornece dados locais e valida as ações demonstrativas: nome, tema, capacidade 20, mínimo 2 e permissão do anfitrião. Não é contrato de API, autenticação ou garantia de elegibilidade real. O frontend exibe `isHost` e `canStart` retornados pelo adapter. Na integração, a autorização e a elegibilidade devem vir do backend.

React Query mantém temas e snapshots da sala em cache. Zustand guarda somente código da sala e identificador do participante atual; dados da sala não são duplicados no store. As consultas locais podem operar sem rede e não são repetidas automaticamente em caso de erro.

A consulta existente `/api/health` continua real e não controla a disponibilidade do protótipo. Auth, temas e partidas reais aguardam os contratos OpenAPI da etapa 5. Esta etapa não calcula pontuação, moedas ou resultados.

Referências de configuração: [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/quick-start) e [Zustand](https://github.com/pmndrs/zustand).

## Navegação e interação

Abertura: `/`. Lobby: `/?view=lobby`. Catálogo: `/?view=design-system`. As rotas usam History API e preservam o funcionamento dos links de âncora do catálogo. Avançar/voltar do navegador atualiza a vista, e trocar de tela move o foco para seu título. Fechar um formulário devolve o foco à ação que o abriu.

Visitar a Abertura com uma sessão ativa oferece Voltar para a sala. Criar/entrar em outra sala fica bloqueado até sair pelo lobby. A saída do anfitrião encerra sua sala local; convidados saem individualmente. Recarregar no Lobby sem sessão exibe recuperação para a Abertura.

A prévia de rodada apenas muda o estado para Em andamento. Não há perguntas ou resultados nesta etapa. Adicionar pessoa de exemplo é um controle de demonstração, disponível ao anfitrião antes da prévia. A interface usa `canStart` retornado pelo adapter, e o adapter valida novamente cada ação.

A cópia do código utiliza a área de transferência do navegador; se ela estiver bloqueada ou indisponível, o texto orienta selecionar o código e copiar manualmente.

## Validação da etapa 3

- Fluxos de criação, entrada inválida e recuperação, convidado, retomada da sala, saída e prévia do anfitrião conferidos no navegador.
- Abertura, formulário, lobby em três estados, entrada com erro, convidado e recuperação sem sessão conferidos em 320, 375 e 1440 px: sem rolagem horizontal ou imagens quebradas. Catálogo conferido em 1440 px.
- Axe não detectou violações nos critérios WCAG A/AA habilitados nas 25 vistas testadas. Isso não constitui certificação de conformidade. A consulta de saúde foi simulada na verificação visual; testes da API cobrem falhas de rede e HTTP.
- Navegação por histórico, foco inicial no link de pular conteúdo e retorno do foco ao fechar formulários verificados. Demonstração local também conferida com o navegador sem rede.
- 40 testes unitários/de componentes, lint, formatação e build de produção passando. Auditoria de dependências com zero vulnerabilidades no momento da entrega.
