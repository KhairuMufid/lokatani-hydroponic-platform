/**
 * WebSocket Client Manager
 *
 * Manages a single WS connection with auto-reconnect and
 * action-based message routing.
 */

import { WS_URL } from '../utils/constants.js';
import useAuthStore from '../stores/useAuthStore.js';

let ws = null;
let listeners = new Map();
let reconnectTimer = null;
let reconnectDelay = 1000;
let onStatusChange = null;

function connect(statusCb) {
  onStatusChange = statusCb;
  if (ws && ws.readyState <= 1) return;

  statusCb?.('connecting');
  
  const token = useAuthStore.getState().token;
  const url = token ? `${WS_URL}?token=${token}` : WS_URL;
  
  ws = new WebSocket(url);

  ws.onopen = () => {
    reconnectDelay = 1000;
    statusCb?.('connected');
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      const cbs = listeners.get(msg.action) || [];
      cbs.forEach((cb) => cb(msg.data, msg.success));
    } catch { /* ignore malformed messages */ }
  };

  ws.onclose = () => {
    statusCb?.('disconnected');
    scheduleReconnect(statusCb);
  };

  ws.onerror = () => {
    statusCb?.('error');
    ws?.close();
  };
}

function scheduleReconnect(statusCb) {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    reconnectDelay = Math.min(reconnectDelay * 2, 30000);
    connect(statusCb);
  }, reconnectDelay);
}

function disconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  if (ws) {
    // Prevent async events altering connection state after disconnect
    ws.onclose = null;
    ws.onerror = null;
    ws.onopen = null;
    ws.onmessage = null;
    ws.close();
    ws = null;
  }
  onStatusChange?.('disconnected');
  onStatusChange = null;
}

function send(action, data = {}) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ action, data }));
  }
}

function on(action, callback) {
  if (!listeners.has(action)) listeners.set(action, []);
  listeners.get(action).push(callback);
}

function off(action, callback) {
  if (!listeners.has(action)) return;
  const cbs = listeners.get(action).filter((cb) => cb !== callback);
  listeners.set(action, cbs);
}

function removeAllListeners() {
  listeners.clear();
}

export const wsClient = {
  connect, disconnect, send, on, off, removeAllListeners,
  subscribeLive: () => send('subscribe_live'),
  unsubscribeLive: () => send('unsubscribe_live'),
};
