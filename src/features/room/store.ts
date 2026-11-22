import { create } from 'zustand';
type RoomSession = { code: string; playerId?: string };
type RoomState = {
  session: RoomSession | null;
  enter: (session: RoomSession) => void;
  leave: () => void;
};
export const useRoomStore = create<RoomState>((set) => ({
  session: null,
  enter: (session) => set({ session }),
  leave: () => set({ session: null }),
}));
