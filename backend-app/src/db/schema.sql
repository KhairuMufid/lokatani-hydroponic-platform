-- ============================================================
-- Lokatani Smart Hydroponics — Full Database Schema
-- Run this file in pgAdmin against the 'lokatani' database.
-- ============================================================

-- 0. Admin Users
CREATE TABLE IF NOT EXISTS tb_users (
    id          SERIAL PRIMARY KEY,
    username    VARCHAR(50) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    role        VARCHAR(20) DEFAULT 'admin',
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 1. Pest Master Data
CREATE TABLE IF NOT EXISTS tb_hama (
    id          SERIAL PRIMARY KEY,
    nama_hama   VARCHAR(100) NOT NULL UNIQUE,
    deskripsi   TEXT,
    gejala      TEXT,
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. DSS Mitigation Actions (linked to pests)
CREATE TABLE IF NOT EXISTS tb_penanganan (
    id          SERIAL PRIMARY KEY,
    hama_id     INT NOT NULL REFERENCES tb_hama(id) ON DELETE CASCADE,
    jenis       VARCHAR(20) NOT NULL CHECK (jenis IN ('preventif', 'kuratif')),
    deskripsi   TEXT NOT NULL,
    bahan       TEXT,
    instruksi   TEXT,
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_penanganan_hama ON tb_penanganan(hama_id);

-- 3. Core Detection / Telemetry Log
CREATE TABLE IF NOT EXISTS tb_detection_log (
    id                BIGSERIAL PRIMARY KEY,
    protokol          VARCHAR(10) NOT NULL CHECK (protokol IN ('HTTP', 'WS', 'MQTT')),
    waktu_kirim       TIMESTAMPTZ NOT NULL,
    waktu_terima      TIMESTAMPTZ NOT NULL,
    latency_ms        REAL GENERATED ALWAYS AS (
                          GREATEST(0, EXTRACT(EPOCH FROM (waktu_terima - waktu_kirim)) * 1000)
                      ) STORED,
    image_path        VARCHAR(500),
    total_detections  INT NOT NULL DEFAULT 0,
    metadata          JSONB DEFAULT '{}',
    created_at        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_detection_log_protokol      ON tb_detection_log(protokol);
CREATE INDEX IF NOT EXISTS idx_detection_log_created_at    ON tb_detection_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_detection_log_proto_created ON tb_detection_log(protokol, created_at DESC);

-- 3b. Scan Session (groups frames from one slider traversal)
CREATE TABLE IF NOT EXISTS tb_scan_session (
    id              BIGSERIAL PRIMARY KEY,
    started_at      TIMESTAMPTZ NOT NULL,
    ended_at        TIMESTAMPTZ,
    status          VARCHAR(15) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'completed')),
    protokol        VARCHAR(10),
    total_frames    INT NOT NULL DEFAULT 0,
    raw_detections  INT NOT NULL DEFAULT 0,
    unique_pests    INT NOT NULL DEFAULT 0,
    dedup_ratio     REAL GENERATED ALWAYS AS (
                        CASE WHEN raw_detections > 0
                             THEN ROUND(((1.0 - unique_pests::numeric / raw_detections) * 100), 1)::real
                             ELSE 0 END
                    ) STORED,
    pest_summary    JSONB DEFAULT '{}',
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scan_session_status     ON tb_scan_session(status);
CREATE INDEX IF NOT EXISTS idx_scan_session_created_at ON tb_scan_session(created_at DESC);

-- Link detection_log to sessions
ALTER TABLE tb_detection_log ADD COLUMN IF NOT EXISTS scan_session_id BIGINT
    REFERENCES tb_scan_session(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_detection_log_session ON tb_detection_log(scan_session_id);

-- 4. Per-Object Detection Details (normalized: 1 row per detected object per frame)
CREATE TABLE IF NOT EXISTS tb_detection_detail (
    id                BIGSERIAL PRIMARY KEY,
    detection_log_id  BIGINT NOT NULL REFERENCES tb_detection_log(id) ON DELETE CASCADE,
    hama_id           INT REFERENCES tb_hama(id) ON DELETE SET NULL,
    confidence        REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    bbox              JSONB NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_detail_log_id ON tb_detection_detail(detection_log_id);
CREATE INDEX IF NOT EXISTS idx_detail_hama   ON tb_detection_detail(hama_id);

-- 5. Alert / Notification System
CREATE TABLE IF NOT EXISTS tb_alert (
    id                BIGSERIAL PRIMARY KEY,
    detection_log_id  BIGINT REFERENCES tb_detection_log(id) ON DELETE SET NULL,
    severity          VARCHAR(10) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status            VARCHAR(15) NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'acknowledged', 'resolved')),
    message           TEXT NOT NULL,
    acknowledged_at   TIMESTAMPTZ,
    resolved_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Partial index: only active alerts are frequently queried
CREATE INDEX IF NOT EXISTS idx_alert_status     ON tb_alert(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_alert_severity   ON tb_alert(severity);
CREATE INDEX IF NOT EXISTS idx_alert_created_at ON tb_alert(created_at DESC);
