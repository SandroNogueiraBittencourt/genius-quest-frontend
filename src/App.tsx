import { useEffect, useState } from 'react';
import { getHealth } from './services/api';
import { DesignSystem } from './features/design-system/DesignSystem';
import './App.css';

function App() {
  const [apiStatus, setApiStatus] = useState<
    'verificando' | 'online' | 'offline'
  >('verificando');
  const [apiMessage, setApiMessage] = useState('Consultando o backend...');

  useEffect(() => {
    let active = true;
    getHealth()
      .then((data) => {
        if (!active) return;
        setApiStatus('online');
        setApiMessage(`${data.application} conectado`);
      })
      .catch(() => {
        if (!active) return;
        setApiStatus('offline');
        setApiMessage('Backend indisponível no momento');
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <DesignSystem
      apiStatus={
        <div
          className={`ds-api ds-api--${apiStatus}`}
          role="status"
          aria-label="Conexão com a API"
          aria-live="polite"
        >
          <span className="ds-api-dot" aria-hidden="true" />
          <span>{apiMessage}</span>
        </div>
      }
    />
  );
}
export default App;
