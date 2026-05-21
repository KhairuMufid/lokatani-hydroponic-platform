/**
 * Protocol Store — Zustand
 *
 * Manages the active QoS protocol and connection status globally.
 * Persisted to localStorage so the selection survives page reloads.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useProtocolStore = create(
  persist(
    (set) => ({
      activeProtocol: 'HTTP',
      connectionStatus: 'disconnected',

      setProtocol: (protocol) =>
        set({ activeProtocol: protocol, connectionStatus: 'connecting' }),

      setConnectionStatus: (status) =>
        set({ connectionStatus: status }),
    }),
    {
      name: 'lokatani-protocol',
    }
  )
);

export default useProtocolStore;
