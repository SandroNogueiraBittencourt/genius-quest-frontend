import { useEffect, useState } from 'react'
import { getHealth } from './services/api'
import './App.css'

function App() {
  const [apiStatus, setApiStatus] = useState<'verificando' | 'online' | 'offline'>('verificando')
  const [apiMessage, setApiMessage] = useState('Consultando o backend...')

  useEffect(() => {
    let active = true

    getHealth()
      .then((data) => {
        if (!active) return
        setApiStatus('online')
        setApiMessage(`${data.application} conectado`)
      })
      .catch(() => {
        if (!active) return
        setApiStatus('offline')
        setApiMessage('Backend indisponível no momento')
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <main className="app-shell">
      <section className="hero-card">
        <span className="eyebrow">Genius Quest</span>
        <h1>Conhecimento, competição e comunidade.</h1>
        <p className="lead">
          Base inicial do frontend em React + Vite. A próxima etapa será construir
          autenticação, temas, quizzes, partidas e rankings.
        </p>

        <div className={`status status--${apiStatus}`} role="status" aria-live="polite">
          <span className="status__dot" aria-hidden="true" />
          <div>
            <strong>API</strong>
            <span>{apiMessage}</span>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
