import type { Room, RoomSession, RoomSnapshot, Theme } from '../room/types';
const themes: Theme[] = [
  {
    id: 'nature',
    name: 'Natureza e descobertas',
    description: 'Animais, oceanos e as pequenas surpresas do nosso planeta.',
    category: 'Explore o mundo',
  },
  {
    id: 'culture',
    name: 'Cinema e cultura',
    description: 'Histórias, músicas e lembranças que atravessam gerações.',
    category: 'Compartilhe memórias',
  },
  {
    id: 'everyday',
    name: 'Curiosidades do dia a dia',
    description: 'A ciência e os porquês escondidos na nossa rotina.',
    category: 'Olhe de novo',
  },
];
const rooms = new Map<string, Room>();
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function randomCode() {
  return Array.from(
    crypto.getRandomValues(new Uint8Array(6)),
    (value) => alphabet[value % alphabet.length],
  ).join('');
}
function playerName(name: string) {
  const value = name.trim();
  if (!value || value.length > 40)
    throw new Error('Informe um nome de até 40 caracteres.');
  return value;
}
function findRoom(session: RoomSession) {
  const room = rooms.get(session.code);
  if (
    !room ||
    !room.participants.some((player) => player.id === session.playerId)
  )
    throw new Error(
      'Esta sala não está mais disponível. Volte ao início para entrar novamente.',
    );
  return room;
}
function snapshot(session: RoomSession): RoomSnapshot {
  const room = findRoom(session);
  const isHost = room.hostId === session.playerId;
  return structuredClone({
    ...room,
    isHost,
    canStart:
      isHost && room.status === 'ready' && room.participants.length >= 2,
  });
}
function hostRoom(session: RoomSession) {
  const room = findRoom(session);
  if (room.hostId !== session.playerId)
    throw new Error('Somente quem criou a sala pode realizar esta ação.');
  return room;
}
export function resetDemoRooms() {
  rooms.clear();
  rooms.set('GQ2026', {
    code: 'GQ2026',
    theme: themes[1],
    hostId: 'example-host',
    maxPlayers: 20,
    status: 'ready',
    pace: 'unhurried',
    participants: [
      { id: 'example-host', name: 'Ana Lima' },
      { id: 'example-2', name: 'Pedro Santos' },
      { id: 'example-3', name: 'Maria Costa' },
    ],
  });
}
resetDemoRooms();
/** Adapter local para o protótipo. Não representa contratos HTTP nem autenticação real. */
export const demoGateway = {
  async getThemes(): Promise<Theme[]> {
    return structuredClone(themes);
  },
  async createRoom({
    name,
    themeId,
  }: {
    name: string;
    themeId: string;
  }): Promise<RoomSession> {
    const cleanName = playerName(name);
    const theme = themes.find((item) => item.id === themeId);
    if (!theme) throw new Error('Escolha um tema disponível.');
    let code = randomCode();
    while (rooms.has(code)) code = randomCode();
    const playerId = crypto.randomUUID();
    rooms.set(code, {
      code,
      theme,
      participants: [{ id: playerId, name: cleanName }],
      hostId: playerId,
      maxPlayers: 20,
      status: 'waiting',
      pace: 'unhurried',
    });
    return { code, playerId };
  },
  async joinRoom({
    name,
    code,
  }: {
    name: string;
    code: string;
  }): Promise<RoomSession> {
    const cleanName = playerName(name),
      cleanCode = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(cleanCode))
      throw new Error('O código da sala precisa ter 6 letras ou números.');
    const room = rooms.get(cleanCode);
    if (!room)
      throw new Error(
        'Não encontramos esse código nesta demonstração. Experimente GQ2026.',
      );
    if (room.status === 'in-progress')
      throw new Error('Esta rodada já começou. Entre em outra sala.');
    if (room.participants.length >= room.maxPlayers)
      throw new Error('Esta sala já tem 20 participantes. Escolha outra sala.');
    const playerId = crypto.randomUUID();
    room.participants.push({ id: playerId, name: cleanName });
    room.status = 'ready';
    return { code: cleanCode, playerId };
  },
  async getRoom(session: RoomSession): Promise<RoomSnapshot> {
    return snapshot(session);
  },
  async addExamplePlayer(session: RoomSession): Promise<RoomSnapshot> {
    const room = hostRoom(session);
    if (room.status === 'in-progress')
      throw new Error(
        'A rodada já começou. Volte ao lobby antes de adicionar alguém.',
      );
    if (room.participants.length >= room.maxPlayers)
      throw new Error('Esta sala já tem 20 participantes.');
    const names = [
      'Ana Lima',
      'Pedro Santos',
      'Maria Costa',
      'João Oliveira',
      'Lia Souza',
    ];
    room.participants.push({
      id: crypto.randomUUID(),
      name: names[(room.participants.length - 1) % names.length],
    });
    room.status = 'ready';
    return snapshot(session);
  },
  async startRoom(session: RoomSession): Promise<RoomSnapshot> {
    const room = hostRoom(session);
    if (!snapshot(session).canStart)
      throw new Error(
        'Reúna pelo menos 2 participantes para iniciar uma rodada.',
      );
    room.status = 'in-progress';
    return snapshot(session);
  },
  async returnToLobby(session: RoomSession): Promise<RoomSnapshot> {
    const room = hostRoom(session);
    if (room.status !== 'in-progress')
      throw new Error('A sala já está no lobby.');
    room.status = room.participants.length >= 2 ? 'ready' : 'waiting';
    return snapshot(session);
  },
  async leaveRoom(session: RoomSession): Promise<void> {
    const room = findRoom(session);
    if (room.hostId === session.playerId) {
      rooms.delete(session.code);
      return;
    }
    room.participants = room.participants.filter(
      (player) => player.id !== session.playerId,
    );
    if (room.status !== 'in-progress')
      room.status = room.participants.length >= 2 ? 'ready' : 'waiting';
  },
};
