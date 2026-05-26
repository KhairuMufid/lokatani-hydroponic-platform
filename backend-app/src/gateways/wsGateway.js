/**
 * WebSocket Gateway — Action-Based Message Router
 *
 * Thin protocol adapter that routes incoming WS messages to shared controllers
 * based on an "action" field in the JSON payload. Supports real-time alert
 * broadcasting to all clients and live frame broadcasting to subscribed clients.
 *
 * Message format (client → server):
 *   { "action": "detect",            "data": { ...payload } }
 *   { "action": "get_logs",          "data": { page: 1 } }
 *   { "action": "get_alerts",        "data": { status: "active" } }
 *   { "action": "acknowledge_alert", "data": { id: 42 } }
 *   { "action": "get_dss",           "data": { pest_name: "kutu_daun" } }
 *   { "action": "get_log_details",   "data": { log_id: 123 } }
 *   { "action": "subscribe_live" }
 *   { "action": "unsubscribe_live" }
 *   { "action": "get_dashboard_summary" }
 *   { "action": "get_dashboard_trend", "data": { days: 7 } }
 *
 * @module gateways/wsGateway
 */

import { handleDetection } from '../controllers/detectionController.js';
import * as alertController from '../controllers/alertController.js';
import * as dssController from '../controllers/dssController.js';
import * as telemetryController from '../controllers/telemetryController.js';
import * as dashboardController from '../controllers/dashboardController.js';
import * as sessionController from '../services/sessionManager.js';
import logger from '../utils/logger.js';

/** @type {Set<import('ws').WebSocket>} All connected WS clients */
const clients = new Set();

/** @type {Set<import('ws').WebSocket>} Clients subscribed to live frame feed */
const liveSubscribers = new Set();

/**
 * Broadcast a message to ALL connected WebSocket clients.
 * Used for real-time alert push notifications.
 *
 * @param {Object} message - JSON-serializable message
 */
export function broadcast(message) {
  const payload = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(payload);
    }
  }
}

/**
 * Broadcast a live frame to clients that have opted in via subscribe_live.
 * @param {Object} frameData - Detection result with image_base64
 */
export function broadcastLiveFrame(frameData) {
  if (liveSubscribers.size === 0) return;

  const payload = JSON.stringify({
    action: 'live_frame',
    data: {
      image_base64: frameData.image_base64,
      detections: frameData.detections || [],
      dss: frameData.dss || [],
      latency_ms: frameData.latency_ms,
      log_id: frameData.log_id,
      total_detections: frameData.total_detections,
      alert: frameData.alert || null,
      created_at: frameData.created_at,
    },
    success: true,
  });

  for (const client of liveSubscribers) {
    if (client.readyState === 1) {
      client.send(payload);
    }
  }
}

/**
 * Send a response to a single WebSocket client.
 * @param {import('ws').WebSocket} ws
 * @param {string} action - Response action name
 * @param {Object} data   - Response payload
 * @param {boolean} success
 */
function respond(ws, action, data, success = true) {
  if (ws.readyState !== 1) return;
  ws.send(JSON.stringify({ action, data, success }));
}

/**
 * Route an incoming message to the appropriate controller.
 *
 * @param {import('ws').WebSocket} ws  - The client socket
 * @param {Object} msg - Parsed JSON message with { action, data }
 */
