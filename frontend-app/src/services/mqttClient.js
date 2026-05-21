/**
 * MQTT Client Manager (Browser)
 *
 * Uses mqtt.js WebSocket transport to connect to Mosquitto broker.
 * Manages subscriptions and message routing.
 */

import mqtt from 'mqtt';
import { MQTT_BROKER_URL, MQTT_TOPICS } from '../utils/constants.js';

let client = null;
let listeners = new Map();
let onStatusChange = null;

function connect(statusCb) {
  onStatusChange = statusCb;
  if (client) return;

  statusCb?.('connecting');

  client = mqtt.connect(MQTT_BROKER_URL, {
    clientId: `lokatani-frontend-${Date.now()}`,
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 10000,
  });

  client.on('connect', () => {
    statusCb?.('connected');
    // Auto-subscribe to live frame and alert topics
    client.subscribe([MQTT_TOPICS.LIVE_FRAME, MQTT_TOPICS.ALERTS_NEW], { qos: 0 });
  });

  client.on('message', (topic, message) => {
    try {
      const data = JSON.parse(message.toString());
      const cbs = listeners.get(topic) || [];
      cbs.forEach((cb) => cb(data));
    } catch { /* ignore */ }
  });

  client.on('error', () => statusCb?.('error'));
  client.on('reconnect', () => statusCb?.('connecting'));
  client.on('offline', () => statusCb?.('disconnected'));
  client.on('close', () => statusCb?.('disconnected'));
}

function disconnect() {
  if (client) {
    client.end(true);
    client = null;
  }
  onStatusChange?.('disconnected');
}

function on(topic, callback) {
  if (!listeners.has(topic)) listeners.set(topic, []);
  listeners.get(topic).push(callback);
}

function off(topic, callback) {
  if (!listeners.has(topic)) return;
  const cbs = listeners.get(topic).filter((cb) => cb !== callback);
  listeners.set(topic, cbs);
}

function removeAllListeners() {
  listeners.clear();
}

function publish(topic, data) {
  if (client?.connected) {
    client.publish(topic, JSON.stringify(data));
  }
}

export const mqttClient = {
  connect, disconnect, on, off, removeAllListeners, publish,
};
