/**
 * Mock IoT Node — QoS Stress-Test & Reliability Test Client
 *
 * Simulates a Raspberry Pi 4 edge device using the new explicit session
 * lifecycle: START → SCAN POINTS → END → GAP → repeat.
 *
 * Usage:
 *   node src/tests/mock-iot.js <PROTOCOL> <SCAN_POINTS> <SESSIONS>
 *   node src/tests/mock-iot.js RELIABILITY_HTTP
 *
 * Examples:
 *   node src/tests/mock-iot.js HTTP 5 3          # 5 scan points per session, 3 sessions via HTTP
 *   node src/tests/mock-iot.js WS   8 2          # 8 scan points, 2 sessions via WebSocket
 *   node src/tests/mock-iot.js MQTT 5 3          # 5 scan points, 3 sessions via MQTT
 *   node src/tests/mock-iot.js RELIABILITY_HTTP  # Continuous 3s HTTP loop for DB reliability test
 *
 * Each scan point simulates the slider stopping, running YOLO burst,
 * and sending the single best frame to the backend.
 *
 * @module tests/mock-iot
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Load Real Image ────────────────────────────────
const DUMMY_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

let IMAGE_BASE64 = DUMMY_BASE64;
try {
  const imagePath = path.join(__dirname, 'sample.jpg');
  const fileBuffer = fs.readFileSync(imagePath);
  IMAGE_BASE64 = `data:image/jpeg;base64,${fileBuffer.toString('base64')}`;
  console.log(`✅ Loaded real sample.jpg (${(fileBuffer.length / 1024).toFixed(1)} KB)`);
} catch (err) {
  console.warn(`⚠️ Failed to load sample.jpg, falling back to 1x1 dummy: ${err.message}`);
}

// ─── Parse CLI Arguments ─────────────────────────────
const [, , protocol, scanPointsStr, sessionsStr] = process.argv;

const API_KEY = process.env.API_KEY || 'HydroTect-Edge-Device-Key';
const PROTOCOL = protocol ? protocol.toUpperCase() : '';

// Target GCP VM IP as default
const TARGET_HOST = process.env.TARGET_HOST || '34.101.92.242';

// Helper to construct HTTP base URL
function getHTTPBase(defaultPort) {
  if (TARGET_HOST.startsWith('http://') || TARGET_HOST.startsWith('https://')) {
    return TARGET_HOST;
  }
  if (TARGET_HOST === 'localhost' || TARGET_HOST === '127.0.0.1') {
    return `http://${TARGET_HOST}:${defaultPort}`;
  }
  if (TARGET_HOST.includes(':')) {
    return `http://${TARGET_HOST}`;
  }
  // Production reverse proxy defaults to Nginx on port 80
  return `http://${TARGET_HOST}`;
}

// Helper to construct WS URL
function getWSUrl(defaultPort) {
  if (TARGET_HOST.startsWith('ws://') || TARGET_HOST.startsWith('wss://')) {
    return `${TARGET_HOST}?api_key=${API_KEY}`;
  }
  if (TARGET_HOST === 'localhost' || TARGET_HOST === '127.0.0.1') {
    return `ws://${TARGET_HOST}:${defaultPort}?api_key=${API_KEY}`;
  }
  if (TARGET_HOST.includes(':')) {
    return `ws://${TARGET_HOST}?api_key=${API_KEY}`;
  }
  // Production reverse proxy default path for WS
  return `ws://${TARGET_HOST}/ws?api_key=${API_KEY}`;
}

// RELIABILITY modes don't need SCAN_POINTS/SESSIONS
const IS_RELIABILITY_MODE = PROTOCOL.startsWith('RELIABILITY_');

if (!IS_RELIABILITY_MODE && (!protocol || !scanPointsStr || !sessionsStr)) {
  console.error('Usage: node src/tests/mock-iot.js <HTTP|WS|MQTT> <SCAN_POINTS> <SESSIONS>');
  console.error('       node src/tests/mock-iot.js RELIABILITY_HTTP');
  console.error('  SCAN_POINTS: Number of scan points per session (slider stop positions)');
  console.error('  SESSIONS:    Number of complete scan sessions to simulate');
  process.exit(1);
}

const SCAN_POINTS = parseInt(scanPointsStr, 10) || 0;
const SESSIONS = parseInt(sessionsStr, 10) || 0;
const SCAN_INTERVAL_MS = 2000;  // 2s between scan points (simulates 10s burst, best frame)
const SESSION_GAP_MS = 3000;    // 3s gap between sessions

if (!IS_RELIABILITY_MODE && !['HTTP', 'WS', 'MQTT'].includes(PROTOCOL)) {
  console.error(`Invalid protocol: "${PROTOCOL}". Use HTTP, WS, MQTT, or RELIABILITY_HTTP.`);
  process.exit(1);
}

// ─── Simulated Pest Detections ───────────────────────
const PEST_CLASSES = ['kutu_daun', 'ulat_grayak', 'kutu_kebul', 'thrips', 'tungau', 'belalang'];

function generateDetections() {
  const count = 1 + Math.floor(Math.random() * 4); // 1-4 detections per scan point
  const detections = [];
  for (let i = 0; i < count; i++) {
    const cx = 100 + Math.floor(Math.random() * 1400);
    const cy = 100 + Math.floor(Math.random() * 700);
    const w = 80 + Math.floor(Math.random() * 40);
    const h = 80 + Math.floor(Math.random() * 40);
    detections.push({
      class_name: PEST_CLASSES[Math.floor(Math.random() * PEST_CLASSES.length)],
      confidence: +(0.55 + Math.random() * 0.40).toFixed(3),  // 0.55–0.95 (optimal frame)
      bbox: [Math.max(0, cx - w / 2), Math.max(0, cy - h / 2), w, h],
    });
  }
  return detections;
}

function buildPayload(sessionId) {
  return {
    scan_session_id: sessionId,
    timestamp: new Date().toISOString(),
    image_base64: IMAGE_BASE64,
    detections: generateDetections(),
    min_confidence: 0.60,
  };
}

// ─── Statistics ──────────────────────────────────────
let sent = 0;
let success = 0;
let failed = 0;
const latencies = [];
const startTime = Date.now();

function printProgress(sessionNum, scanPoint) {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  process.stdout.write(
    `\r⏱ ${elapsed}s | Session ${sessionNum}/${SESSIONS} | Point ${scanPoint}/${SCAN_POINTS} | ✅ ${success} | ❌ ${failed}`
  );
}

function printSummary() {
  console.log('\n\n════════════════════════════════════════');
  console.log('     QoS STRESS TEST — SUMMARY');
  console.log('════════════════════════════════════════');
  console.log(`Protocol:       ${PROTOCOL}`);
  console.log(`Sessions:       ${SESSIONS}`);
  console.log(`Scan Points:    ${SCAN_POINTS} per session`);
  console.log(`Total Frames:   ${sent}`);
  console.log(`Success:        ${success}`);
  console.log(`Failed:         ${failed}`);

  if (latencies.length > 0) {
    latencies.sort((a, b) => a - b);
    const avg = (latencies.reduce((s, l) => s + l, 0) / latencies.length).toFixed(2);
    const min = latencies[0].toFixed(2);
    const max = latencies[latencies.length - 1].toFixed(2);
    const p95 = latencies[Math.floor(latencies.length * 0.95)].toFixed(2);

    console.log(`\nLatency (round-trip):`);
    console.log(`  AVG:  ${avg} ms`);
    console.log(`  MIN:  ${min} ms`);
    console.log(`  MAX:  ${max} ms`);
    console.log(`  P95:  ${p95} ms`);
  }
  console.log('════════════════════════════════════════\n');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── HTTP Client ─────────────────────────────────────
async function runHTTP() {
  const PORT = process.env.PORT_HTTP || 3000;
  const BASE = getHTTPBase(PORT);
  const headers = { 'Content-Type': 'application/json', 'x-api-key': API_KEY };

  for (let s = 1; s <= SESSIONS; s++) {
    // 1. START SESSION
    console.log(`\n🟢 [HTTP] Starting session ${s}/${SESSIONS}...`);
    let sessionId;
    try {
      const res = await fetch(`${BASE}/api/session/start`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ protokol: 'HTTP' }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      sessionId = json.data.sessionId;
      console.log(`   Session #${sessionId} started`);
    } catch (err) {
      console.error(`   ❌ Failed to start session: ${err.message}`);
      continue;
    }

    // 2. SCAN POINTS
    for (let p = 1; p <= SCAN_POINTS; p++) {
      const payload = buildPayload(sessionId);
      const sendTime = Date.now();
      sent++;

      try {
        const res = await fetch(`${BASE}/api/detect`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (data.success) {
          success++;
          latencies.push(Date.now() - sendTime);
        } else {
          failed++;
        }
      } catch {
        failed++;
      }

      printProgress(s, p);
      if (p < SCAN_POINTS) await sleep(SCAN_INTERVAL_MS);
    }

    // 3. END SESSION
    try {
      const res = await fetch(`${BASE}/api/session/end`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ session_id: sessionId }),
      });
      const json = await res.json();
      if (json.success) {
        console.log(`\n🔴 [HTTP] Session #${sessionId} ended | Frames: ${json.data.total_frames} | Unique: ${json.data.unique_pests}`);
      }
    } catch (err) {
      console.error(`\n   ❌ Failed to end session: ${err.message}`);
    }

    // 4. GAP
    if (s < SESSIONS) {
      console.log(`   ⏸ Gap (${SESSION_GAP_MS / 1000}s)...`);
      await sleep(SESSION_GAP_MS);
    }
  }

  printSummary();
  process.exit(0);
}

// ─── WebSocket Client ────────────────────────────────
async function runWS() {
  const { default: WebSocket } = await import('ws');
  const PORT = process.env.PORT_WS || 8080;
  const ws = new WebSocket(getWSUrl(PORT));

  // Response handlers (promise-based)
  const pendingResponses = new Map();
  let responseIdCounter = 0;

  function waitForAction(action, timeoutMs = 10000) {
    const id = responseIdCounter++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pendingResponses.delete(action);
        reject(new Error(`Timeout waiting for ${action}`));
      }, timeoutMs);
      pendingResponses.set(action, { resolve, timer });
    });
  }

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      const handler = pendingResponses.get(msg.action);
      if (handler) {
        clearTimeout(handler.timer);
        pendingResponses.delete(msg.action);
        handler.resolve(msg);
      }
      // Track detect results
      if (msg.action === 'detect_result' && msg.success) {
        success++;
        if (msg.data?.latency_ms != null) latencies.push(msg.data.latency_ms);
      } else if (msg.action === 'detect_result') {
        failed++;
      }
    } catch { /* ignore */ }
  });

  ws.on('open', async () => {
    console.log(`[WS] Connected to ws://localhost:${PORT}`);

    for (let s = 1; s <= SESSIONS; s++) {
      // 1. START SESSION
      console.log(`\n🟢 [WS] Starting session ${s}/${SESSIONS}...`);
      ws.send(JSON.stringify({ action: 'start_session', data: { protokol: 'WS' } }));
      let sessionId;
      try {
        const resp = await waitForAction('start_session_result');
        sessionId = resp.data.sessionId;
        console.log(`   Session #${sessionId} started`);
      } catch (err) {
        console.error(`   ❌ ${err.message}`);
        continue;
      }

      // 2. SCAN POINTS
      for (let p = 1; p <= SCAN_POINTS; p++) {
        const payload = buildPayload(sessionId);
        sent++;
        ws.send(JSON.stringify({ action: 'detect', data: payload }));
        printProgress(s, p);
        if (p < SCAN_POINTS) await sleep(SCAN_INTERVAL_MS);
      }

      // Wait briefly for last detect_result
      await sleep(500);

      // 3. END SESSION
      ws.send(JSON.stringify({ action: 'end_session', data: { session_id: sessionId } }));
      try {
        const resp = await waitForAction('end_session_result');
        if (resp.success) {
          console.log(`\n🔴 [WS] Session #${sessionId} ended | Frames: ${resp.data.total_frames} | Unique: ${resp.data.unique_pests}`);
        }
      } catch (err) {
        console.error(`\n   ❌ ${err.message}`);
      }

      // 4. GAP
      if (s < SESSIONS) {
        console.log(`   ⏸ Gap (${SESSION_GAP_MS / 1000}s)...`);
        await sleep(SESSION_GAP_MS);
      }
    }

    ws.close();
    printSummary();
    process.exit(0);
  });

  ws.on('error', (err) => {
    console.error(`\n[WS] Error: ${err.message}`);
    process.exit(1);
  });
}

