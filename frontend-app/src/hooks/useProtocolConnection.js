/**
 * useProtocolConnection — Master Connection Lifecycle Hook
 *
 * Manages the active protocol connection at the App root level.
 * Tears down old connections and initializes new ones on protocol switch.
 * Handles WS, MQTT, and HTTP (no persistent connection) modes.
 */

import { useEffect, useCallback, useRef } from 'react';
import useProtocolStore from '../stores/useProtocolStore.js';
import useAlertStore from '../stores/useAlertStore.js';
import { wsClient } from '../services/wsClient.js';
import { mqttClient } from '../services/mqttClient.js';
import { MQTT_TOPICS } from '../utils/constants.js';

export default function useProtocolConnection(isAuthenticated) {
  const activeProtocol = useProtocolStore((s) => s.activeProtocol);
  const setConnectionStatus = useProtocolStore((s) => s.setConnectionStatus);
  const handleNewAlert = useAlertStore((s) => s.handleNewAlert);
  const cleanupRef = useRef(null);

  const statusCallback = useCallback(
    (status) => setConnectionStatus(status),
    [setConnectionStatus]
  );

  useEffect(() => {
    // Cleanup previous connection
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    if (!isAuthenticated) return;

    if (activeProtocol === 'WS') {
      // Enhanced status callback: auto-subscribe to live frames on connect/reconnect
      const wsStatusCallback = (status) => {
        statusCallback(status);
        if (status === 'connected') {
          wsClient.subscribeLive();
        }
      };

      wsClient.connect(wsStatusCallback);

      const alertHandler = (data) => {
        if (data) handleNewAlert(data);
      };
      wsClient.on('new_alert', alertHandler);

      cleanupRef.current = () => {
        wsClient.off('new_alert', alertHandler);
        wsClient.removeAllListeners();
        wsClient.disconnect();
      };
    } else if (activeProtocol === 'MQTT') {
      mqttClient.connect(statusCallback);

      const alertHandler = (data) => {
        if (data?.data) handleNewAlert(data.data);
      };
      mqttClient.on(MQTT_TOPICS.ALERTS_NEW, alertHandler);

      cleanupRef.current = () => {
        mqttClient.off(MQTT_TOPICS.ALERTS_NEW, alertHandler);
        mqttClient.removeAllListeners();
        mqttClient.disconnect();
      };
    } else {
      // HTTP — no persistent connection
      setConnectionStatus('connected');
      cleanupRef.current = () => setConnectionStatus('disconnected');
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [activeProtocol, statusCallback, handleNewAlert, setConnectionStatus, isAuthenticated]);

  return { activeProtocol };
}
