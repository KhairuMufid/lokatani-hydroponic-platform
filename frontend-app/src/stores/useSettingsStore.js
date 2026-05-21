/**
 * Settings Store — Zustand
 *
 * Manages theme (dark/light), research mode toggle,
 * notification preferences, and confidence threshold.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useSettingsStore = create(
  persist(
    (set) => ({
      theme: 'dark',
      researchMode: false,
      notificationsEnabled: true,
      minConfidence: 0.60,

      toggleTheme: () =>
        set((state) => {
          const next = state.theme === 'dark' ? 'light' : 'dark';
          if (next === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
          return { theme: next };
        }),

      setTheme: (theme) => {
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        set({ theme });
      },

      toggleResearchMode: () =>
        set((state) => ({ researchMode: !state.researchMode })),

      toggleNotifications: () =>
        set((state) => ({ notificationsEnabled: !state.notificationsEnabled })),

      setMinConfidence: (value) =>
        set({ minConfidence: Math.max(0.10, Math.min(0.99, value)) }),
    }),
    {
      name: 'lokatani-settings',
      onRehydrateStorage: () => (state) => {
        if (state?.theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },
    }
  )
);

export default useSettingsStore;
