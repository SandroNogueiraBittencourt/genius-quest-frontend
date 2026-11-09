# Etapa 2 — Partida e quiz vinculados ao vencedor

## Subetapa 2.1 (esta branch)

- Rota `/?view=history`: somente um ciclo encerrado com vencedor mostra a ação **Preparar partida com este tema**.
- `POST /api/partidas`: envia **apenas** `cicloId` com JWT. O servidor determina o vencedor e devolve uma partida `PREPARACAO`.
- Rota `/?view=quiz`: mostra **Minhas partidas**, isoladas por usuário, incluindo tema, categoria e ciclo.
- O conteúdo da partida não é um quiz jogável: a UI explica que perguntas, alternativas e pontuação serão adicionadas em etapas posteriores.
- A sala do adapter demonstrativo continua separada da partida real.

## Verificações

- [ ] Testes de API e componentes aprovados
- [ ] Backend V7 aplicado no banco local isolado
- [ ] UI local: criar partida a partir da votação de 3 temas e visualizar na conta do criador
- [ ] Verificar GET de outra conta (backend deve devolver 404)
- [ ] Backups antes de qualquer migração V7 no Render

## Subetapas seguintes

2.2: geração/validação de perguntas por IA no servidor, com fonte de conhecimento, limites e persistência.
2.3: distribuição de perguntas, respostas e correção segura no backend.
2.4: pontuação, conclusão e resultados.
2.5: multiplayer real e integração da sala.
