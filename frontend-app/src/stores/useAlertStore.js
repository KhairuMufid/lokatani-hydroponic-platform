/**
 * Alert Store — Zustand
 *
 * Caches alert badge counts and the latest alert for
 * the sidebar badge and notification bell.
 */

import { create } from 'zustand';

const useAlertStore = create((set) => ({
  activeCount: 0,
  latestAlert: null,

  setActiveCount: (count) => set({ activeCount: count }),
  setLatestAlert: (alert) => set({ latestAlert: alert }),

  handleNewAlert: (alert) =>
    set((state) => ({
      activeCount: state.activeCount + 1,
      latestAlert: alert,
    })),

  decrementActive: () =>
    set((state) => ({
      activeCount: Math.max(0, state.activeCount - 1),
    })),
}));

export default useAlertStore;
