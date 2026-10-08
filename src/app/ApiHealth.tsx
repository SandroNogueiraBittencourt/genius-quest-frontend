import { useEffect, useState } from 'react';
import { getHealth } from '../services/api';
export function ApiHealth() {
  const [status, setStatus] = useState<'verificando' | 'online' | 'offline'>(
    'verificando',
  );
  const [message, setMessage] = useState('Consultando o backend...');
  useEffect(() => {
    let active = true;
    getHealth()
      .then((data) => {
        if (!active) return;
        setStatus('online');
        setMessage(`${data.application} conectado`);
      })
      .catch(() => {
        if (!active) return;
        setStatus('offline');
        setMessage('Backend indisponível no momento');
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <div
      className={`ds-api ds-api--${status}`}
      role="status"
      aria-label="Conexão com a API"
      aria-live="polite"
    >
      <span className="ds-api-dot" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
