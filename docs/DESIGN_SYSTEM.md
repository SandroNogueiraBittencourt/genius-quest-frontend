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

As fontes são locais e os arquivos originais estão documentados em [BRAND.md](BRAND.md). O catálogo interativo é a tela inicial desta branch. Rode `npm run dev` para conferir cores, fontes, componentes e seus estados. Os exemplos usam apenas estado local; a consulta de saúde da API existente permanece no rodapé.

## Componentes

| Componente  | Propriedades principais                                   | Comportamento                                                                     |
| ----------- | --------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Button      | variant, busy, loadingLabel, disabled e atributos nativos | Primary, secondary, outline, ghost; bloqueio de ação pendente; type button padrão |
| Card        | className e atributos div                                 | Superfície clara e raio 24 px                                                     |
| Input       | label, hint, error e atributos nativos                    | Label associado, descrições combinadas, erro anunciado                            |
| ProgressBar | value, max, label                                         | Progresso normalizado com semântica acessível                                     |
| Avatar      | name, index                                               | Iniciais decorativas; mostrar o nome legível ao lado                              |
| Notice      | message                                                   | Alerta textual que acompanha a cor                                                |

```tsx
import { Button, Card, Input, ProgressBar } from './components/ui';

<Card>
  <Input label="Nome" hint="Como podemos chamar você?" required />
  <Button type="submit" variant="secondary">
    Reunir a turma
  </Button>
  <ProgressBar label="Progresso da rodada" value={4} max={10} />
</Card>;
```

Em formulários, use `type="submit"` explicitamente. `busy` anuncia a operação e bloqueia novos cliques. A segurança e a idempotência continuam sendo responsabilidade do backend.

## Catálogo e verificações

`src/features/design-system` reúne os exemplos. O catálogo demonstra validação de formulário, progresso limitado a 0–10, botões, mensagens e movimento. Não é uma tela de jogo e não calcula pontuação, moedas ou elegibilidade.

Vitest + RTL verificam os componentes e as interações do catálogo. Os testes de tokens leem o CSS fonte e calculam o contraste das combinações documentadas. Isso não substitui a avaliação de acessibilidade de cada tela futura.

Para trabalhar com as fontes e a marca, preserve os arquivos originais em `public/brand`, `public/fonts` e `public/favicon.svg`, incluindo as licenças.

## Validação desta entrega

- 21 testes passando: API, estados da aplicação, componentes, catálogo e contraste dos tokens.
- Lint, formatação e build de produção passando.
- Catálogo conferido em 320, 375 e 1440 px, sem rolagem horizontal ou imagens quebradas.
- Axe não detectou violações nos critérios WCAG A/AA habilitados nas vistas testadas. A consulta de saúde foi simulada nessa verificação visual; testes unitários cobrem a indisponibilidade real. Isso não constitui certificação de conformidade.
- Foco inicial no link de pular para o conteúdo e movimento desativado com `prefers-reduced-motion: reduce`.
