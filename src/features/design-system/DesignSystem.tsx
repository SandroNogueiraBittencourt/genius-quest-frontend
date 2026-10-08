import { useState, type ReactNode } from 'react';
import {
  Avatar,
  Button,
  Card,
  Input,
  Notice,
  ProgressBar,
} from '../../components/ui';

const palette = [
  ['primary', 'Roxo Genius', '#6C3BFF'],
  ['secondary', 'Âmbar Quest', '#FFB347'],
  ['success', 'Menta Certa', '#2EE6A6'],
  ['error', 'Coral Curioso', '#FF6B6B'],
  ['dark', 'Meia-noite Genius', '#1A1530'],
  ['light', 'Névoa Lilás', '#F5F3FF'],
  ['white', 'Branco', '#FFFFFF'],
];
export function DesignSystem({
  apiStatus,
  backLink,
}: {
  apiStatus: ReactNode;
  backLink?: ReactNode;
}) {
  const [progress, setProgress] = useState(4);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [celebration, setCelebration] = useState(0);
  return (
    <>
      <a className="ds-skip" href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className="ds-header">
        <a href="#conteudo" aria-label="Genius Quest, início do catálogo">
          <img
            src="/brand/genius-quest-horizontal.svg"
            width="200"
            alt="Genius Quest"
          />
        </a>
        <div className="ds-header-meta">
          <span className="ds-tag">Design System · etapa 02</span>
          {backLink}
        </div>
      </header>
      <main id="conteudo" tabIndex={-1} className="ds-main">
        <section
          className="ds-hero"
          data-surface="dark"
          aria-labelledby="titulo"
        >
          <div>
            <span className="ds-eyebrow">Nossa base para descobrir juntos</span>
            <h1 id="titulo">
              Cada pergunta,
              <br />
              uma nova memória.
            </h1>
            <p>
              Uma linguagem visual acolhedora, clara e acessível para todas as
              gerações.
            </p>
            <a href="#componentes" className="ds-hero-link">
              Explorar os componentes <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className="ds-brand-sample">
            <img
              src="/brand/genius-quest-mono-light.svg"
              alt="Versão clara da marca Genius Quest"
              width="220"
            />
            <span className="ds-affection">A curiosidade aproxima.</span>
          </div>
        </section>
        <div className="ds-intro">
          <p>Catálogo de referência</p>
          <span>
            Assets originais · fontes locais · componentes reutilizáveis
          </span>
        </div>
        <section className="ds-section" aria-labelledby="cores">
          <div className="ds-section-title">
            <span className="ds-number" aria-hidden="true">
              01
            </span>
            <div>
              <h2 id="cores">Cores que contam nossa história</h2>
              <p>
                As cores da marca, com combinações de texto que preservam a
                leitura.
              </p>
            </div>
          </div>
          <ul className="ds-palette">
            {palette.map(([token, label, hex]) => (
              <li key={token}>
                <div
                  className={`ds-swatch ds-swatch--${token}`}
                  aria-hidden="true"
                />
                <strong>{label}</strong>
                <code>{hex}</code>
                <span>{token}</span>
              </li>
            ))}
          </ul>
          <p className="ds-note">
            Use texto escuro sobre âmbar, menta e coral. Branco sobre roxo e
            Meia-noite Genius.
          </p>
        </section>
        <section className="ds-section" aria-labelledby="tipografia">
          <div className="ds-section-title">
            <span className="ds-number" aria-hidden="true">
              02
            </span>
            <div>
              <h2 id="tipografia">Uma voz, três expressões</h2>
              <p>Tipografia com personalidade e conforto de leitura.</p>
            </div>
          </div>
          <div className="ds-grid ds-type-grid">
            <Card>
              <span className="ds-label">Sora · títulos e botões</span>
              <p className="ds-type-heading">
                Vamos descobrir
                <br />
                juntos?
              </p>
              <p>Semibold 600 / Bold 700</p>
            </Card>
            <Card>
              <span className="ds-label">Inter · corpo e instruções</span>
              <p className="ds-type-body">
                O melhor da pergunta é a conversa que vem depois.
              </p>
              <p>
                Regular 400 / Medium 500
                <br />
                Base 18 px · entrelinha 1,5
              </p>
            </Card>
            <Card>
              <span className="ds-label">Caveat · afeto e celebração</span>
              <p className="ds-type-accent">
                Mais uma memória
                <br />
                para a turma.
              </p>
              <p>Semibold 600 · uso pontual</p>
            </Card>
          </div>
        </section>
        <section className="ds-section" aria-labelledby="componentes">
          <div className="ds-section-title">
            <span className="ds-number" aria-hidden="true">
              03
            </span>
            <div>
              <h2 id="componentes">Peças para cada descoberta</h2>
              <p>
                Experimente os estados dos componentes usando mouse ou teclado.
              </p>
            </div>
          </div>
          <div className="ds-grid ds-component-grid">
            <Card className="ds-buttons">
              <h3>Botões</h3>
              <p>Ações claras, áreas de toque confortáveis e foco visível.</p>
              <div className="ds-button-list">
                <Button
                  onClick={() =>
                    setMessage('Ação principal acionada neste catálogo.')
                  }
                >
                  Ação principal
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    setMessage('Ação acolhedora acionada neste catálogo.')
                  }
                >
                  Reunir a turma
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    setMessage('Ação secundária acionada neste catálogo.')
                  }
                >
                  Entrar em uma sala
                </Button>
                <Button
                  variant="ghost"
                  onClick={() =>
                    setMessage('Ação discreta acionada neste catálogo.')
                  }
                >
                  Voltar
                </Button>
                <Button busy loadingLabel="Preparando…">
                  Preparando
                </Button>
                <Button disabled>Indisponível</Button>
              </div>
              <p className="ds-note">
                Os exemplos demonstram aparência e interação local.
              </p>
              {message && (
                <p role="status" className="ds-feedback">
                  {message}
                </p>
              )}
            </Card>
            <Card>
              <h3>Campos e feedback</h3>
              <p>
                Instruções próximas ao campo e erros explicados com gentileza.
              </p>
              <form
                className="ds-form"
                noValidate
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!name.trim()) {
                    setError('Conte como podemos chamar você.');
                    return;
                  }
                  setError('');
                  setMessage(
                    `Tudo certo, ${name.trim()}! Este é um exemplo local.`,
                  );
                }}
              >
                <Input
                  label="Seu nome"
                  placeholder="Como podemos chamar você?"
                  autoComplete="given-name"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setError('');
                  }}
                  hint="Use o nome que você gosta de ouvir."
                  error={error}
                  required
                />
                <Input
                  label="Exemplo de código com erro"
                  defaultValue="GQ"
                  error="O código precisa ter 6 caracteres."
                />
                <Input
                  label="Campo indisponível"
                  placeholder="Aguardando a próxima etapa"
                  disabled
                />
                <Button type="submit" variant="outline">
                  Testar campo de nome
                </Button>
              </form>
            </Card>
            <Card>
              <h3>Progresso e participantes</h3>
              <p>
                O progresso comunica o avanço da rodada. Não representa
                pontuação.
              </p>
              <div className="ds-progress-label">
                <strong>Rodada demonstrativa</strong>
                <span>{progress}/10</span>
              </div>
              <ProgressBar
                label="Progresso da rodada demonstrativa"
                value={progress}
                max={10}
              />
              <div className="ds-inline-controls">
                <Button
                  variant="outline"
                  disabled={progress === 0}
                  onClick={() => setProgress((value) => Math.max(0, value - 1))}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  disabled={progress === 10}
                  onClick={() =>
                    setProgress((value) => Math.min(10, value + 1))
                  }
                >
                  Avançar
                </Button>
              </div>
              <ul className="ds-people">
                {['Ana Lima', 'Pedro Santos', 'Maria Costa'].map(
                  (person, index) => (
                    <li key={person}>
                      <Avatar name={person} index={index} />
                      <span>{person}</span>
                    </li>
                  ),
                )}
              </ul>
            </Card>
            <Card>
              <h3>Mensagens e movimento</h3>
              <Notice message="Algo parece estranho? Ofereça sempre uma forma de revisar e reportar." />
              <div className="ds-thinking">
                <span
                  className="ui-thinking ds-thinking-dot"
                  aria-hidden="true"
                />
                <span>Preparando uma descoberta…</span>
              </div>
              <p className="ds-note">
                Pulso suave de 1,6 s. Movimento desativado quando solicitado
                pelo dispositivo.
              </p>
              <p
                key={celebration}
                className={
                  celebration ? 'ds-type-accent ui-celebrate' : 'ds-type-accent'
                }
              >
                Descobrir é melhor junto!
              </p>
              <Button
                variant="outline"
                onClick={() => setCelebration((value) => value + 1)}
              >
                Experimentar celebração
              </Button>
            </Card>
          </div>
        </section>
        <section
          className="ds-closing"
          data-surface="dark"
          aria-labelledby="acessibilidade"
        >
          <div>
            <h2 id="acessibilidade">Conforto para participar.</h2>
            <p>
              Texto legível, navegação por teclado, foco visível e respeito às
              preferências de movimento.
            </p>
          </div>
          <span className="ds-affection">
            Dos 12 aos 99,
            <br />a curiosidade não tem idade.
          </span>
        </section>
      </main>
      <footer className="ds-footer">
        <span>Genius Quest · Design System básico</span>
        {apiStatus}
      </footer>
    </>
  );
}
