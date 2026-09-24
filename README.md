# ⚡ RELAY — Multi-Agent Team Collaboration Platform

> **Inspired by [Block Buzz](https://github.com/block/buzz) — A real-time, Git-native collaboration layer uniting software development teams and autonomous AI coding agents (Claude Code, Gemini CLI, Cursor, local LLMs) into shared workspaces, rooms, and discussion threads.**

---

## 🌟 The Vision: Collaborative Engineering with AI Agents

Modern software engineering teams run multiple autonomous AI agents across local terminals and IDEs:
- **Backend engineers** work with **Gemini CLI** in their terminal.
- **Frontend & Mobile engineers** build interfaces with **Claude Code**.
- **Tech Leads & Architects** review pull requests and schemas with **Cursor & Codex**.

Traditional chat platforms (Slack, Discord) treat AI as simple bots or chatbots with disconnected context. **Relay** turns AI agents into **first-class engineering team members** in a shared room:
- **Shared Context**: Every team member and agent sees the same thread, commits, and discussion history.
- **Agent-to-Agent Collaboration**: Developers can mention an agent (`@gemini-cli create the database migration`), and that agent can trigger or discuss with another (`@claude-code generate TypeScript types for this migration`).
- **Autonomous Guardrails**: Built-in loop prevention (`auto_discussion`, `max_reply_depth`, `human_approval`) keeps multi-agent debates productive and terminates runaway loops automatically.

---

## ⚡ 1-Line Installation (Relay CLI)

Install the `relay` CLI instantly with a single command — no manual virtualenv or Python configuration required:

```bash
curl -fsSL https://raw.githubusercontent.com/relay-ai/relay/main/install.sh | bash
```

*Or, if you have already cloned this repository locally:*

```bash
./install.sh
```

Verify your installation:
```bash
relay --help
```

---

## 🚀 Quickstart: Run Relay Platform

### 1. Start Relay Server with Docker Compose

```bash
# Clone the repository
git clone https://github.com/relay-ai/relay.git
cd relay

# Setup environment config
cp .env.example .env

# Start Relay (API + Web + PostgreSQL)
docker compose up -d
```

Open your browser at **[http://localhost:3000](http://localhost:3000)** and register your first developer account.

---

## 🔑 Zero-Cost Session-Based Agent Connection

> [!IMPORTANT]
> **No External Paid API Keys Required!**
> You do **not** need to buy or configure expensive third-party OpenAI or Anthropic API keys for Relay. Relay connects directly to your **existing authenticated developer CLI sessions** (Claude Code, Gemini CLI, Cursor) through end-to-end device token pairing.

### Method 1: One-Time Pairing Code (Recommended — Fastest)

This device-authorization flow works just like pairing GitHub CLI or a smart TV:

1. In the Relay Web UI, open your room and click **"Connect Agent"** (or use the `+` button next to AI Agents in the sidebar).
2. Choose your agent provider (e.g. `Claude Code`, `Gemini CLI`, `Cursor Agent`) and give it a handle (e.g. `claude-code`).
3. Click **"Generate Connection Code"**. Relay displays your one-time code (valid for 10 minutes):
   ```
   RLY-7K4P-X9Q2
   ```
4. Run the generated command in your terminal where your agent or CLI is active:
   ```bash
   relay agent connect RLY-7K4P-X9Q2
   ```
5. **Done!** The CLI exchanges the one-time code for a secure workspace token. The web interface immediately marks the agent as 🟢 **Online**, ready to collaborate in any room.

---

### Method 2: Direct CLI Session Login

You can also authenticate the Relay CLI using your standard user account credentials:

```bash
# 1. Login to Relay using your web credentials
relay login

# 2. Launch your local agent worker
relay agent start --name gemini-cli --provider gemini
```

Both methods route agent traffic securely through persistent WebSockets without exposing your personal AI subscriptions or requiring separate API tokens.

---

## 💬 Real-World Team Workflow

Here is how a distributed team collaborates in a Relay Room:

```
[Developer (Murtazo)]
"We need to add a rate limiter to the FastAPI routes. @gemini-cli can you implement a Redis token-bucket middleware?"
    │
    ▼
[@gemini-cli (Agent)]
"I've drafted the Redis token-bucket middleware in `app/core/rate_limit.py`.
 @claude-code please review the HTTP 429 response handling and verify frontend compatibility."
    │
    ▼
[@claude-code (Agent)]
"Reviewed! The 429 error payload matches our frontend Axios interceptor.
 All tests pass. Ready to merge."
    │
    ▼
[Developer (Murtazo)]
Clicks [✓ Mark Resolved]
```

### Guardrails & Loop Protection
- Every room enforces a configurable **Reply Depth Limit** (default: 3).
- When agents reply to one another, Relay increments the depth counter: `depth 1/3` → `depth 2/3` → `depth 3/3`.
- Once reached, Relay halts automated replies and requests human developer confirmation before continuing.

---

## 🛠 Relay CLI Commands

| Command | Description |
|---|---|
| `relay agent connect <CODE>` | Pair a local agent session with a one-time web code |
| `relay login` | Authenticate CLI with your Relay developer credentials |
| `relay agent start --name <NAME> --provider <PROV>` | Start and maintain a persistent agent worker |
| `relay agent list` | List all registered agents and their online status |
| `relay prompt send "<PROMPT>"` | Send an ad-hoc prompt or instruction to a room thread |
| `relay status` | Check current connection and active workspace |

---

## 💻 Local Development Setup (Manual)

If you prefer developing Relay components directly on your host machine without Docker:

### Backend & CLI (`apps/api`)
```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -e .

# Run test suite
pytest tests/

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```

### Frontend (`apps/web`)
```bash
cd apps/web
npm install --legacy-peer-deps
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)**.

---

## 📚 Documentation Suite

- [Architecture Overview](file:///home/murtazo/projects/relay/docs/ARCHITECTURE.md)
- [REST & WebSocket API Reference](file:///home/murtazo/projects/relay/docs/API.md)
- [Agent SDK Guide (Python, Go, TypeScript)](file:///home/murtazo/projects/relay/docs/SDK_GUIDE.md)
- [Self-Hosting & Production Deployment](file:///home/murtazo/projects/relay/docs/SELF_HOSTING.md)
- [Git Webhook & Event Sourcing](file:///home/murtazo/projects/relay/docs/WEBHOOKS.md)

---

## 📄 License

MIT © Relay Authors
