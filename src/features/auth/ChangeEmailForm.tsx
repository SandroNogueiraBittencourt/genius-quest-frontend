import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button, Input, Notice } from '../../components/ui';
import { ApiError } from '../../services/http';
import { confirmEmailChange, requestEmailChange } from './api';
import { useAuthStore } from './store';
import type { AuthSession } from './types';

export function ChangeEmailForm({
  session,
  userId,
  disabled,
  onEmailChanged,
}: {
  session: AuthSession;
  userId: string;
  disabled: boolean;
  onEmailChanged: (email: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [destination, setDestination] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  function reset(close: boolean) {
    setMessage('');
    setDestination('');
    if (close) setOpen(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || request.current) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get('email') ?? '')
      .trim()
      .toLowerCase();
    const senhaAtual = String(data.get('senhaAtual') ?? '');
    const codigo = String(data.get('codigo') ?? '').replace(/[\s-]/g, '');

    if (destination && !/^[0-9]{10}$/.test(codigo)) {
      setMessage('Informe o código de 10 dígitos recebido por e-mail.');
      return;
    }
    if (!destination) {
      const input = form.elements.namedItem('email') as HTMLInputElement;
      if (!email || input.validity.typeMismatch || email.length > 150) {
        setMessage('Informe um novo e-mail válido.');
        return;
      }
      if (email === session.email) {
        setMessage('Informe um e-mail diferente do atual.');
        return;
      }
      if (!senhaAtual || new TextEncoder().encode(senhaAtual).length > 72) {
        setMessage('Informe sua senha atual.');
        return;
      }
    }

    const controller = new AbortController();
    request.current = controller;
    setMessage('');
    setPending(true);
    try {
      if (destination) {
        await confirmEmailChange(codigo, controller.signal);
        if (
          !controller.signal.aborted &&
          useAuthStore.getState().session?.token === session.token
        ) {
          useAuthStore.getState().end('email-changed', session.token);
          onEmailChanged(destination);
        }
      } else {
        await requestEmailChange(userId, email, senhaAtual, controller.signal);
        if (!controller.signal.aborted) setDestination(email);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setMessage(
          error instanceof ApiError
            ? error.status === 409
              ? 'Esse e-mail já está em uso. Escolha outro endereço.'
              : error.message
            : 'Não foi possível concluir a troca de e-mail. Tente novamente.',
        );
      }
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setPending(false);
    }
  }

  return (
    <section className="auth-change-email" aria-labelledby="change-email-title">
      <h2 id="change-email-title">Alterar e-mail</h2>
      {!open ? (
        <Button
          variant="outline"
          disabled={disabled}
          onClick={() => setOpen(true)}
        >
          Alterar e-mail
        </Button>
      ) : (
        <form
          key={destination}
          noValidate
          aria-busy={pending}
          onSubmit={(event) => void submit(event)}
        >
          {destination && (
            <p role="status">
              Enviamos um código para <strong>{destination}</strong>. Ele vale
              por 15 minutos.
            </p>
          )}
          <fieldset className="auth-fields" disabled={disabled || pending}>
            {destination ? (
              <Input
                label="Código de confirmação da troca"
                name="codigo"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={64}
                required
              />
            ) : (
              <>
                <Input
                  label="Novo e-mail"
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={150}
                  required
                />
                <Input
                  label="Senha atual para trocar e-mail"
                  name="senhaAtual"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </>
            )}
          </fieldset>
          {message && <Notice message={message} />}
          <div className="auth-connected-actions">
            <Button
              type="submit"
              variant="secondary"
              disabled={disabled}
              busy={pending}
            >
              {destination ? 'Confirmar troca de e-mail' : 'Enviar código'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={disabled || pending}
              onClick={() => reset(!destination)}
            >
              {destination ? 'Informar e-mail novamente' : 'Cancelar'}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