async function routeMessage(ws, msg) {
  const { action, data = {} } = msg;

  switch (action) {
    case 'detect': {
      const result = await handleDetection(data, 'WS');
      respond(ws, 'detect_result', result, result.success);

      // If detection succeeded, broadcast live frame to subscribers
      if (result.success) {
        broadcastLiveFrame(result);
      }

      // If an alert was created, broadcast to all clients
      if (result.success && result.alert) {
        broadcast({
          action: 'new_alert',
          data: result.alert,
          success: true,
        });
      }
      break;
    }

    // ── Explicit Session Lifecycle ──
    case 'start_session': {
      const result = await sessionController.startSession(data.protokol || 'WS');
      respond(ws, 'start_session_result', result);
      break;
    }

    case 'end_session': {
      try {
        const result = await sessionController.endSession(data.session_id);
        respond(ws, 'end_session_result', result);
      } catch (err) {
        respond(ws, 'end_session_result', { error: err.message }, false);
      }
      break;
    }

    // ── Live Frame Subscription ──
    case 'subscribe_live': {
      liveSubscribers.add(ws);
      respond(ws, 'subscribe_live_result', { subscribed: true });
      logger.info(`[WS] Client subscribed to live feed (${liveSubscribers.size} subscribers)`);
      break;
    }

    case 'unsubscribe_live': {
      liveSubscribers.delete(ws);
      respond(ws, 'unsubscribe_live_result', { subscribed: false });
      logger.info(`[WS] Client unsubscribed from live feed (${liveSubscribers.size} subscribers)`);
      break;
    }

    // ── Dashboard ──
    case 'get_dashboard_summary': {
      const result = await dashboardController.getSummary();
      respond(ws, 'dashboard_summary_result', result, result.success);
      break;
    }

    case 'get_dashboard_trend': {
      const result = await dashboardController.getTrend(data);
      respond(ws, 'dashboard_trend_result', result, result.success);
      break;
    }

    case 'get_logs': {
      const result = await telemetryController.getLogs(data);
      respond(ws, 'logs_result', result, result.success);
      break;
    }

    case 'get_stats': {
      const result = await telemetryController.getStats(data);
      respond(ws, 'stats_result', result, result.success);
      break;
    }

    case 'get_log_details': {
      const result = await telemetryController.getLogDetails(data.log_id);
      respond(ws, 'log_details_result', result, result.success);
      break;
    }

    case 'get_alerts': {
      const result = await alertController.getAlerts(data);
      respond(ws, 'alerts_result', result, result.success);
      break;
    }

    case 'acknowledge_alert': {
      const result = await alertController.acknowledgeAlert(data.id);
      respond(ws, 'acknowledge_result', result, result.success);
      break;
    }

    case 'resolve_alert': {
      const result = await alertController.resolveAlert(data.id);
      respond(ws, 'resolve_result', result, result.success);
      break;
    }

    case 'get_dss': {
      const result = await dssController.getMitigations(data.pest_name);
      respond(ws, 'dss_result', result, result.success);
      break;
    }

    case 'get_pests': {
      const result = await dssController.getAllPests();
      respond(ws, 'pests_result', result, result.success);
      break;
    }

    default:
      respond(ws, 'error', { message: `Unknown action: "${action}"` }, false);
  }
}

import { parse } from 'url';
import env from '../config/env.js';
import { verifyJWT } from '../utils/jwtHelper.js';

export function initWsGateway(wss) {
  // Broadcast session completion events to all WS clients
  sessionController.onComplete((session) => {
    broadcast({ action: 'session_completed', data: session, success: true });
  });

  wss.on('connection', (ws, req) => {
    const clientAddr = req.socket.remoteAddress;
    
    // ─── Dual-Auth Validation ───
    const parsedUrl = parse(req.url, true);
    const apiKey = parsedUrl.query.api_key || req.headers['x-api-key'];
    const token = parsedUrl.query.token;

    ws.isAuthenticated = false;
    ws.isMachine = false;

    if (apiKey === env.API_KEY) {
      ws.isAuthenticated = true;
      ws.isMachine = true;
    } else if (token) {
      const payload = verifyJWT(token);
      if (payload) {
        ws.isAuthenticated = true;
        ws.user = payload;
      }
    }

    if (!ws.isAuthenticated) {
      logger.warn(`[WS] Connection rejected: Unauthorized (${clientAddr})`);
      ws.close(4001, 'Unauthorized');
      return;
    }
    // ────────────────────────────

    clients.add(ws);
    const roleStr = ws.isMachine ? 'Edge Device' : `User:${ws.user.username}`;
    logger.info(`[WS] Client connected [${roleStr}]: ${clientAddr} (${clients.size} total)`);

    ws.on('message', async (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        respond(ws, 'error', { message: 'Invalid JSON' }, false);
        return;
      }

      if (!msg.action) {
        respond(ws, 'error', { message: 'Missing "action" field' }, false);
        return;
      }

      // Strict route protection
      if (['detect', 'start_session', 'end_session'].includes(msg.action) && !ws.isMachine) {
        respond(ws, 'error', { message: 'Forbidden: Only edge devices can send telemetry' }, false);
        return;
      }

      try {
        await routeMessage(ws, msg);
      } catch (err) {
        logger.error(`[WS] Unhandled error in action "${msg.action}":`, err.message);
        respond(ws, 'error', { message: 'Internal server error' }, false);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      liveSubscribers.delete(ws);
      logger.info(`[WS] Client disconnected: ${clientAddr} (${clients.size} remaining)`);
    });

    ws.on('error', (err) => {
      logger.error(`[WS] Socket error (${clientAddr}):`, err.message);
      clients.delete(ws);
      liveSubscribers.delete(ws);
    });
  });
}
