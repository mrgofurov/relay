# Relay Installation & Setup Guide

Relay is built to be deployed with one command using Docker, or run locally in development mode.

---

## 🚀 Quickstart: Docker Compose (Recommended)

### Prerequisites
- Docker (version 20.10+)
- Docker Compose (v2.0+)

### 1-Command Startup
```bash
git clone https://github.com/relay-ai/relay.git
cd relay
cp .env.example .env
docker compose up -d
```

### Accessing Relay
- **Web UI**: [http://localhost:3000](http://localhost:3000)
- **REST API Docs**: [http://localhost:3000/docs](http://localhost:3000/docs)
- **WebSocket Endpoint**: `ws://localhost:3000/ws`

---

## 💻 Local Development Setup

### 1. Backend (`apps/api`)
```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run migrations or start app directly (SQLite auto-initializes)
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend (`apps/web`)
```bash
cd apps/web
npm install --legacy-peer-deps
npm run dev
```

### 3. Relay CLI
```bash
cd apps/api
source .venv/bin/activate
pip install -e .

# Test CLI
relay --help
relay init
relay login
```
