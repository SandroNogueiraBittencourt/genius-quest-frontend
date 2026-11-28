import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { PreparedMatch } from './api';
import { MatchList } from './MatchList';

vi.mock('../room/RoomResults', () => ({
  RoomResults: ({
    codigo,
    partidaId,
  }: {
    codigo: string;
    partidaId: string;
  }) => (
    <p>
      {codigo}/{partidaId}
    </p>
  ),
}));

const jogo: PreparedMatch = {
  id: 'partida-1',
  cicloId: null,
  cicloNome: null,
  temaId: 'tema-1',
  temaTitulo: 'Astronomia',
  categoriaNome: 'Ciências',
  status: 'CONCLUIDA',
  criadoEm: '2026-10-25T12:00:00Z',
  codigoSala: 'sala-1',
};

it('exibe placar apenas para partidas multiplayer concluídas', () => {
  render(
    <MatchList
      matches={[
        jogo,
        { ...jogo, id: 'partida-2', status: 'EM_ANDAMENTO' },
        { ...jogo, id: 'partida-3', codigoSala: null },
      ]}
    />,
  );
  const itens = screen.getAllByRole('listitem');
  expect(
    within(itens[0]).getByRole('button', { name: 'Ver placar' }),
  ).toBeInTheDocument();
  expect(within(itens[1]).queryByRole('button')).toBeNull();
  expect(within(itens[2]).queryByRole('button')).toBeNull();
});

it('abre apenas um placar por vez e permite fechá-lo', () => {
  render(
    <MatchList
      matches={[jogo, { ...jogo, id: 'partida-2', codigoSala: 'sala-2' }]}
    />,
  );
  const [primeiro, segundo] = screen.getAllByRole('button', {
    name: 'Ver placar',
  });
  fireEvent.click(primeiro);
  expect(primeiro).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByText('sala-1/partida-1')).toBeInTheDocument();
  fireEvent.click(segundo);
  expect(primeiro).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByText('sala-1/partida-1')).toBeNull();
  expect(screen.getByText('sala-2/partida-2')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Ocultar placar' }));
  expect(screen.queryByText('sala-2/partida-2')).toBeNull();
});
