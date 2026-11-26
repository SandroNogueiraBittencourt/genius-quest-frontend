import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from 'react';
import { Button, Input, Notice } from '../../components/ui';
import { ApiError } from '../../services/http';
import { changePassword } from './api';
import { passwordError, passwordHint } from './passwordPolicy';
import { useAuthStore } from './store';
import type { AuthSession } from './types';
import { userIdFromJwt } from './userIdFromJwt';

type Field = 'senhaAtual' | 'novaSenha' | 'confirmacao';
type FieldErrors = Partial<Record<Field, string>>;

export function ChangePasswordForm({
  session,
  disabled,
  onPasswordChanged,
  onForgotPassword,
}: {
  session: AuthSession;
  disabled: boolean;
  onPasswordChanged: (email: string) => void;
  onForgotPassword: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || request.current) return;

    const values = new FormData(event.currentTarget);
    const senhaAtual = String(values.get('senhaAtual') ?? '');
    const novaSenha = String(values.get('novaSenha') ?? '');
    const confirmacao = String(values.get('confirmacao') ?? '');
    const next: FieldErrors = {};
    if (!senhaAtual.trim()) next.senhaAtual = 'Informe sua senha atual.';
    else if (new TextEncoder().encode(senhaAtual).length > 72)
      next.senhaAtual = 'A senha atual excede o limite de 72 bytes.';
    const invalidPassword = passwordError(novaSenha);
    if (invalidPassword) next.novaSenha = invalidPassword;
    if (!confirmacao || confirmacao !== novaSenha)
      next.confirmacao = 'As novas senhas precisam ser iguais.';
    setErrors(next);
    setMessage('');
    if (Object.keys(next).length) return;

    const userId = userIdFromJwt(session.token);
    if (!userId) {
      setMessage('Não foi possível identificar sua conta. Entre novamente.');
      return;
    }

    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    try {
      await changePassword(userId, senhaAtual, novaSenha, controller.signal);
      if (controller.signal.aborted) return;
      const auth = useAuthStore.getState();
      if (auth.session?.token === session.token) {
        auth.end('password-changed', session.token);
        onPasswordChanged(session.email);
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError) {
        if (
          error.status === 403 &&
          error.message === 'A senha atual está incorreta.'
        )
          setErrors({ senhaAtual: error.message });
        else {
          setErrors({
            senhaAtual: error.fields.senhaAtual,
            novaSenha: error.fields.novaSenha,
          });
          setMessage(error.message);
        }
      } else {
        setMessage('Não foi possível alterar a senha. Tente novamente.');
      }
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setPending(false);
    }
  }

  return (
    <section
      className="auth-change-password"
      aria-labelledby="change-password-title"
    >
      <h2 id="change-password-title">Alterar senha</h2>
      <form
        noValidate
        onSubmit={(event) => void submit(event)}
        aria-busy={pending}
      >
        <fieldset className="auth-fields" disabled={disabled || pending}>
          <Input
            name="senhaAtual"
            label="Senha atual"
            type="password"
            autoComplete="current-password"
            required
            error={errors.senhaAtual}
          />
          <Input
            name="novaSenha"
            label="Nova senha"
            type="password"
            autoComplete="new-password"
            required
            hint={passwordHint}
            error={errors.novaSenha}
          />
          <Input
            name="confirmacao"
            label="Confirme a nova senha"
            type="password"
            autoComplete="new-password"
            required
            error={errors.confirmacao}
          />
        </fieldset>
        {message && <Notice message={message} />}
        <Button
          type="submit"
          variant="secondary"
          className="auth-submit"
          disabled={disabled}
          busy={pending}
          loadingLabel="Salvando senha…"
        >
          Alterar senha
        </Button>
      </form>
      <p className="auth-switch">
        <a href="/?view=forgot-password" onClick={onForgotPassword}>
          Esqueci minha senha
        </a>
      </p>
    </section>
  );
}
