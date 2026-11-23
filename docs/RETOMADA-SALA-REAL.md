# Continuidade da sala real para demonstrações

A interface `?view=real-room` já usa a API do backend (não usa `demoGateway`).
Este ajuste guarda **apenas o UUID da sala** no `sessionStorage` da aba,
vinculado ao UUID do jogador extraído do JWT para apresentação visual.

- Reabrir a página `Sala real` na mesma aba tenta consultar a sala antiga,
  desde que exista uma sessão autenticada válida.
- O JWT não é persistido. Após recarregar toda a página, o usuário precisa
  entrar novamente, e a sala poderá ser restaurada com a mesma conta.
- Outra conta não vê automaticamente a sala anterior.
- Saída, troca de sala e escolha de criar outra sala limpam o UUID salvo.
- Se a sala foi encerrada ou o jogador foi removido, a interface permite
  esquecer o código salvo e informar outro.
- Se o `sessionStorage` estiver indisponível, a sala continua utilizável,
  apenas sem retomada automática.
- A autorização e a identidade sempre são verificadas **no backend**,
  nunca pelo UUID armazenado localmente.

`npm ci && npm run lint && npm test && npm run build` devem passar no CI
antes do merge. Esta PR não altera backend, banco, API, chaves ou Render.
