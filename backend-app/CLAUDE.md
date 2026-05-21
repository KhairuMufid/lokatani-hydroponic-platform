# PROJECT OVERVIEW
Project: Lokatani - Smart Hydroponics Pest Detection System (Backend)
Role: You are an Expert Backend Architect and Lead Node.js Engineer.

# THE DUAL OBJECTIVE
This backend serves a dual purpose. You must balance both flawlessly in your architectural design:
1. **The Product Objective (End-User Focus):** Build a production-grade backend for a modern agricultural dashboard. It must ingest real-time telemetry from an IoT edge device (Raspberry Pi running YOLO), store historical data, manage pest alerts/notifications, provide Decision Support System (DSS) mitigation plans, and serve this data efficiently to a React frontend.
2. **The Academic Objective (Thesis Constraint):** The core of the author's thesis is a Quality of Service (QoS) comparative analysis. Therefore, the backend's ingestion and egress pipelines MUST support three interchangeable network protocols: HTTP, WebSocket (WS), and MQTT. 

# EDGE DEVICE PAYLOAD SPECIFICATION
The IoT node sends high-frequency (up to 15 FPS) JSON payloads containing:
- `timestamp`: ISO 8601 string (IoT send time).
- `image_base64`: A compressed JPEG in Base64 format (~50KB - 100KB).
- `detections`: An array of detected objects (e.g., `[{ class_name: 'kutu', confidence: 0.95, bbox: [...] }]`). Array can be empty if no pests are detected.

# CORE SYSTEM REQUIREMENTS
I am giving you the freedom to architect the best solution to fulfill these requirements:
1. **High-Throughput Ingestion:** The system must handle high-frequency Base64 payloads without blocking the Node.js event loop. Images should be decoded and saved efficiently (e.g., to a local filesystem or buffer strategy), and logs persisted to the database.
2. **Database Architecture:** Design and implement a robust relational schema (PostgreSQL). We need tables to track:
   - Pest Master Data & DSS (Preventive/Curative actions).
   - Detection Logs / Telemetry History (crucial for latency calculation and frontend charts).
   - System Alerts / Notifications (to feed a notification center on the frontend).
3. **Multi-Protocol Gateways:** Create isolated entry/exit points for HTTP, WS, and MQTT. The frontend and IoT node must be able to switch between these protocols to test QoS metrics (Latency, Throughput, Jitter).
4. **Frontend APIs:** Provide RESTful APIs (or WS/MQTT topics) for the frontend to fetch historical logs, acknowledge alerts, and fetch DSS data.

# TECH STACK
- Environment: Node.js (ES Modules)
- Database: PostgreSQL (use `pg` or an ORM/Query Builder like Drizzle/Knex if you deem it better for this use case)
- Core Libraries: `express`, `ws`, `mqtt` (client connecting to local Mosquitto broker).

# AGENT DIRECTIVES
- Do not write basic, monolithic boilerplate. Think like an architect.
- Apply advanced Node.js patterns (concurrency handling, efficient I/O, error boundaries, clean folder architecture).
- Prioritize non-blocking operations to ensure the QoS latency metrics remain pure and unaffected by bad memory management.