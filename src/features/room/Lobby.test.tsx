import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createQueryClient } from '../../app/queryClient';
import { useAuthStore } from '../auth/store';
import {
  closeRoom,
  getRoom,
  leaveRoom,
  getRoomVoting,
  openRoomVoting,
  setRoomVote,
} from './api';
import { getThemes } from '../themes/api';
import { Lobby } from './Lobby';
import { useRoomStore } from './store';

vi.mock('./api', () => ({
  closeRoom: vi.fn(),
  getRoom: vi.fn(),
  leaveRoom: vi.fn().mockResolvedValue(undefined),
  getRoomVoting: vi.fn(),
  openRoomVoting: vi.fn(),
  setRoomVote: vi.fn(),
  closeRoomVoting: vi.fn(),
}));
vi.mock('../themes/api', () => ({ getThemes: vi.fn() }));
const codigo = '12345678-1234-1234-1234-123456789abc';

beforeEach(() => {
  vi.mocked(getRoomVoting).mockResolvedValue({
    aberta: false,
    meuVoto: null,
    totais: [],
  });
  useRoomStore.getState().enter({ code: codigo });
  useAuthStore
    .getState()
    .start(
      { token: 'token', tipo: 'Bearer', expiraEm: 3600 },
      'ana@example.test',
    );
});
afterEach(() => {
  useRoomStore.getState().leave();
  useAuthStore.setState({ session: null, notice: null });
  vi.resetAllMocks();
});

it('mostra os participantes da API e atualiza a lista no lobby', async () => {
  const sala = {
    codigo,
    partidaId: null,
    temaId: null,
    anfitriaoId: 'ana',
    status: 'PREPARACAO' as const,
    participantes: [{ id: 'ana', nome: 'Ana' }],
  };
  vi.mocked(getRoom)
    .mockResolvedValueOnce(sala)
    .mockResolvedValue({
      ...sala,
      participantes: [...sala.participantes, { id: 'bia', nome: 'Bia' }],
    });
  const client = createQueryClient();
  const onLeave = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <Lobby onLeave={onLeave} />
    </QueryClientProvider>,
  );

  expect(await screen.findByText('Anfitrião')).toBeInTheDocument();
  expect(screen.getByText(codigo)).toBeInTheDocument();
  expect(
    screen.getByText('Aguardando o anfitrião abrir a votação.'),
  ).toBeInTheDocument();
  expect(getThemes).not.toHaveBeenCalled();
  expect(
    await screen.findByText('Bia', {}, { timeout: 5000 }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Sair da sala' }));
  await vi.waitFor(() => expect(onLeave).toHaveBeenCalledOnce());
});

it('abre a votação e permite confirmar e retirar o voto', async () => {
  const token =
    'header.' + btoa(JSON.stringify({ usuarioId: 'ana' })) + '.signature';
  useAuthStore
    .getState()
    .start({ token, tipo: 'Bearer', expiraEm: 3600 }, 'ana@example.test');
  const sala = {
    codigo,
    partidaId: null,
    temaId: null,
    anfitriaoId: 'ana',
    status: 'PREPARACAO' as const,
    participantes: [{ id: 'ana', nome: 'Ana' }],
  };
  const aberta = { aberta: true, meuVoto: null, totais: [] };
  vi.mocked(getRoom).mockResolvedValue(sala);
  vi.mocked(openRoomVoting).mockImplementation(async () => {
    vi.mocked(getRoomVoting).mockResolvedValue(aberta);
    return aberta;
  });
  vi.mocked(setRoomVote).mockImplementation(async (_codigo, temaId) => {
    const voto = {
      ...aberta,
      meuVoto: temaId,
      totais: temaId ? [{ temaId, votos: 1 }] : [],
    };
    vi.mocked(getRoomVoting).mockResolvedValue(voto);
    return voto;
  });
  vi.mocked(getThemes).mockResolvedValue([
    {
      id: 'tema-1',
      titulo: 'Astronomia',
      status: 'APROVADO',
      descricao: null,
      categoriaId: 'categoria',
      autorId: 'ana',
      criadoEm: '',
      atualizadoEm: '',
    },
  ]);
  render(
    <QueryClientProvider client={createQueryClient()}>
      <Lobby onLeave={vi.fn()} />
    </QueryClientProvider>,
  );

  const abrir = await screen.findByRole('button', {
    name: 'Começar seleção do tema',
  });
  await vi.waitFor(() => expect(abrir).toBeEnabled());
  fireEvent.click(abrir);
  const opcao = await screen.findByRole('radio', { name: /Astronomia/ });
  fireEvent.click(opcao);
  fireEvent.click(screen.getByRole('button', { name: 'Desfazer escolha' }));
  expect(opcao).not.toBeChecked();
  fireEvent.click(opcao);
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar voto' }));
  const retirar = await screen.findByRole('button', { name: 'Retirar voto' });
  await vi.waitFor(() => expect(retirar).toBeEnabled());
  fireEvent.click(retirar);
  await vi.waitFor(() =>
    expect(setRoomVote).toHaveBeenLastCalledWith(codigo, null),
  );
});

it('confirma o fechamento dentro do lobby e permite cancelar', async () => {
  const token =
    'header.' + btoa(JSON.stringify({ usuarioId: 'ana' })) + '.signature';
  useAuthStore
    .getState()
    .start({ token, tipo: 'Bearer', expiraEm: 3600 }, 'ana@example.test');
  vi.mocked(getRoom).mockResolvedValue({
    codigo,
    partidaId: null,
    temaId: null,
    anfitriaoId: 'ana',
    status: 'PREPARACAO',
    participantes: [{ id: 'ana', nome: 'Ana' }],
  });
  vi.mocked(closeRoom).mockResolvedValue(undefined);
  const onLeave = vi.fn();
  render(
    <QueryClientProvider client={createQueryClient()}>
      <Lobby onLeave={onLeave} />
    </QueryClientProvider>,
  );

  const fechar = await screen.findByRole('button', { name: 'Fechar sala' });
  fireEvent.click(fechar);
  const manter = screen.getByRole('button', { name: 'Manter sala aberta' });
  expect(manter).toHaveFocus();
  fireEvent.click(manter);
  expect(fechar).toHaveFocus();
  expect(closeRoom).not.toHaveBeenCalled();

  fireEvent.click(fechar);
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar fechamento' }));
  await vi.waitFor(() => expect(onLeave).toHaveBeenCalledOnce());
  expect(closeRoom).toHaveBeenCalledWith(codigo);
});
