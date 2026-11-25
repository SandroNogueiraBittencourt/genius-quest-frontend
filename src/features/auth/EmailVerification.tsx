import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button, Card, Input, Notice } from '../../components/ui';
import { ApiError } from '../../services/http';
import { resendEmailVerification, verifyEmail } from './api';
import './Auth.css';

type Props = {
  initialEmail: string;
  onVerified: (email: string) => void;
  onBack: () => void;
};

export function EmailVerification({ initialEmail, onVerified, onBack }: Props) {
  const address = initialEmail.trim().toLowerCase();
  const [codigo, setCodigo] = useState('');
  const [pending, setPending] = useState<'verify' | 'resend' | null>(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const form = useRef<HTMLFormElement>(null);
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => request.current?.abort(), []);

  function clearFeedback() {
    setError('');
    setFeedback('');
  }

  async function send(action: 'verify' | 'resend') {
    if (request.current || !form.current || !address) return;
    clearFeedback();
    const normalizedCode = codigo.replace(/[\s-]/g, '');
    if (action === 'verify' && !/^[0-9]{10}$/.test(normalizedCode)) {
      setError('Informe os 10 dígitos do código recebido.');
      form.current
        .querySelector<HTMLInputElement>('#verification-code')
        ?.focus();
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setPending(action);
    try {
      if (action === 'verify') {
        await verifyEmail(address, normalizedCode, controller.signal);
        if (!controller.signal.aborted) onVerified(address);
      } else {
        await resendEmailVerification(address, controller.signal);
        if (!controller.signal.aborted) {
          setCodigo('');
          setFeedback(
            'Se este e-mail estiver pendente de confirmação, você receberá um novo código.',
          );
        }
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(
          cause instanceof ApiError
            ? cause.message
            : 'Não foi possível concluir a solicitação. Tente novamente.',
        );
      }
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setPending(null);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send('verify');
  }

  return (
    <section className="auth-verification" aria-labelledby="verification-title">
      <Card className="auth-card auth-verification-card">
        <header className="auth-verification-heading">
          <h1 id="verification-title">Confirme seu e-mail</h1>
          <p className="auth-intro">
            {address
              ? 'Digite o código enviado ao seu e-mail. Ele expira em 15 minutos.'
              : 'Volte ao login para continuar a confirmação da sua conta.'}
          </p>
        </header>
        {address && (
          <form
            className="auth-verification-form"
            ref={form}
            noValidate
            onSubmit={submit}
            aria-busy={!!pending}
          >
            <fieldset className="auth-fields" disabled={!!pending}>
              <legend className="gq-sr-only">
                Dados para confirmar o e-mail
              </legend>
              <Input
                id="verification-code"
                name="codigo"
                label="Código de verificação"
                autoComplete="one-time-code"
                inputMode="numeric"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={64}
                required
                value={codigo}
                onChange={(event) => {
                  setCodigo(event.target.value);
                  clearFeedback();
                }}
              />
            </fieldset>
            {error && <Notice message={error} />}
            {feedback && (
              <p className="auth-success" role="status">
                {feedback}
              </p>
            )}
            <Button
              type="submit"
              variant="secondary"
              className="auth-verification-submit"
              disabled={!!pending}
              busy={pending === 'verify'}
              loadingLabel="Confirmando…"
            >
              Confirmar e-mail
            </Button>
          </form>
        )}
        <div className="auth-verification-actions">
          <Button type="button" variant="ghost" onClick={onBack}>
            Voltar ao login
          </Button>
          {address && (
            <Button
              type="button"
              variant="outline"
              disabled={!!pending}
              busy={pending === 'resend'}
              loadingLabel="Reenviando…"
              onClick={() => void send('resend')}
            >
              Reenviar código
            </Button>
          )}
        </div>
      </Card>
    </section>
  );
}
