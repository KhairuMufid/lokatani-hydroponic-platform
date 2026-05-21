/**
 * Mock IoT Node — QoS Stress-Test Client
 *
 * Simulates a Raspberry Pi 4 edge device firing high-frequency JSON payloads
 * containing Base64 image data to the backend via HTTP, WebSocket, or MQTT.
 *
 * Usage:
 *   node src/tests/mock-iot.js <PROTOCOL> <FPS> <DURATION_SECONDS>
 *
 * Examples:
 *   node src/tests/mock-iot.js HTTP 10 30    # 10 FPS for 30 seconds via HTTP
 *   node src/tests/mock-iot.js WS   15 60    # 15 FPS for 60 seconds via WebSocket
 *   node src/tests/mock-iot.js MQTT 10 30    # 10 FPS for 30 seconds via MQTT
 *
 * @module tests/mock-iot
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Generate valid 1x1 transparent PNG Base64 Payload as fallback ───
const DUMMY_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

// Read real sample image
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
const [, , protocol, fpsStr, durationStr] = process.argv;

if (!protocol || !fpsStr || !durationStr) {
  console.error('Usage: node src/tests/mock-iot.js <HTTP|WS|MQTT> <FPS> <DURATION_SECONDS>');
  process.exit(1);
}

const API_KEY = process.env.API_KEY || 'lokatani-edge-device-key';

const PROTOCOL = protocol.toUpperCase();
const FPS = parseInt(fpsStr, 10);
const DURATION = parseInt(durationStr, 10);
const INTERVAL_MS = Math.floor(1000 / FPS);
const TOTAL_EXPECTED = FPS * DURATION;

if (!['HTTP', 'WS', 'MQTT'].includes(PROTOCOL)) {
  console.error(`Invalid protocol: "${PROTOCOL}". Use HTTP, WS, or MQTT.`);
  process.exit(1);
}


// Simulated pest detections (Stateful for Centroid Tracking)
const PEST_CLASSES = ['kutu_daun', 'ulat_grayak', 'kutu_kebul', 'thrips', 'tungau', 'belalang', 'winged_aphid', 'kutu_putih'];

let simulatedBugs = [];
let secondWaveSpawned = false;

function spawnBugs(append = false) {
  const count = 3 + Math.floor(Math.random() * 4); // 3-6 bugs per wave
  if (!append) {
    simulatedBugs = [];
    secondWaveSpawned = false;
  }
  
  for (let i = 0; i < count; i++) {
    simulatedBugs.push({
      class_name: PEST_CLASSES[Math.floor(Math.random() * PEST_CLASSES.length)],
      confidence: +(0.4 + Math.random() * 0.5).toFixed(3),
      cx: 800 + Math.floor(Math.random() * 800), // Start immediately visible on the right half of the screen
      cy: 100 + Math.floor(Math.random() * 700),  // Stay within 900px height
      w: 80 + Math.floor(Math.random() * 40),
      h: 80 + Math.floor(Math.random() * 40),
      active: true,
    });
  }
}

function updateAndGetDetections() {
  const detections = [];
  for (const bug of simulatedBugs) {
    if (!bug.active) continue;

    // Shift X by ~2.2 pixels per frame (camera moving right, bugs move left in frame)
    bug.cx -= 2.2;

    if (bug.cx < -100) {
      bug.active = false;
      continue;
    }

    // If within 1600x900 FOV, generate a detection
    if (bug.cx > 0 && bug.cx < 1600) {
      // Small random jitter to simulate YOLO bounding box instability
      const jitterX = (Math.random() - 0.5) * 4;
      const jitterY = (Math.random() - 0.5) * 4;

      detections.push({
        class_name: bug.class_name,
        confidence: bug.confidence,
        bbox: [
          Math.max(0, bug.cx - bug.w / 2 + jitterX), // x
          Math.max(0, bug.cy - bug.h / 2 + jitterY), // y
          bug.w, // width
          bug.h, // height
        ],
      });
    }
  }
  return detections;
}

// Ensure bugs exist at start
spawnBugs();

function buildPayload() {
  return {
    timestamp: new Date().toISOString(),
    image_base64: IMAGE_BASE64,
    detections: updateAndGetDetections(),
  };
}

// ─── Statistics ──────────────────────────────────────
let sent = 0;
let success = 0;
let failed = 0;
const latencies = [];
const startTime = Date.now();

function printProgress() {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  process.stdout.write(
    `\r⏱ ${elapsed}s | Sent: ${sent}/${TOTAL_EXPECTED} | ✅ ${success} | ❌ ${failed}`
  );
}

function printSummary() {
  console.log('\n\n════════════════════════════════════════');
  console.log('       QoS STRESS TEST — SUMMARY');
  console.log('════════════════════════════════════════');
  console.log(`Protocol:     ${PROTOCOL}`);
  console.log(`Target FPS:   ${FPS}`);
  console.log(`Duration:     ${DURATION}s`);
  console.log(`Sent:         ${sent}`);
  console.log(`Success:      ${success}`);
  console.log(`Failed:       ${failed}`);

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

// ─── HTTP Client ─────────────────────────────────────
async function sendHTTP() {
  const PORT = process.env.PORT_HTTP || 3000;
  const url = `http://localhost:${PORT}/api/detect`;

  const intervalId = setInterval(async () => {
    const elapsedSec = (Date.now() - startTime) / 1000;
    const cycleTime = elapsedSec % 36; // 30s traverse + 6s gap

    if (cycleTime > 30) {
      // GAP PERIOD: simulate slider pausing at end of track.
      // Triggers the backend SessionManager's 5s timeout.
      simulatedBugs = []; // ALWAYS reset to avoid empty sessions
      secondWaveSpawned = false;
      return;
    } else if (simulatedBugs.length === 0) {
      spawnBugs();
    } else if (cycleTime > 15 && !secondWaveSpawned) {
      // SECOND WAVE: prove cumulative counting works mid-session
      secondWaveSpawned = true;
      spawnBugs(true);
    }

    const payload = buildPayload();
    const sendTime = Date.now();
    sent++;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': API_KEY 
        },
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

    printProgress();
  }, INTERVAL_MS);

  setTimeout(() => {
    clearInterval(intervalId);
    // Wait for in-flight requests
    setTimeout(() => {
      printSummary();
      process.exit(0);
    }, 2000);
  }, DURATION * 1000);
}

// ─── WebSocket Client ────────────────────────────────
async function sendWS() {
  const { default: WebSocket } = await import('ws');
  const PORT = process.env.PORT_WS || 8080;
  const ws = new WebSocket(`ws://localhost:${PORT}?api_key=${API_KEY}`);

  ws.on('open', () => {
    console.log(`[WS] Connected to ws://localhost:${PORT}`);

    const intervalId = setInterval(() => {
      const elapsedSec = (Date.now() - startTime) / 1000;
      const cycleTime = elapsedSec % 36;
      if (cycleTime > 30) {
        if (simulatedBugs.some(b => b.active)) simulatedBugs = [];
        return;
      } else if (simulatedBugs.length === 0) {
        spawnBugs();
      }

      const payload = buildPayload();
      sent++;

      ws.send(JSON.stringify({ action: 'detect', data: payload }));
      printProgress();
    }, INTERVAL_MS);

    setTimeout(() => {
      clearInterval(intervalId);
      setTimeout(() => {
        ws.close();
        printSummary();
        process.exit(0);
      }, 2000);
    }, DURATION * 1000);
  });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.action === 'detect_result' && msg.success) {
        success++;
        if (msg.data && msg.data.latency_ms != null) {
          latencies.push(msg.data.latency_ms);
        }
      } else if (msg.action === 'detect_result') {
        failed++;
      }
    } catch {
      // ignore parse errors on response
    }
  });

  ws.on('error', (err) => {
    console.error(`\n[WS] Error: ${err.message}`);
    process.exit(1);
  });
}

// ─── MQTT Client ─────────────────────────────────────
async function sendMQTT() {
  const { default: mqtt } = await import('mqtt');
  const BROKER = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
  const client = mqtt.connect(BROKER, {
    clientId: `mock-iot-${Date.now()}`,
    clean: true,
  });

  client.on('connect', () => {
    console.log(`[MQTT] Connected to ${BROKER}`);

    // Subscribe to response topic
    client.subscribe('lokatani/detect/down', { qos: 0 });

    const intervalId = setInterval(() => {
      const elapsedSec = (Date.now() - startTime) / 1000;
      const cycleTime = elapsedSec % 36;
      if (cycleTime > 30) {
        if (simulatedBugs.some(b => b.active)) simulatedBugs = [];
        return;
      } else if (simulatedBugs.length === 0) {
        spawnBugs();
      }

      const payload = buildPayload();
      payload.api_key = API_KEY;
      sent++;

      client.publish('lokatani/detect/up', JSON.stringify(payload), { qos: 0 });
      printProgress();
    }, INTERVAL_MS);

    setTimeout(() => {
      clearInterval(intervalId);
      setTimeout(() => {
        client.end(false, {}, () => {
          printSummary();
          process.exit(0);
        });
      }, 2000);
    }, DURATION * 1000);
  });

  client.on('message', (topic, buf) => {
    try {
      const msg = JSON.parse(buf.toString());
      if (msg.success) {
        success++;
        if (msg.latency_ms != null) {
          latencies.push(msg.latency_ms);
        }
      } else {
        failed++;
      }
    } catch {
      // ignore parse errors on response
    }
  });

  client.on('error', (err) => {
    console.error(`\n[MQTT] Error: ${err.message}`);
    process.exit(1);
  });
}

// ─── Main ────────────────────────────────────────────
console.log(`\n🚀 Mock IoT — ${PROTOCOL} @ ${FPS} FPS for ${DURATION}s (${TOTAL_EXPECTED} frames)\n`);

switch (PROTOCOL) {
  case 'HTTP': sendHTTP(); break;
  case 'WS': sendWS(); break;
  case 'MQTT': sendMQTT(); break;
}
