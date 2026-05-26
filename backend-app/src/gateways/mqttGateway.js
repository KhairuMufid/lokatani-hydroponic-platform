/**
 * MQTT Gateway — Topic-Based Message Router
 *
 * Thin protocol adapter that subscribes to MQTT topics on the external
 * Mosquitto broker and routes incoming messages to shared controllers.
 * Publishes responses back on corresponding /down or /response topics.
 *
 * This Node process is NOT the broker — Mosquitto runs separately.
 *
 * @module gateways/mqttGateway
 */

import { TOPICS } from '../config/mqtt.js';
import env from '../config/env.js';
import { handleDetection } from '../controllers/detectionController.js';
import * as alertController from '../controllers/alertController.js';
import * as dssController from '../controllers/dssController.js';
import * as sessionController from '../services/sessionManager.js';
import logger from '../utils/logger.js';

/**
 * Initialize the MQTT gateway on a connected MQTT client.
 * Subscribes to all relevant topics and routes messages to controllers.
 *
 * @param {import('mqtt').MqttClient} client
 */
export function initMqttGateway(client) {
  // Subscribe to all ingestion/request topics on connect
  client.on('connect', () => {
    const topicsToSubscribe = [
      TOPICS.DETECT_UP,
      TOPICS.SESSION_START,
      TOPICS.SESSION_END,
      TOPICS.ALERTS_REQUEST,
      TOPICS.DSS_REQUEST,
    ];

    for (const topic of topicsToSubscribe) {
      client.subscribe(topic, { qos: 0 }, (err) => {
        if (err) {
          logger.error(`[MQTT] Failed to subscribe to ${topic}:`, err.message);
        } else {
          logger.info(`[MQTT] Subscribed to: ${topic}`);
        }
      });
    }
  });

  // Route incoming messages by topic
  client.on('message', async (topic, messageBuffer) => {
    let payload;
    try {
      payload = JSON.parse(messageBuffer.toString());
    } catch {
      logger.warn(`[MQTT] Invalid JSON on topic "${topic}" — ignoring`);
      return;
    }

    try {
      switch (topic) {
        // ── Detection Ingestion ──
        case TOPICS.DETECT_UP: {
          const { api_key, ...telemetryData } = payload;
          
          if (!api_key || api_key !== env.API_KEY) {
            logger.warn('[MQTT] Unauthorized telemetry ingestion attempt: Invalid API Key');
            client.publish(
              TOPICS.DETECT_DOWN,
              JSON.stringify({ success: false, error: 'Unauthorized: Invalid API Key' }),
              { qos: 0 }
            );
            return;
          }

          const result = await handleDetection(telemetryData, 'MQTT');
          client.publish(
            TOPICS.DETECT_DOWN,
            JSON.stringify(result),
            { qos: 0 },
          );

          // Broadcast live frame for frontend subscribers
          if (result.success) {
            client.publish(
              TOPICS.LIVE_FRAME,
              JSON.stringify({
                image_base64: result.image_base64,
                detections: result.detections || [],
                dss: result.dss || [],
                latency_ms: result.latency_ms,
                log_id: result.log_id,
                total_detections: result.total_detections,
                alert: result.alert || null,
                created_at: result.created_at,
              }),
              { qos: 0 },
            );
          }

          // If an alert was created, broadcast on the alerts/new topic
          if (result.success && result.alert) {
            client.publish(
              TOPICS.ALERTS_NEW,
              JSON.stringify({ action: 'new_alert', data: result.alert }),
              { qos: 1 },  // QoS 1 for alerts — at least once delivery
            );
          }
          break;
        }

        // ── Session Lifecycle ──
        case TOPICS.SESSION_START: {
          const { api_key: sessionApiKey, ...sessionData } = payload;
          if (!sessionApiKey || sessionApiKey !== env.API_KEY) {
            logger.warn('[MQTT] Unauthorized session start attempt');
            client.publish(TOPICS.SESSION_ACK, JSON.stringify({ success: false, error: 'Unauthorized' }), { qos: 0 });
            return;
          }
          try {
            const result = await sessionController.startSession(sessionData.protokol || 'MQTT');
            client.publish(TOPICS.SESSION_ACK, JSON.stringify({ success: true, action: 'session_started', data: result }), { qos: 1 });
          } catch (err) {
            client.publish(TOPICS.SESSION_ACK, JSON.stringify({ success: false, error: err.message }), { qos: 0 });
          }
          break;
        }

        case TOPICS.SESSION_END: {
          const { api_key: endApiKey, ...endData } = payload;
          if (!endApiKey || endApiKey !== env.API_KEY) {
            logger.warn('[MQTT] Unauthorized session end attempt');
            client.publish(TOPICS.SESSION_ACK, JSON.stringify({ success: false, error: 'Unauthorized' }), { qos: 0 });
            return;
          }
          try {
            const result = await sessionController.endSession(endData.session_id);
            client.publish(TOPICS.SESSION_ACK, JSON.stringify({ success: true, action: 'session_ended', data: result }), { qos: 1 });
          } catch (err) {
            client.publish(TOPICS.SESSION_ACK, JSON.stringify({ success: false, error: err.message }), { qos: 0 });
          }
          break;
        }

        // ── Alert Queries ──
        case TOPICS.ALERTS_REQUEST: {
          const result = await alertController.getAlerts(payload);
          client.publish(
            TOPICS.ALERTS_RESPONSE,
            JSON.stringify(result),
            { qos: 0 },
          );
          break;
        }

        // ── DSS Queries ──
        case TOPICS.DSS_REQUEST: {
          const result = await dssController.getMitigations(payload.pest_name);
          client.publish(
            TOPICS.DSS_RESPONSE,
            JSON.stringify(result),
            { qos: 0 },
          );
          break;
        }

        default:
          logger.debug(`[MQTT] Unhandled topic: ${topic}`);
      }
    } catch (err) {
      logger.error(`[MQTT] Error processing message on "${topic}":`, err.message);
    }
  });
}
