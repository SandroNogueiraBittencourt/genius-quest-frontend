import { create } from 'zustand';
import { forgetSessionUser } from './sessionResume';
import type { AuthSession, LoginResponse } from './types';
export type SessionNotice =
  | 'signed-out'
  | 'password-changed'
  | 'email-changed'
  | 'expired'
  | 'unauthorized'
  | null;
type AuthState = {
  session: AuthSession | null;
  notice: SessionNotice;
  start: (response: LoginResponse, email: string) => void;
  end: (reason: SessionNotice, expectedToken?: string) => void;
  dismissNotice: () => void;
};
export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  notice: null,
  start: (response, email) =>
    set({
      session: {
        token: response.token,
        email: email.trim().toLowerCase(),
        expiresAt: Date.now() + response.expiraEm * 1000,
      },
      notice: null,
    }),
  end: (reason, expectedToken) =>
    set((state) => {
      if (expectedToken && state.session?.token !== expectedToken) return state;
      forgetSessionUser();
      return { session: null, notice: reason };
    }),
  dismissNotice: () => set({ notice: null }),
}));
