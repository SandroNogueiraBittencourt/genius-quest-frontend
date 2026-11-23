# Integração de salas reais — etapa inicial

A rota `?view=real-room` mostra o lobby multiplayer real, mantendo o protótipo
`?view=lobby` (salas demonstrativas em memória) completamente separado.

O backend usa **UUID completo** como código da sala, não o código curto
`GQ2026` do protótipo. Todo acesso é feito com
`authenticatedRequest` e JWT de sessão já existente, nunca pela chave OpenAI.

Operações: criar/entrar, consultar participantes, escolher tema, votação
e desempate, iniciar partida (somente se houver 10 perguntas válidas),
responder, votar pela continuação, sair e encerrar sala.
As consultas fazem polling moderado (5 s), sem WebSockets.

Todo controle de acesso (anfitrião, participante, intruso) continua no
backend. A leitura de `usuarioId` do JWT no cliente é exclusivamente
para mostrar controles de interface; não concede privilégios.

A aplicação e o banco de produção **não são alterados por este PR**;
publicação do frontend depende da aprovação do CI e de deploy manual.
O protótipo e os testes atuais devem continuar passando.

## Homologação recomendada
Entrar com duas contas de teste em navegadores diferentes, criar sala e
compartilhar UUID, votar no mesmo tema, consultar a pergunta, responder
por ambos, continuar e encerrar. São necessárias 10 perguntas aprovadas
do tema para iniciar; isso é requisito do backend.
