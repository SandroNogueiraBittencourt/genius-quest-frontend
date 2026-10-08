import { useQuery } from '@tanstack/react-query';
import { demoGateway } from '../demo/roomGateway';
import type { RoomSession } from './types';
export const roomKey = (session: RoomSession | null) =>
  ['demo', 'room', session?.code, session?.playerId] as const;
export function useDemoThemes() {
  return useQuery({
    queryKey: ['demo', 'themes'],
    queryFn: demoGateway.getThemes,
    retry: false,
    networkMode: 'always',
  });
}
export function useDemoRoom(session: RoomSession | null) {
  return useQuery({
    queryKey: roomKey(session),
    queryFn: () => {
      if (!session) throw new Error('Entre em uma sala para continuar.');
      return demoGateway.getRoom(session);
    },
    enabled: !!session,
    retry: false,
    networkMode: 'always',
  });
}