// ─── MQTT Client ─────────────────────────────────────
async function runMQTT() {
  const { default: mqtt } = await import('mqtt');
  const BROKER = process.env.MQTT_BROKER_URL || `mqtt://${TARGET_HOST}:1883`;
  const client = mqtt.connect(BROKER, {
    clientId: `mock-iot-${Date.now()}`,
    clean: true,
  });

  // Promise-based message waiters
  const pendingResponses = new Map();

  function waitForTopic(topic, actionFilter, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pendingResponses.delete(topic);
        reject(new Error(`Timeout waiting for ${topic}`));
      }, timeoutMs);
      pendingResponses.set(topic + (actionFilter || ''), { resolve, timer });
    });
  }

  client.on('connect', async () => {
    console.log(`[MQTT] Connected to ${BROKER}`);

    // Subscribe to response topics
    client.subscribe(['lokatani/detect/down', 'lokatani/session/ack'], { qos: 0 });

    for (let s = 1; s <= SESSIONS; s++) {
      // 1. START SESSION
      console.log(`\n🟢 [MQTT] Starting session ${s}/${SESSIONS}...`);
      const startPayload = { api_key: API_KEY, protokol: 'MQTT' };
      const startWaiter = waitForTopic('lokatani/session/ack', 'session_started');
      client.publish('lokatani/session/start', JSON.stringify(startPayload), { qos: 1 });

      let sessionId;
      try {
        const resp = await startWaiter;
        sessionId = resp.data.sessionId;
        console.log(`   Session #${sessionId} started`);
      } catch (err) {
        console.error(`   ❌ ${err.message}`);
        continue;
      }

      // 2. SCAN POINTS
      for (let p = 1; p <= SCAN_POINTS; p++) {
        const payload = buildPayload(sessionId);
        payload.api_key = API_KEY;
        sent++;
        client.publish('lokatani/detect/up', JSON.stringify(payload), { qos: 0 });
        printProgress(s, p);
        if (p < SCAN_POINTS) await sleep(SCAN_INTERVAL_MS);
      }

      // Wait for last detect response
      await sleep(500);

      // 3. END SESSION
      const endPayload = { api_key: API_KEY, session_id: sessionId };
      const endWaiter = waitForTopic('lokatani/session/ack', 'session_ended');
      client.publish('lokatani/session/end', JSON.stringify(endPayload), { qos: 1 });

      try {
        const resp = await endWaiter;
        console.log(`\n🔴 [MQTT] Session #${sessionId} ended | Frames: ${resp.data.total_frames} | Unique: ${resp.data.unique_pests}`);
      } catch (err) {
        console.error(`\n   ❌ ${err.message}`);
      }

      // 4. GAP
      if (s < SESSIONS) {
        console.log(`   ⏸ Gap (${SESSION_GAP_MS / 1000}s)...`);
        await sleep(SESSION_GAP_MS);
      }
    }

    client.end(false, {}, () => {
      printSummary();
      process.exit(0);
    });
  });

  // Route MQTT responses
  client.on('message', (topic, buf) => {
    try {
      const msg = JSON.parse(buf.toString());

      if (topic === 'lokatani/detect/down') {
        if (msg.success) {
          success++;
          if (msg.latency_ms != null) latencies.push(msg.latency_ms);
        } else {
          failed++;
        }
      }

      if (topic === 'lokatani/session/ack') {
        const key = topic + (msg.action || '');
        const handler = pendingResponses.get(key);
        if (handler) {
          clearTimeout(handler.timer);
          pendingResponses.delete(key);
          handler.resolve(msg);
        }
      }
    } catch { /* ignore */ }
  });

  client.on('error', (err) => {
    console.error(`\n[MQTT] Error: ${err.message}`);
    process.exit(1);
  });
}

