import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { createQueryClient } from '../../app/queryClient';
import { demoGateway, resetDemoRooms } from '../demo/roomGateway';
import type { RoomSession } from './types';
import { useRoomStore } from './store';
import { Lobby } from './Lobby';
beforeEach(() => {
  resetDemoRooms();
  useRoomStore.getState().leave();
});
function setup(session: RoomSession | null) {
  if (session) useRoomStore.getState().enter(session);
  const onLeave = vi.fn();
  render(
    <QueryClientProvider client={createQueryClient()}>
      <Lobby onLeave={onLeave} />
    </QueryClientProvider>,
  );
  return onLeave;
}
it('passa de aguardando para pronta e em andamento na prévia do anfitrião', async () => {
  const session = await demoGateway.createRoom({
    name: 'Sandro',
    themeId: 'nature',
  });
  setup(session);
  expect(await screen.findByText('Aguardando jogadores')).toBeInTheDocument();
  const start = screen.getByRole('button', {
    name: 'Iniciar rodada demonstrativa',
  });
  expect(start).toBeDisabled();
  fireEvent.click(
    screen.getByRole('button', { name: 'Adicionar pessoa de exemplo' }),
  );
  await screen.findByText('Pronta para começar');
  expect(start).toBeEnabled();
  expect(screen.getByText('2/20')).toBeInTheDocument();
  fireEvent.click(start);
  expect(await screen.findByText('Em andamento')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Voltar ao lobby' }));
  expect(await screen.findByText('Pronta para começar')).toBeInTheDocument();
});
it('mostra o convidado sem ações do anfitrião e permite sair', async () => {
  const session = await demoGateway.joinRoom({
    name: 'Sandro',
    code: 'GQ2026',
  });
  const onLeave = setup(session);
  await screen.findByText('Sandro');
  expect(
    screen.queryByRole('button', { name: 'Iniciar rodada demonstrativa' }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Adicionar pessoa de exemplo' }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Sair da sala' }));
  await vi.waitFor(() => expect(onLeave).toHaveBeenCalledOnce());
  expect(useRoomStore.getState().session).toBeNull();
});
it('oferece cópia manual quando a área de transferência não está disponível', async () => {
  const session = await demoGateway.joinRoom({
    name: 'Sandro',
    code: 'GQ2026',
  });
  setup(session);
  fireEvent.click(await screen.findByRole('button', { name: 'Copiar código' }));
  expect(
    await screen.findByText(/Selecione o código GQ2026/),
  ).toBeInTheDocument();
});
it('orienta a recuperação quando a sala é perdida após recarregar', () => {
  const onLeave = setup(null);
  expect(
    screen.getByRole('heading', { name: 'Nenhuma sala aberta.' }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Voltar ao início' }));
  expect(onLeave).toHaveBeenCalledOnce();
});
