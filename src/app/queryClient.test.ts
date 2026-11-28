import { expect, it, vi } from 'vitest';
import { createQueryClient } from './queryClient';

it('reutiliza dados recentes na mesma instância', async () => {
  const client = createQueryClient();
  const queryFn = vi.fn(async () => 'resultado');
  const query = { queryKey: ['consulta'], queryFn };
  try {
    await expect(client.fetchQuery(query)).resolves.toBe('resultado');
    await expect(client.fetchQuery(query)).resolves.toBe('resultado');
    expect(queryFn).toHaveBeenCalledOnce();
  } finally {
    client.clear();
  }
});

it('cria instâncias com caches independentes', () => {
  const primeiro = createQueryClient();
  const segundo = createQueryClient();
  try {
    primeiro.setQueryData(['consulta'], 'primeira instância');
    expect(segundo.getQueryData(['consulta'])).toBeUndefined();
  } finally {
    primeiro.clear();
    segundo.clear();
  }
});
