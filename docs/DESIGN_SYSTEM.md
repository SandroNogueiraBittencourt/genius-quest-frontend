# Design System básico · etapa 2

## Tokens

Fonte canônica: `src/styles/tokens.css`, integrada ao Tailwind CSS 4.

| Token     | Marca             | Valor   |
| --------- | ----------------- | ------- |
| primary   | Roxo Genius       | #6C3BFF |
| secondary | Âmbar Quest       | #FFB347 |
| success   | Menta Certa       | #2EE6A6 |
| error     | Coral Curioso     | #FF6B6B |
| dark      | Meia-noite Genius | #1A1530 |
| light     | Névoa Lilás       | #F5F3FF |
| white     | Branco            | #FFFFFF |

```tsx
<div className="bg-light text-dark rounded-card p-6">
  <h2 className="font-heading text-title">Vamos descobrir juntos?</h2>
</div>
```

Sora 600/700: títulos, perguntas e botões. Inter: corpo, controles e alternativas. Caveat 600: acentos e celebrações. Corpo 18 px, entrelinha 1,5. Escala 14/18/24/32/48 px e pergunta 26 px. Grade de 8 px, cartões com raio 24 px e controles 16 px.

## Contraste e movimento

Branco sobre roxo ou Meia-noite. Texto Meia-noite sobre âmbar, menta e coral. Usar texto de alerta escuro sobre superfícies claras. Não depender apenas de cor para seleção ou resposta correta.

Foco roxo em superfícies claras; menta no escuro. Pulso de pensamento 1,6 s; celebração única 0,7 s. `prefers-reduced-motion` desativa movimentos.

As fontes são locais e os arquivos originais estão documentados em [BRAND.md](BRAND.md). Componentes e catálogo entram nos próximos commits desta branch.