// ─── RELIABILITY_HTTP — Continuous Loop for DB Failure Testing ───
/**
 * Simulates continuous detection data flow via HTTP (every 3 seconds)
 * for testing database failure recovery. This mode:
 *   - Runs INDEFINITELY (Ctrl+C to stop)
 *   - NEVER crashes on HTTP 500 / network errors
 *   - Prints clear status per cycle (✅ success or ⚠️ failure + status code)
 *   - Uses a single long-running session to keep data flowing
 *
 * Usage:  node src/tests/mock-iot.js RELIABILITY_HTTP
 */
async function runReliabilityHTTP() {
  const PORT = process.env.PORT_HTTP || 3000;
  const BASE = getHTTPBase(PORT);
  const headers = { 'Content-Type': 'application/json', 'x-api-key': API_KEY };
  const SEND_INTERVAL_MS = 3000; // 3 seconds — mimics real camera cycle

  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   RELIABILITY TEST — Continuous HTTP Detection Loop  ║');
  console.log('║   Interval: 3s | Target: POST /api/detect           ║');
  console.log('║   Press Ctrl+C to stop                              ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // --- 1. Start a persistent session ---
  let sessionId = null;
  while (sessionId === null) {
    try {
      const res = await fetch(`${BASE}/api/session/start`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ protokol: 'HTTP' }),
      });
      const json = await res.json();
      if (json.success) {
        sessionId = json.data.sessionId;
        console.log(`🟢 Session #${sessionId} started — beginning continuous detection loop\n`);
      } else {
        console.warn(`⚠️  Session start failed: ${json.error} — retrying in 3s...`);
        await sleep(SEND_INTERVAL_MS);
      }
    } catch (err) {
      console.warn(`⚠️  Cannot reach backend: ${err.message} — retrying in 3s...`);
      await sleep(SEND_INTERVAL_MS);
    }
  }

  // --- 2. Continuous detection loop ---
  let cycle = 0;
  let successCount = 0;
  let failCount = 0;

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Reliability test stopped by user.');
    console.log('════════════════════════════════════════');
    console.log(`   Total Cycles:  ${cycle}`);
    console.log(`   Success:       ${successCount}`);
    console.log(`   Failed:        ${failCount}`);
    console.log('════════════════════════════════════════\n');
    process.exit(0);
  });

  while (true) {
    cycle++;
    const payload = buildPayload(sessionId);
    const sendTime = Date.now();
    const timestamp = new Date(sendTime).toISOString();

    try {
      const res = await fetch(`${BASE}/api/detect`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        successCount++;
        const rtt = Date.now() - sendTime;
        console.log(
          `[${timestamp}] ✅ Cycle #${cycle} | HTTP ${res.status} | ` +
          `RTT: ${rtt}ms | Detections: ${data.data?.total_detections ?? '?'} | ` +
          `Latency: ${data.data?.latency_ms?.toFixed(1) ?? '?'}ms`
        );
      } else {
        failCount++;
        // Read body for error details but don't crash
        let errorMsg = '';
        try { const body = await res.json(); errorMsg = body.error || ''; } catch { /* ignore */ }
        console.warn(
          `[${timestamp}] ⚠️  Cycle #${cycle} | HTTP ${res.status} | ` +
          `Error: ${errorMsg || res.statusText} | ` +
          `Backend returned error — will retry in ${SEND_INTERVAL_MS / 1000}s`
        );
      }
    } catch (err) {
      failCount++;
      console.warn(
        `[${timestamp}] ❌ Cycle #${cycle} | NETWORK ERROR | ` +
        `${err.message} | Will retry in ${SEND_INTERVAL_MS / 1000}s`
      );
    }

    await sleep(SEND_INTERVAL_MS);
  }
}

// ─── Main ────────────────────────────────────────────
if (IS_RELIABILITY_MODE) {
  console.log(`\n🚀 Mock IoT — ${PROTOCOL} | Continuous Reliability Test\n`);
} else {
  console.log(`\n🚀 Mock IoT — ${PROTOCOL} | ${SCAN_POINTS} scan points × ${SESSIONS} sessions\n`);
}

switch (PROTOCOL) {
  case 'HTTP': runHTTP(); break;
  case 'WS': runWS(); break;
  case 'MQTT': runMQTT(); break;
  case 'RELIABILITY_HTTP': runReliabilityHTTP(); break;
  default:
    console.error(`Unknown protocol: ${PROTOCOL}`);
    process.exit(1);
}
