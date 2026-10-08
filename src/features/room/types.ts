export type Theme = {
  id: string;
  name: string;
  description: string;
  category: string;
};
export type Participant = { id: string; name: string };
export type RoomSession = { code: string; playerId: string };
export type RoomStatus = 'waiting' | 'ready' | 'in-progress';
export type Room = {
  code: string;
  theme: Theme;
  participants: Participant[];
  hostId: string;
  maxPlayers: number;
  status: RoomStatus;
  pace: 'unhurried';
};
export type RoomSnapshot = Room & { isHost: boolean; canStart: boolean };
