import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button, Card, Input, Notice } from '../../components/ui';
import { ApiError } from '../../services/http';
import { requestPasswordReset, resetPassword } from './api';
import './Auth.css';

type Mode = 'forgot-password' | 'reset-password';
const CODIGO_VALIDO = /^[0-9]{10}$/;
const normalizarCodigo = (value: string) => value.replace(/[\s-]/g, '');

export function PasswordRecovery({
  mode,
  onNavigate,
}: {
  mode: Mode;
  onNavigate: (view: 'login' | 'forgot-password') => void;
}) {
  const resetting = mode === 'reset-password';
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const request = useRef<AbortController | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const summary = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Higieniza links antigos; um token legado jamais e utilizado pelo novo fluxo.
    const url = new URL(window.location.href);
    if (url.searchParams.has('token')) {
      url.searchParams.delete('token');
      window.history.replaceState({}, '', url);
    }
    return () => request.current?.abort();
  }, []);

  function focusError() {
    setTimeout(() => {
      const field = form.current?.querySelector<HTMLInputElement>(
        '[aria-invalid="true"]',
      );
      if (field) field.focus();
      else summary.current?.focus();
    }, 0);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.current || done) return;
    const next: Record<string, string> = {};
    if (resetting) {
      if (!CODIGO_VALIDO.test(normalizarCodigo(codigo)))
        next.codigo = 'Informe o código de 10 dígitos recebido por e-mail.';
      if (!password.trim() || password.length < 8 || password.length > 72)
        next.password = 'Use uma senha entre 8 e 72 caracteres.';
      if (!confirmation || confirmation !== password)
        next.confirmation = 'As senhas precisam ser iguais.';
    } else {
      const input = event.currentTarget.elements.namedItem(
        'email',
      ) as HTMLInputElement;
      if (!email.trim()) next.email = 'Informe seu e-mail.';
      else if (input.validity.typeMismatch || email.trim().length > 150)
        next.email = 'Informe um e-mail válido de até 150 caracteres.';
    }
    setErrors(next);
    setMessage('');
    if (Object.keys(next).length) {
      focusError();
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    try {
      if (resetting)
        await resetPassword(
          normalizarCodigo(codigo),
          password,
          controller.signal,
        );
      else await requestPasswordReset(email, controller.signal);
      if (controller.signal.aborted) return;
      setCodigo('');
      setPassword('');
      setConfirmation('');
      setDone(true);
    } catch (error) {
      if (controller.signal.aborted) return;
      if (
        resetting &&
        error instanceof ApiError &&
        error.status === 400 &&
        !error.fields.novaSenha
      ) {
        // Evita distinguir entre codigo inexistente, expirado ou consumido.
        setMessage(
          'Código inválido, expirado ou já utilizado. Confira o código ou solicite outro.',
        );
      } else if (error instanceof ApiError) {
        setErrors(
          resetting
            ? { password: error.fields.novaSenha }
            : { email: error.fields.email },
        );
        setMessage(error.message);
      } else {
        setMessage('Não foi possível concluir a solicitação. Tente novamente.');
      }
      focusError();
    } finally {
      if (!controller.signal.aborted) {
        request.current = null;
        setPending(false);
      }
    }
  }

  return (
    <section className="auth-recovery" aria-labelledby="recovery-title">
      <Card className="auth-card">
        <span className="gq-kicker">Sua conta Genius Quest</span>
        <h1 id="recovery-title">
          {resetting ? 'Redefinir senha' : 'Esqueci minha senha'}
        </h1>
        <p className="auth-intro">
          {resetting
            ? 'Digite o código enviado para seu e-mail e escolha uma nova senha. O código expira em 15 minutos.'
            : 'Informe seu e-mail para receber um código de recuperação de senha.'}
        </p>
        {done ? (
          <p className="auth-success" role="status">
            {resetting
              ? 'Senha redefinida! Entre com sua nova senha.'
              : 'Se houver uma conta com este e-mail, você receberá um código para redefinir sua senha. O código expira em 15 minutos.'}
          </p>
        ) : (
          <form
            ref={form}
            noValidate
            onSubmit={(event) => void submit(event)}
            aria-busy={pending}
          >
            <fieldset className="auth-fields" disabled={pending}>
              <legend className="gq-sr-only">
                {resetting ? 'Código e nova senha' : 'E-mail de recuperação'}
              </legend>
              {resetting ? (
                <>
                  <Input
                    id="recovery-code"
                    name="codigo"
                    label="Código de recuperação"
                    type="text"
                    value={codigo}
                    onChange={(event) => {
                      setCodigo(event.target.value);
                      setErrors({});
                      setMessage('');
                    }}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    maxLength={24}
                    required
                    hint="10 dígitos."
                    error={errors.codigo}
                  />
                  <Input
                    id="recovery-password"
                    label="Nova senha"
                    type={visible ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setErrors({});
                      setMessage('');
                    }}
                    autoComplete="new-password"
                    maxLength={72}
                    required
                    hint="Use entre 8 e 72 caracteres."
                    error={errors.password}
                  />
                  <Input
                    id="recovery-confirmation"
                    label="Confirme a nova senha"
                    type={visible ? 'text' : 'password'}
                    value={confirmation}
                    onChange={(event) => {
                      setConfirmation(event.target.value);
                      setErrors({});
                      setMessage('');
                    }}
                    autoComplete="new-password"
                    maxLength={72}
                    required
                    error={errors.confirmation}
                  />
                  <Button
                    variant="ghost"
                    className="auth-reveal"
                    aria-controls="recovery-password recovery-confirmation"
                    aria-pressed={visible}
                    onClick={() => setVisible(!visible)}
                  >
                    {visible ? 'Ocultar senhas' : 'Mostrar senhas'}
                  </Button>
                </>
              ) : (
                <Input
                  name="email"
                  label="E-mail"
                  type="email"
                  autoComplete="email"
                  value={email}
                  maxLength={150}
                  required
                  placeholder="voce@exemplo.com"
                  error={errors.email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setErrors({});
                    setMessage('');
                  }}
                />
              )}
            </fieldset>
            {message && (
              <div className="auth-error-summary" ref={summary} tabIndex={-1}>
                <Notice message={message} />
              </div>
            )}
            <Button
              type="submit"
              variant="secondary"
              className="auth-submit"
              busy={pending}
              loadingLabel="Enviando…"
            >
              {resetting ? 'Salvar nova senha' : 'Enviar código de recuperação'}
            </Button>
          </form>
        )}
        {resetting && !done && (
          <p className="auth-switch">
            <a
              href="/?view=forgot-password"
              onClick={(event) => {
                if (
                  !event.ctrlKey &&
                  !event.metaKey &&
                  !event.shiftKey &&
                  !event.altKey &&
                  event.button === 0
                ) {
                  event.preventDefault();
                  onNavigate('forgot-password');
                }
              }}
            >
              Solicitar novo código
            </a>
          </p>
        )}
        <p className="auth-switch">
          <a
            href="/?view=login"
            onClick={(event) => {
              if (
                !event.ctrlKey &&
                !event.metaKey &&
                !event.shiftKey &&
                !event.altKey &&
                event.button === 0
              ) {
                event.preventDefault();
                onNavigate('login');
              }
            }}
          >
            Voltar para entrar
          </a>
        </p>
      </Card>
    </section>
  );
}
