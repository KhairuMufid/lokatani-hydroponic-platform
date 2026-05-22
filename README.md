# 🌿 HydroTect: Smart Hydroponics Pest Detection System

![Status](https://img.shields.io/badge/Status-Production_Ready-success)
![Version](https://img.shields.io/badge/Version-1.0.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-v22-339933?logo=node.js)
![React](https://img.shields.io/badge/React-v18-61DAFB?logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v16-4169E1?logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)
![MQTT](https://img.shields.io/badge/Protocol-MQTT%20%7C%20WS%20%7C%20HTTP-orange)

**HydroTect** adalah platform *Internet of Things* (IoT) berbasis _dashboard_ cerdas untuk monitoring dan deteksi hama pada sistem pertanian hidroponik secara _real-time_. 

Platform ini menghadirkan perbandingan arsitektural _Quality of Service (QoS)_ antara 3 protokol komunikasi: **HTTP REST, WebSocket (WS), dan MQTT**.

---

## ✨ Fitur Utama

- **🛡️ Multi-Protocol Ingestion**: Penerimaan data telemetri IoT kamera menggunakan 3 standar protokol (HTTP, WebSocket, dan MQTT) untuk analisis uji komparasi QoS.
- **🎯 Algoritma Deduplikasi (Centroid Tracking)**: Mencegah *double-counting* hama dari kamera *slider* yang bergerak, berbasis batas piksel lintasan Euclidean.
- **⚡ Real-Time Notification & Alerts**: Panel kendali peringatan dini (_early warning_) dengan status *severity* (Low, Medium, High, Critical) terintegrasi Store Zustand dan notifikasi interaktif.
- **📊 QoS Telemetry Dashboard**: Visualisasi analitik interaktif performa jaringan/latensi berbasis Chart.js.
- **💡 Decision Support System (DSS)**: Saran mitigasi hama secara *real-time* (Preventif/Kuratif) sesaat usai sistem kamera mengenali hama hidroponik.
- **🐳 Multi-Stage Dockerized Deployment**: Lingkungan stabil *production-ready*, dengan kontainer terpisah untuk *Frontend*, *Backend*, *PostgreSQL*, dan *Mosquitto*.

---

## 🛠️ Teknologi yang Digunakan

| Komponen | Teknologi | Keterangan |
| --- | --- | --- |
| **Frontend (UI)** | React (Vite), TailwindCSS, Zustand | _Single Page Application (SPA)_ responsif dengan manajemen _state_ lokal. |
| **Backend (API)** | Node.js, Express.js, MQTT.js, ws | Memakai pola desain _Gateway-Controller-Service-Repository_ (Decoupled). |
| **Database** | PostgreSQL 16 | Relasional, relasi _ON DELETE CASCADE_, kalkulasi interval waktu bawaan SQL. |
| **Message Broker** | Eclipse Mosquitto | Mengelola jalur konektivitas MQTT over TCP (`1883`) & WebSockets (`9001`).|
| **DevOps / Infra** | Docker, Docker Compose, Nginx | _Reverse proxy_ routing, manajemen jaringan _bridge_ lokal kontainer. |

---

## 🚀 Panduan Instalasi (Getting Started)

Proyek ini telah dikonfigurasi melalui Docker Compose agar mudah direplikasi di mesin manapun.

### 1. Persyaratan Sistem
Pastikan sistem operasi (Windows/Linux/Mac) telah terinstal:
- [Docker Engine & Docker Compose](https://docs.docker.com/get-docker/)
- Git

### 2. Kloning Repositori
```bash
git clone https://github.com/KhairuMufid/lokatani-hydroponic-platform.git
cd lokatani-hydroponic-platform
```

### 3. Persiapan Lingkungan (Environment Variables)
Salin berkas blueprint environment ke berkas aktual rahasia milik Docker:
```bash
cp .env.docker .env
```
*(Opsional: Buka file `.env` dan ubah variabel kata sandi bawaan atau rahasia JWT jika diperlukan untuk production).*

### 4. Build & Jalankan Kontainer (Docker Up)
Proses ini akan mengunduh _images_ PostgreSQL dan Mosquitto, lalu membangun (build) kode asli React & Node.js:
```bash
docker compose up -d --build
```

### 5. Akses Layanan Lokal
Setelah semua container berjalan:
- 🌐 **Dashboard Frontend:** `http://localhost:80` (Akses di Browser)
- ⚙️ **Backend HTTP API:** `http://localhost:3000/api`
- 📡 **Backend WS API:** `ws://localhost:8080/ws`
- 🗄️ **MQTT Broker:** `mqtt://localhost:1883`

---

## 📂 Struktur Direktori

```text
hidroponik-platform/
├── backend-app/          # Kode Sumber (Node.js API & Protokol Ingestion)
│   ├── src/config/       # Konfigurasi Global (DB, env, mqtt broker)
│   ├── src/controllers/  # Pemrosesan Validasi Data & Respons HTTP
│   ├── src/db/           # Skema & Seed Tabel PostgreSQL (Auto-run)
│   ├── src/gateways/     # Pintu gerbang port komunikasi (HTTP, WS, MQTT)
│   ├── src/repositories/ # Kumpulan SQL Query murni abstrak
│   ├── src/services/     # Inti logika bisnis (Deduplikasi, Tracking dsb)
│   └── Dockerfile        # Instruksi Docker Server Node.js
├── frontend-app/         # Kode Sumber (React UI Web Aplikasi)
│   ├── src/components/   # Blok-blok visual (Navbar, Panel, Grafik)
│   ├── src/pages/        # Kumpulan Layout Utama Web (Dashboard, Setting dll)
│   ├── src/stores/       # Zustand State Management (Data Klien)
│   ├── Dockerfile        # Instruksi Build Vite + Reverse Proxy Nginx
│   └── vite.config.js    # Konfigurasi pengemasan modul UI
├── mosquitto/            # Tata kelola konfigurasi broker Mosquitto MQTT
├── .env.docker           # File cetak biru kunci sandi lingkungan (env var)
├── docker-compose.yml    # Arsitek orkestrasi 4 mesin sekaligus
├── API_CONTRACT.md       # (Opsional) Panduan Perjanjian Jalur API C / C++ IoT Hardware
└── CODE_REVIEW.md        # Catatan audit kesiapan sistem (Kematangan 85%-90%)
```

---

## 📝 Operasional Khusus (Opsional)

Jika ingin melakukan _shutdown_ / mematikan semua servis saat pengerjaan selesai:
```bash
docker compose down
```

Untuk melihat sistem log secara live *streaming* milik _backend_:
```bash
docker compose logs -f backend
```

---

