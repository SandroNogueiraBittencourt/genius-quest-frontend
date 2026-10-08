import { beforeEach, expect, it } from 'vitest';
import { demoGateway, resetDemoRooms } from './roomGateway';
beforeEach(resetDemoRooms);
it('cria salas com códigos distintos e anfitrião, no modo Sem pressa', async () => {
  const one = await demoGateway.createRoom({
    name: 'Sandro',
    themeId: 'nature',
  });
  const two = await demoGateway.createRoom({
    name: 'Maria',
    themeId: 'nature',
  });
  expect(one.code).not.toBe(two.code);
  expect(await demoGateway.getRoom(one)).toMatchObject({
    status: 'waiting',
    maxPlayers: 20,
    pace: 'unhurried',
    isHost: true,
    canStart: false,
  });
});
it('impede o início com menos de dois participantes', async () => {
  const session = await demoGateway.createRoom({
    name: 'Sandro',
    themeId: 'nature',
  });
  await expect(demoGateway.startRoom(session)).rejects.toThrow('pelo menos 2');
  await demoGateway.addExamplePlayer(session);
  expect(await demoGateway.startRoom(session)).toMatchObject({
    status: 'in-progress',
    canStart: false,
  });
  expect(await demoGateway.returnToLobby(session)).toMatchObject({
    status: 'ready',
    canStart: true,
  });
});
it('normaliza o código de entrada e impede ações do anfitrião para convidados', async () => {
  const guest = await demoGateway.joinRoom({
    name: 'Sandro',
    code: ' gq2026 ',
  });
  expect(await demoGateway.getRoom(guest)).toMatchObject({
    code: 'GQ2026',
    isHost: false,
    canStart: false,
  });
  await expect(demoGateway.startRoom(guest)).rejects.toThrow('Somente');
  await expect(demoGateway.addExamplePlayer(guest)).rejects.toThrow('Somente');
});
it('bloqueia sala lotada e preserva o limite de vinte participantes', async () => {
  for (let i = 0; i < 17; i++)
    await demoGateway.joinRoom({ name: `Pessoa ${i}`, code: 'GQ2026' });
  await expect(
    demoGateway.joinRoom({ name: 'Extra', code: 'GQ2026' }),
  ).rejects.toThrow('20 participantes');
});
it('bloqueia novas entradas durante a rodada', async () => {
  const host = await demoGateway.createRoom({
    name: 'Sandro',
    themeId: 'nature',
  });
  await demoGateway.addExamplePlayer(host);
  await demoGateway.startRoom(host);
  await expect(
    demoGateway.joinRoom({ name: 'Ana', code: host.code }),
  ).rejects.toThrow('já começou');
});
it('explica nomes, temas e códigos inválidos', async () => {
  await expect(
    demoGateway.createRoom({ name: ' ', themeId: 'nature' }),
  ).rejects.toThrow('nome');
  await expect(
    demoGateway.createRoom({ name: 'Sandro', themeId: 'invalid' }),
  ).rejects.toThrow('tema');
  await expect(
    demoGateway.joinRoom({ name: 'Sandro', code: 'GQ' }),
  ).rejects.toThrow('6 letras');
  await expect(
    demoGateway.joinRoom({ name: 'Sandro', code: 'ZZZZZZ' }),
  ).rejects.toThrow('Não encontramos');
});
it('remove convidados e encerra a sala local ao sair o anfitrião', async () => {
  const host = await demoGateway.createRoom({
    name: 'Sandro',
    themeId: 'nature',
  });
  const guest = await demoGateway.joinRoom({ name: 'Ana', code: host.code });
  await demoGateway.leaveRoom(guest);
  expect(await demoGateway.getRoom(host)).toMatchObject({
    status: 'waiting',
    canStart: false,
  });
  await expect(demoGateway.getRoom(guest)).rejects.toThrow('não está mais');
  await demoGateway.leaveRoom(host);
  await expect(demoGateway.getRoom(host)).rejects.toThrow('não está mais');
});
it('retorna cópias que não permitem alterar o adapter por fora', async () => {
  const guest = await demoGateway.joinRoom({ name: 'Sandro', code: 'GQ2026' });
  const room = await demoGateway.getRoom(guest);
  room.participants.length = 0;
  expect((await demoGateway.getRoom(guest)).participants).toHaveLength(4);
});
