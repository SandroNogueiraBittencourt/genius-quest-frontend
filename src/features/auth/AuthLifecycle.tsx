import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { resetDemoRooms } from '../demo/roomGateway';
import { useRoomStore } from '../room/store';
import { useAuthStore } from './store';
export function AuthLifecycle() {
  const client = useQueryClient();
  const session = useAuthStore((state) => state.session);
  useEffect(
    () =>
      useAuthStore.subscribe((state, previous) => {
        if (state.session !== previous.session) {
          void client.cancelQueries();
          client.clear();
          useRoomStore.getState().leave();
          resetDemoRooms();
        }
      }),
    [client],
  );
  useEffect(() => {
    if (!session) return;
    const { expiresAt, token } = session;
    let timer: ReturnType<typeof setTimeout>;
    function check() {
      clearTimeout(timer);
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) useAuthStore.getState().end('expired', token);
      else timer = setTimeout(check, Math.min(remaining, 2_147_483_647));
    }
    check();
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [session]);
  return null;
}
