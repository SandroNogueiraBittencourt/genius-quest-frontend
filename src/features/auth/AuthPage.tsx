import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from 'react';
import { Button, Card, Input, Notice } from '../../components/ui';
import { ApiError } from '../../services/http';
import { login, register } from './api';
import { useAuthStore } from './store';
import './Auth.css';
export type AuthMode = 'login' | 'register';
type Field = 'nome' | 'email' | 'senha' | 'confirmacao';
type Errors = Partial<Record<Field, string>>;
type Props = {
  mode: AuthMode;
  initialEmail?: string;
  registered?: boolean;
  onSwitch: (mode: AuthMode) => void;
  onRegistered: (email: string) => void;
  onSignedIn: () => void;
};
export function AuthPage({
  mode,
  initialEmail = '',
  registered = false,
  onSwitch,
  onRegistered,
  onSignedIn,
}: Props) {
  const isRegister = mode === 'register';
  const [nome, setNome] = useState(''),
    [email, setEmail] = useState(initialEmail),
    [senha, setSenha] = useState(''),
    [confirmacao, setConfirmacao] = useState('');
  const [visible, setVisible] = useState(false),
    [pending, setPending] = useState(false),
    [errors, setErrors] = useState<Errors>({}),
    [message, setMessage] = useState('');
  const formRef = useRef<HTMLFormElement>(null),
    summaryRef = useRef<HTMLDivElement>(null),
    requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => requestRef.current?.abort(), []);
  function focusError() {
    setTimeout(() => {
      const field = formRef.current?.querySelector<HTMLInputElement>(
        '[aria-invalid="true"]',
      );
      if (field) field.focus();
      else summaryRef.current?.focus();
    }, 0);
  }
  function changed(field: Field) {
    setErrors((current) => ({ ...current, [field]: undefined }));
    setMessage('');
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestRef.current) return;
    const next: Errors = {};
    if (isRegister && (nome.trim().length < 3 || nome.trim().length > 100))
      next.nome = 'Informe um nome entre 3 e 100 caracteres.';
    const emailInput = event.currentTarget.elements.namedItem(
      'email',
    ) as HTMLInputElement;
    if (!email.trim()) next.email = 'Informe seu e-mail.';
    else if (emailInput.validity.typeMismatch || email.trim().length > 150)
      next.email = 'Informe um e-mail válido de até 150 caracteres.';
    if (!senha.trim()) next.senha = 'Informe sua senha.';
    else if (isRegister && (senha.length < 8 || senha.length > 72))
      next.senha = 'Use uma senha entre 8 e 72 caracteres.';
    if (isRegister && confirmacao !== senha)
      next.confirmacao = 'As senhas precisam ser iguais.';
    setErrors(next);
    setMessage('');
    if (Object.keys(next).length) {
      focusError();
      return;
    }
    const controller = new AbortController();
    requestRef.current = controller;
    setPending(true);
    try {
      if (isRegister) {
        const user = await register({ nome, email, senha }, controller.signal);
        if (controller.signal.aborted) return;
        setSenha('');
        setConfirmacao('');
        onRegistered(user.email);
      } else {
        const response = await login({ email, senha }, controller.signal);
        if (controller.signal.aborted) return;
        setSenha('');
        useAuthStore.getState().start(response, email);
        onSignedIn();
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      const fields: Errors = {};
      if (error instanceof ApiError) {
        for (const field of ['nome', 'email', 'senha'] as const)
          if (error.fields[field]) fields[field] = error.fields[field];
        if (isRegister && error.status === 409)
          fields.email = 'Este e-mail já está cadastrado. Entre na sua conta.';
        setErrors(fields);
        setMessage(
          !isRegister && error.status === 401
            ? 'E-mail ou senha inválidos. Confira os dados e tente novamente.'
            : Object.keys(fields).length
              ? 'Revise os campos indicados para continuar.'
              : error.status === 403
                ? 'Você não tem permissão para realizar esta ação.'
                : error.message,
        );
      } else
        setMessage('Não foi possível concluir a solicitação. Tente novamente.');
      focusError();
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
      if (!controller.signal.aborted) setPending(false);
    }
  }
  function switchMode(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    onSwitch(isRegister ? 'login' : 'register');
  }
  return (
    <section className="auth-layout" aria-labelledby="auth-title">
      <aside
        className="auth-welcome"
        data-surface="dark"
        aria-label="Bem-vindo ao Genius Quest"
      >
        <span className="gq-eyebrow">Uma conta. Muitas descobertas.</span>
        <img
          src="/brand/genius-quest-icon.svg"
          width="144"
          height="144"
          alt="Símbolo original Genius Quest"
        />
        <h2>A curiosidade aproxima.</h2>
        <p>
          Um lugar para aprender, compartilhar histórias e criar novas memórias
          com quem você gosta.
        </p>
        <span className="auth-affection">Que bom ter você aqui.</span>
      </aside>
      <Card className="auth-card">
        <span className="gq-kicker">Sua conta Genius Quest</span>
        <h1 id="auth-title">
          {isRegister ? 'Vamos descobrir juntos?' : 'Bom ter você de volta.'}
        </h1>
        <p className="auth-intro">
          {isRegister
            ? 'Crie sua conta para fazer parte das próximas descobertas.'
            : 'Entre na sua conta e continue sua jornada.'}
        </p>
        {registered && !isRegister && (
          <p className="auth-success" role="status">
            Conta criada! Entre com seu e-mail e senha para continuar.
          </p>
        )}
        <form
          ref={formRef}
          noValidate
          onSubmit={(event) => void submit(event)}
          aria-busy={pending}
        >
          <fieldset disabled={pending} className="auth-fields">
            <legend className="gq-sr-only">
              {isRegister ? 'Dados para criar sua conta' : 'Dados para entrar'}
            </legend>
            {isRegister && (
              <Input
                id="auth-name"
                name="nome"
                label="Como podemos chamar você?"
                value={nome}
                onChange={(event) => {
                  setNome(event.target.value);
                  changed('nome');
                }}
                autoComplete="name"
                maxLength={100}
                required
                hint="Entre 3 e 100 caracteres."
                error={errors.nome}
              />
            )}
            <Input
              id="auth-email"
              name="email"
              type="email"
              label="E-mail"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                changed('email');
              }}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              inputMode="email"
              maxLength={150}
              required
              placeholder="voce@exemplo.com"
              error={errors.email}
            />
            <div className="auth-password">
              <Input
                id="auth-password"
                name="senha"
                type={visible ? 'text' : 'password'}
                label="Senha"
                value={senha}
                onChange={(event) => {
                  setSenha(event.target.value);
                  changed('senha');
                }}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                maxLength={isRegister ? 72 : undefined}
                required
                hint={isRegister ? 'Use entre 8 e 72 caracteres.' : undefined}
                error={errors.senha}
              />
              <Button
                className="auth-reveal"
                variant="ghost"
                aria-controls="auth-password"
                aria-pressed={visible}
                onClick={() => setVisible((value) => !value)}
              >
                {visible ? 'Ocultar senha' : 'Mostrar senha'}
              </Button>
            </div>
            {isRegister && (
              <Input
                id="auth-confirm"
                name="confirmacao"
                type={visible ? 'text' : 'password'}
                label="Confirme a senha"
                value={confirmacao}
                onChange={(event) => {
                  setConfirmacao(event.target.value);
                  changed('confirmacao');
                }}
                autoComplete="new-password"
                maxLength={72}
                required
                error={errors.confirmacao}
              />
            )}
          </fieldset>
          {message && (
            <div ref={summaryRef} tabIndex={-1} className="auth-error-summary">
              <Notice message={message} />
            </div>
          )}
          <Button
            type="submit"
            variant="secondary"
            className="auth-submit"
            busy={pending}
            loadingLabel={isRegister ? 'Criando sua conta…' : 'Entrando…'}
          >
            {isRegister ? 'Criar minha conta' : 'Entrar na minha conta'}
          </Button>
        </form>
        <p className="auth-switch">
          {isRegister ? 'Já tem uma conta?' : 'Ainda não tem uma conta?'}{' '}
          <a
            href={isRegister ? '?view=login' : '?view=register'}
            onClick={switchMode}
          >
            {isRegister ? 'Entrar' : 'Criar conta'}
          </a>
        </p>
      </Card>
    </section>
  );
}
export function ConnectedAccount({
  onHome,
  onLogout,
}: {
  onHome: () => void;
  onLogout: () => void;
}) {
  const session = useAuthStore((state) => state.session);
  return (
    <Card className="auth-connected">
      <span className="gq-kicker">Sua conta Genius Quest</span>
      <h1>Você está conectado.</h1>
      <p>
        Seu e-mail: <strong>{session?.email}</strong>
      </p>
      <p>A sessão está ativa nesta aba.</p>
      <div className="auth-connected-actions">
        <Button variant="secondary" onClick={onHome}>
          Voltar à abertura
        </Button>
        <Button variant="outline" onClick={onLogout}>
          Sair da minha conta
        </Button>
      </div>
    </Card>
  );
}
