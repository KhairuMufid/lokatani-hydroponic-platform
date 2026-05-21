/**
 * useDashboardRealtime — Live Push/Poll Subscription for Dashboard
 *
 * Subscribes to WS/MQTT live_frame, new_alert, and session_completed events
 * to provide instant counter updates without waiting for HTTP polling.
 *
 * For HTTP protocol: uses a lightweight 2-second poll of /api/detect/latest
 * to detect new frames and increment deltas.
 *
 * Detection deltas are flushed to React state every 2 seconds
 * to prevent excessive re-renders at 15 FPS.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import useProtocolStore from '../stores/useProtocolStore.js';
import { wsClient } from '../services/wsClient.js';
import { mqttClient } from '../services/mqttClient.js';
import { httpClient } from '../services/httpClient.js';
import { MQTT_TOPICS } from '../utils/constants.js';

export default function useDashboardRealtime() {
  const activeProtocol = useProtocolStore((s) => s.activeProtocol);
  const [realtimeDelta, setRealtimeDelta] = useState({
    detections: 0,
    pests: 0,
    alerts: 0,
    lastLatencyMs: null,
    lastDetectionAt: null,
  });
  const [lastCompletedSession, setLastCompletedSession] = useState(null);

  // Accumulate deltas via ref (no re-renders in hot path)
  const deltaRef = useRef({ detections: 0, pests: 0, alerts: 0, lastLatencyMs: null, lastDetectionAt: null });
  const flushTimerRef = useRef(null);
  const lastSeenRef = useRef(null);

  // Flush accumulated deltas into React state every 2 seconds
  const startFlushInterval = useCallback(() => {
    if (flushTimerRef.current) clearInterval(flushTimerRef.current);
    flushTimerRef.current = setInterval(() => {
      const d = deltaRef.current;
      if (d.detections > 0 || d.alerts > 0 || d.lastLatencyMs !== null) {
        setRealtimeDelta({ ...d });
      }
    }, 2000);
  }, []);

  // Reset deltas (called after polling refresh merges the data)
  const resetDelta = useCallback(() => {
    deltaRef.current = { detections: 0, pests: 0, alerts: 0, lastLatencyMs: null, lastDetectionAt: null };
    setRealtimeDelta({ detections: 0, pests: 0, alerts: 0, lastLatencyMs: null, lastDetectionAt: null });
  }, []);

  useEffect(() => {
    let cleanup = null;

    const handleFrame = (data) => {
      if (!data) return;
      deltaRef.current.detections += 1;
      deltaRef.current.pests += (data.unique_pests || data.total_detections || 0);
      deltaRef.current.lastLatencyMs = data.latency_ms;
      deltaRef.current.lastDetectionAt = data.created_at || new Date().toISOString();
    };

    const handleAlert = (data) => {
      if (!data) return;
      deltaRef.current.alerts += 1;
    };

    const handleSessionCompleted = (data) => {
      if (!data) return;
      setLastCompletedSession(data.data || data);
    };

    if (activeProtocol === 'WS') {
      wsClient.on('live_frame', handleFrame);
      wsClient.on('new_alert', handleAlert);
      wsClient.on('session_completed', handleSessionCompleted);
      startFlushInterval();
      cleanup = () => {
        wsClient.off('live_frame', handleFrame);
        wsClient.off('new_alert', handleAlert);
        wsClient.off('session_completed', handleSessionCompleted);
      };
    } else if (activeProtocol === 'MQTT') {
      mqttClient.on(MQTT_TOPICS.LIVE_FRAME, handleFrame);
      mqttClient.on(MQTT_TOPICS.ALERTS_NEW, (d) => handleAlert(d?.data || d));
      startFlushInterval();
      cleanup = () => {
        mqttClient.off(MQTT_TOPICS.LIVE_FRAME, handleFrame);
        mqttClient.off(MQTT_TOPICS.ALERTS_NEW, handleAlert);
      };
    } else {
      // HTTP Mode: Lightweight poll of /api/detect/latest
      let isPolling = true;

      const httpPoll = async () => {
        while (isPolling) {
          try {
            // Use authenticated httpClient to inject JWT (fixes the 401 regression)
            const json = await httpClient.getLatestDetection({
              keepalive: true,
              headers: { 'Accept': 'application/json' },
            });
            if (json.success && json.data) {
              const frame = json.data;
              const frameKey = frame.created_at || frame.log_id;

              if (frameKey && frameKey !== lastSeenRef.current) {
                lastSeenRef.current = frameKey;
                handleFrame(frame);
              }
            }
          } catch { /* ignore */ }

          await new Promise((r) => setTimeout(r, 2000));
        }
      };

      startFlushInterval();
      httpPoll();

      cleanup = () => {
        isPolling = false;
      };
    }

    return () => {
      if (cleanup) cleanup();
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
    };
  }, [activeProtocol, startFlushInterval]);

  return { realtimeDelta, resetDelta, lastCompletedSession };
}
