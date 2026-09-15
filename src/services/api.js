const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

export async function getHealth() {
  const response = await fetch(`${API_BASE_URL}/health`, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Falha ao consultar a API: HTTP ${response.status}`)
  }

  return response.json()
}
