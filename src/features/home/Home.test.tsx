import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createQueryClient } from '../../app/queryClient';
import { demoGateway, resetDemoRooms } from '../demo/roomGateway';
import { useRoomStore } from '../room/store';
import { Home } from './Home';
beforeEach(() => {
  resetDemoRooms();
  useRoomStore.getState().leave();
});
afterEach(() => vi.restoreAllMocks());
function setup() {
  const onEnter = vi.fn();
  render(
    <QueryClientProvider client={createQueryClient()}>
      <Home onEnter={onEnter} />
    </QueryClientProvider>,
  );
  return onEnter;
}
it('cria a sala com o tema escolhido e registra a sessão', async () => {
  const onEnter = setup();
  fireEvent.click(screen.getByRole('button', { name: /Reunir a turma/ }));
  const name = screen.getByRole('textbox', {
    name: 'Como podemos chamar você?',
  });
  expect(name).toHaveFocus();
  fireEvent.change(name, { target: { value: 'Sandro' } });
  fireEvent.click(
    await screen.findByRole('radio', { name: /Cinema e cultura/ }),
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Criar sala demonstrativa' }),
  );
  await vi.waitFor(() => expect(onEnter).toHaveBeenCalledOnce());
  const session = useRoomStore.getState().session!;
  expect(await demoGateway.getRoom(session)).toMatchObject({
    theme: { id: 'culture' },
    participants: [{ name: 'Sandro' }],
  });
});
it('explica código inexistente e permite tentar novamente', async () => {
  const onEnter = setup();
  fireEvent.click(screen.getByRole('button', { name: 'Entrar em uma sala' }));
  fireEvent.change(
    screen.getByRole('textbox', { name: 'Como podemos chamar você?' }),
    { target: { value: 'Sandro' } },
  );
  const code = screen.getByRole('textbox', { name: 'Código da sala' });
  fireEvent.change(code, { target: { value: 'ZZZZZZ' } });
  fireEvent.click(
    screen.getByRole('button', { name: 'Entrar na sala demonstrativa' }),
  );
  expect(await screen.findByRole('alert')).toHaveTextContent('Não encontramos');
  expect(onEnter).not.toHaveBeenCalled();
  fireEvent.change(code, { target: { value: 'GQ2026' } });
  fireEvent.click(
    screen.getByRole('button', { name: 'Entrar na sala demonstrativa' }),
  );
  await vi.waitFor(() => expect(onEnter).toHaveBeenCalledOnce());
});
it('mostra erro no carregamento dos temas e permite recuperação', async () => {
  const original = demoGateway.getThemes;
  vi.spyOn(demoGateway, 'getThemes')
    .mockRejectedValueOnce(new Error('Falha'))
    .mockImplementation(original);
  setup();
  fireEvent.click(screen.getByRole('button', { name: /Reunir a turma/ }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'carregar os temas',
  );
  expect(
    screen.getByRole('button', { name: 'Criar sala demonstrativa' }),
  ).toBeDisabled();
  fireEvent.click(
    screen.getByRole('button', { name: 'Tentar carregar temas' }),
  );
  expect(
    await screen.findByRole('radio', { name: /Natureza e descobertas/ }),
  ).toBeInTheDocument();
});

it('devolve o foco para a ação que abriu o formulário ao fechar', () => {
  setup();
  const trigger = screen.getByRole('button', { name: 'Entrar em uma sala' });
  fireEvent.click(trigger);
  expect(
    screen.getByRole('textbox', { name: 'Como podemos chamar você?' }),
  ).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: 'Fechar formulário' }));
  expect(trigger).toHaveFocus();
  expect(
    screen.queryByRole('textbox', { name: 'Código da sala' }),
  ).not.toBeInTheDocument();
});
