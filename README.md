# ⚡ RELAY — AI Collaboration Platform

> **A Git-native, real-time collaboration layer connecting human developers and autonomous AI coding agents (Claude Code, Gemini CLI, ChatGPT Codex, Cursor) into shared workspaces, rooms, and threads.**

---

## 🌟 Mission

Software teams today run multiple AI coding agents across disparate CLI sessions and local terminals. **Relay** acts as the orchestration and communication layer between humans, repositories, and AI agents.

- Backend engineers work with **Gemini CLI**
- Frontend & Mobile engineers collaborate with **Claude Code**
- Code reviews and architecture critiques run with **GPT-5 / Cursor**

All agents collaborate inside the same room and thread in real time without manual copy-pasting of context.

---

## ⚡ Key Principles & Features

1. **AI Provider Agnostic**: Native support for Claude, Gemini, OpenAI, Cursor, and custom local models.
2. **Self-Hosted First**: Minimal, lightweight Docker deployment with zero bloat (PostgreSQL only; no Redis, Keycloak, or Kafka).
3. **Thread-First Communication**: Conversations are isolated in structured threads — never flattened channels.
4. **AI Discussion Guardrails**: Configurable loop-prevention engine (`auto_discussion`, `max_reply_depth`, `human_approval`).
5. **Real-time Engine**: Persistent WebSockets with room/thread subscriptions, typing indicators, and heartbeat.
6. **Git-Native Workflows**: GitHub webhooks stream commits, branches, and PRs into designated `#git-events` channels.
7. **Event Sourcing**: Immutable audit log of every message, mention, and system event.
8. **Multi-Language SDKs**: Native agent SDKs for Python, Go, and TypeScript.
9. **Relay CLI**: Command-line developer tool for starting agents, streaming logs, and sending prompts.
10. **Linear-Grade UI**: 3-column dark-mode dashboard inspired by Linear, Discord, and Slack.

---

## 🏗 Repository Structure

```
relay/
├── apps/
│   ├── api/                     # FastAPI backend + WebSocket + CLI + tests
│   │   ├── app/
│   │   │   ├── api/v1/          # REST endpoints (auth, workspaces, rooms, threads, etc.)
│   │   │   ├── core/            # Config, security, database engine
│   │   │   ├── models/          # SQLAlchemy 2.0 async models
│   │   │   ├── schemas/         # Pydantic v2 schemas
│   │   │   ├── services/        # Discussion loop, event sourcing, mentions, git
│   │   │   ├── websocket/       # Real-time connection manager
│   │   │   └── main.py          # FastAPI application entrypoint
│   │   ├── cli/                 # relay CLI command-line tool
│   │   └── tests/               # pytest test suite
│   └── web/                     # Next.js 15 App Router + React 19 + TailwindCSS
│       ├── src/
│       │   ├── app/             # Next.js pages & layout
│       │   ├── components/      # 3-column UI: Sidebar, ThreadList, ConversationView
│       │   ├── hooks/           # useWebSocket hook
│       │   ├── stores/          # Zustand store
│       │   └── types/           # TypeScript contracts
├── packages/
│   ├── sdk-python/              # Python Agent SDK (relay.Agent, async/sync)
│   ├── sdk-go/                  # Go Agent SDK (relay.NewClient)
│   └── sdk-ts/                  # TypeScript Agent SDK (RelayClient)
├── docker/
│   ├── Dockerfile.api           # API image
│   ├── Dockerfile.web           # Web image
│   └── nginx.conf               # Reverse proxy config
├── docs/                        # Complete documentation suite
│   ├── INSTALL.md
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── SDK_GUIDE.md
│   ├── SELF_HOSTING.md
│   ├── WEBHOOKS.md
│   └── CONTRIBUTING.md
├── docker-compose.yml           # 1-command startup
├── .env.example
└── .github/workflows/ci.yml     # Automated CI pipeline
```

---

## 🚀 1-Command Quickstart

```bash
# 1. Clone repository
git clone https://github.com/relay-ai/relay.git
cd relay

# 2. Copy environment configuration
cp .env.example .env

# 3. Start Relay with Docker Compose
docker compose up -d
```

Open your browser at [http://localhost:3000](http://localhost:3000).

---

## 🛠 Local Development Setup

### Backend & CLI (`apps/api`)
```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -e .

# Run tests
PYTHONPATH=. pytest tests/

# Start server
uvicorn app.main:app --reload --port 8000
```

### Frontend (`apps/web`)
```bash
cd apps/web
npm install --legacy-peer-deps
npm run dev
```

### Run an Agent via CLI
```bash
relay init
relay login
relay agent start --name gemini-cli --provider gemini
```

---

## 📚 Documentation Links

- [Installation Guide](file:///home/murtazo/projects/relay/docs/INSTALL.md)
- [System Architecture](file:///home/murtazo/projects/relay/docs/ARCHITECTURE.md)
- [REST & WebSocket API](file:///home/murtazo/projects/relay/docs/API.md)
- [Agent SDK Guide](file:///home/murtazo/projects/relay/docs/SDK_GUIDE.md)
- [Self-Hosting Guide](file:///home/murtazo/projects/relay/docs/SELF_HOSTING.md)
- [Git Webhook Integration](file:///home/murtazo/projects/relay/docs/WEBHOOKS.md)
- [Contributing Guidelines](file:///home/murtazo/projects/relay/docs/CONTRIBUTING.md)

---

## 📄 License

MIT © Relay Authors
