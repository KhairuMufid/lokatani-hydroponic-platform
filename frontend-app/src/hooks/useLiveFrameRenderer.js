/**
 * useLiveFrameRenderer — Ref-Based 15 FPS Renderer
 *
 * Completely bypasses React's rendering pipeline. Updates <img>.src
 * and draws <canvas> bounding boxes via direct DOM manipulation.
 * Zero setState calls in the hot path.
 *
 * PERFORMANCE OPTIMIZATIONS (HTTP mode):
 *   1. Blob/ObjectURL allocation — Base64 → Uint8Array → Blob → ObjectURL
 *      avoids GC pressure from large inline data-URI strings on <img>.src.
 *   2. Strict URL.revokeObjectURL() on every frame to prevent memory leaks.
 *   3. fetch() with keepalive: true to reuse TCP sockets (no handshake overhead).
 *   4. Polling interval of 66ms (~15 FPS) for HTTP mode.
 */

import { useRef, useCallback, useEffect } from 'react';
import useProtocolStore from '../stores/useProtocolStore.js';
import { wsClient } from '../services/wsClient.js';
import { mqttClient } from '../services/mqttClient.js';
import { httpClient } from '../services/httpClient.js';
import { drawBoundingBoxes } from '../utils/canvasRenderer.js';
import { MQTT_TOPICS } from '../utils/constants.js';

/**
 * Decode a Base64 string into a Uint8Array.
 * Strips the data-URI prefix if present.
 * @param {string} base64 - Raw base64 or data:image/jpeg;base64,... string
 * @returns {Uint8Array}
 */
function base64ToUint8Array(base64) {
  const raw = base64.includes(',') ? base64.split(',')[1] : base64;
  const binaryString = atob(raw);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export default function useLiveFrameRenderer() {
  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const statsRef = useRef(null);
  const detectionRef = useRef(null);
  const lastFrameTime = useRef(0);
  const frameCount = useRef(0);
  const fpsRef = useRef(null);
  const staleTimerRef = useRef(null);
  const pollingRef = useRef(null);
  const activeProtocol = useProtocolStore((s) => s.activeProtocol);
  const latestFrameRef = useRef(null);

  /** Previous Blob ObjectURL — MUST be revoked to prevent memory leaks */
  const prevObjectURLRef = useRef(null);

  const handleFrame = useCallback((frameData) => {
    if (!frameData) return;

    const now = performance.now();

    // Frame throttle: max ~20fps to prevent overload
    if (now - lastFrameTime.current < 45) return;
    lastFrameTime.current = now;
    frameCount.current++;

    latestFrameRef.current = frameData;

    // Reset stale timer
    if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
    staleTimerRef.current = setTimeout(() => {
      const staleEl = document.getElementById('stale-indicator');
      if (staleEl) staleEl.style.display = 'flex';
    }, 3000);

    const staleEl = document.getElementById('stale-indicator');
    if (staleEl) staleEl.style.display = 'none';

    // ═══════════════════════════════════════════════════════
    // 1. Blob/ObjectURL <img> src mutation — NO raw Base64 on DOM
    //    Base64 → Uint8Array → Blob → ObjectURL → img.src
    //    This prevents GC stutter from large inline data-URI strings.
    // ═══════════════════════════════════════════════════════
    if (imgRef.current && frameData.image_base64) {
      // STRICT REVOCATION: Release previous ObjectURL memory
      if (prevObjectURLRef.current) {
        URL.revokeObjectURL(prevObjectURLRef.current);
      }

      try {
        const bytes = base64ToUint8Array(frameData.image_base64);
        const blob = new Blob([bytes], { type: 'image/jpeg' });
        const objectURL = URL.createObjectURL(blob);
        imgRef.current.src = objectURL;
        prevObjectURLRef.current = objectURL;
      } catch {
        // Fallback to direct data-URI if Blob fails
        const prefix = frameData.image_base64.startsWith('data:')
          ? '' : 'data:image/jpeg;base64,';
        imgRef.current.src = `${prefix}${frameData.image_base64}`;
        prevObjectURLRef.current = null;
      }
    }

    // 2. Draw bounding boxes on <canvas> overlay
    if (canvasRef.current) {
      if (frameData.detections?.length > 0) {
        drawBoundingBoxes(canvasRef.current, frameData.detections, imgRef.current);
      } else {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
    }

    // 3. Update latency counter via ref
    if (statsRef.current && frameData.latency_ms != null) {
      statsRef.current.textContent = `${Number(frameData.latency_ms).toFixed(1)}ms`;
    }

    // 4. Update detection sidebar data (throttled separately by the component)
    if (detectionRef.current) {
      detectionRef.current(frameData);
    }
  }, []);

  // FPS counter
  useEffect(() => {
    const interval = setInterval(() => {
      if (fpsRef.current) {
        fpsRef.current.textContent = `${frameCount.current} FPS`;
      }
      frameCount.current = 0;
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Subscribe/unsubscribe based on protocol
  useEffect(() => {
    let cleanup = null;

    if (activeProtocol === 'WS') {
      // subscribe_live is handled globally by useProtocolConnection
      const handler = (data) => handleFrame(data);
      wsClient.on('live_frame', handler);
      cleanup = () => {
        wsClient.off('live_frame', handler);
      };
    } else if (activeProtocol === 'MQTT') {
      const handler = (data) => handleFrame(data);
      mqttClient.on(MQTT_TOPICS.LIVE_FRAME, handler);
      cleanup = () => {
        mqttClient.off(MQTT_TOPICS.LIVE_FRAME, handler);
      };
    } else {
      // ═══════════════════════════════════════════════════════
      // HTTP Rapid Polling — 15 FPS target (~66ms interval)
      //
      // Optimizations:
      //   - fetch keepalive: true → reuses TCP socket (no handshake)
      //   - Backend latestFrameBuffer → zero DB queries per poll
      //   - Blob/ObjectURL → zero GC stutter from large strings
      //   - Sequential poll (wait for response before next) to avoid
      //     request pileup under network congestion.
      // ═══════════════════════════════════════════════════════
      let isPolling = true;

      const poll = async () => {
        while (isPolling) {
          try {
            // Replaced raw fetch with httpClient to properly inject Dual-Auth JWT and API_BASE
            const data = await httpClient.getLatestDetection({
              keepalive: true,
              headers: { 'Accept': 'application/json' },
            });
            if (data.success && data.data) {
              handleFrame(data.data);
            }
          } catch { /* ignore network errors */ }

          // Wait ~66ms between polls (15 FPS target)
          // Using sequential polling: next request only fires
          // after the previous completes, preventing request pileup.
          await new Promise((resolve) => setTimeout(resolve, 66));
        }
      };

      poll();

      cleanup = () => {
        isPolling = false;
      };
    }

    return () => {
      if (cleanup) cleanup();
      if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
      // Revoke any remaining ObjectURL on unmount
      if (prevObjectURLRef.current) {
        URL.revokeObjectURL(prevObjectURLRef.current);
        prevObjectURLRef.current = null;
      }
    };
  }, [activeProtocol, handleFrame]);

  return {
    imgRef,
    canvasRef,
    statsRef,
    fpsRef,
    detectionRef,
    latestFrameRef,
  };
}
