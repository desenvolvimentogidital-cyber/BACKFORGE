import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string | null;
}

interface OnboardingState {
  project: {
    id: string;
    name: string;
    slug: string;
  };
  apiKey: string;
  apiKeyMasked: string;
  endpointPath: string;
  apiKeyHeader: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  onboarding: OnboardingState | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string, onboarding?: OnboardingState | null) => void;
  setAccessToken: (token: string) => void;
  setOnboarding: (onboarding: OnboardingState | null) => void;
  clearOnboarding: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      onboarding: null,
      isAuthenticated: false,
      setAuth: (user, token, onboarding = null) =>
        set({
          user,
          accessToken: token,
          onboarding,
          isAuthenticated: true,
        }),
      setAccessToken: (accessToken) => set({ accessToken, isAuthenticated: true }),
      setOnboarding: (onboarding) => set({ onboarding }),
      clearOnboarding: () => set({ onboarding: null }),
      logout: () => set({ user: null, accessToken: null, onboarding: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      version: 2,
      migrate: (persistedState) => {
        const persisted = persistedState as Partial<AuthState>;
        const user = persisted.user ?? null;

        return {
          user,
          isAuthenticated: Boolean(user && persisted.isAuthenticated),
        };
      },
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
