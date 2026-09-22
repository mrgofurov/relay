# RELAY — AI Collaboration Platform (MASTER PROMPT)

> Build a production-ready, open-source, self-hosted AI collaboration platform where human developers and multiple AI coding agents (Claude Code, Gemini CLI, ChatGPT Codex, Cursor, etc.) can collaborate in shared workspaces, rooms, and threads in real time.

---

# Mission

Create **Relay**, a Git-native collaboration platform that allows software teams to connect their AI coding agents into shared rooms.

Relay is **NOT** an LLM provider.

Relay is a realtime communication and orchestration layer between humans, repositories, and AI agents.

Examples:

- Backend developer uses Gemini
- Mobile developer uses Claude
- Reviewer uses GPT-5

All three agents collaborate inside the same project without copy-pasting prompts.

---

# Core Principles

1. AI Provider Agnostic
2. Self Hosted First
3. Realtime by default
4. Thread-first communication
5. Git-native workflow
6. SDK-first architecture
7. Clean Architecture
8. Production ready
9. Extremely lightweight deployment
10. Beautiful modern UI

---

# Tech Stack (STRICT)

## Backend

- Python 3.13
- FastAPI
- SQLAlchemy 2.0 (async)
- PostgreSQL
- Alembic
- WebSocket
- JWT Authentication
- Pydantic v2

## Frontend

- Next.js 15
- React 19
- TypeScript
- TailwindCSS
- shadcn/ui
- TanStack Query
- Zustand

## Infrastructure

- Docker Compose
- Nginx
- PostgreSQL only

DO NOT USE:

- Keycloak
- Redis
- MinIO
- Kafka
- RabbitMQ
- Prometheus

Keep MVP minimal.

---

# Project Structure

relay/

apps/
api/
web/

packages/
sdk-python/
sdk-go/
sdk-ts/

docker/

docs/

.github/

Everything must be modular.

---

# Architecture

Human
│
▼
Web UI
│
WebSocket
│
▼
Relay API
│
├──────── PostgreSQL
│
├──────── Git Webhook
│
└──────── AI Agent SDK
│
├── Claude Code
├── Gemini CLI
├── GPT-5
└── Cursor

Relay API is the single source of truth.

---

# Features

## 1. Authentication

Implement lightweight JWT auth.

Entities:

- User
- Workspace
- Membership
- Role

Roles:

- Owner
- Admin
- Member
- Viewer

---

## 2. Workspace

A workspace contains multiple projects.

Example:

Acme Inc.

Projects:

- Mobile App
- Backend
- Dashboard

---

## 3. Project

Each project contains rooms.

Example:

GoKassa

Rooms:

- backend
- mobile
- api-contract
- integration
- bugs
- git-events

---

## 4. Rooms

Rooms are realtime channels.

Every room supports:

- messages
- AI agents
- threads
- mentions
- typing indicator
- file attachments
- websocket updates

---

## 5. Threads (VERY IMPORTANT)

Communication is thread-first.

Example:

Room: api-contract

Thread:

Product DTO v2

Messages remain inside thread.

Never flatten conversations.

---

## 6. Messages

Support multiple message types.

Types:

- human
- agent
- system
- git
- task

Message schema:

id

thread_id

room_id

workspace_id

author_id

author_type

content

mentions

created_at

edited_at

---

## 7. AI Agents

Agents are NOT users.

Agent entity:

- id
- workspace_id
- name
- provider
- model
- avatar
- transport
- status

Providers:

- Claude
- Gemini
- OpenAI
- Cursor
- Custom

Transport types:

- Local CLI
- HTTP API
- WebSocket

---

## 8. Local Agent SDK

Create SDKs.

### Python

relay.Agent()

### Go

relay.NewClient()

### TypeScript

new RelayClient()

Functions:

connect()

joinRoom()

sendMessage()

reply()

watch()

mention()

Reconnect automatically.

---

## 9. Realtime WebSocket

Every client maintains one persistent socket.

Events:

message.created

message.updated

thread.created

thread.updated

agent.online

agent.offline

typing.start

typing.stop

git.push

notification

Implement heartbeat and reconnect.

---

## 10. Mention System

Example:

@backend-ai

Design PostgreSQL schema.

Only mentioned agent receives request.

Support:

- @claude
- @gemini
- @gpt
- @everyone

---

## 11. AI Discussion Mode

Each room has settings.

Auto Discussion

ON / OFF

Max Reply Depth

Default: 3

Human Approval

ON / OFF

Prevent infinite loops.

Example:

Gemini replies

↓

Claude replies

↓

GPT reviews

↓

Stop.

---

## 12. Git Integration

GitHub webhook endpoint.

Events:

- Push
- Pull Request
- Branch
- Tag

Automatically post into git-events room.

Example:

Claude pushed feat/auth

8 files changed

124 insertions

Support GitLab later.

---

## 13. Event Sourcing

Store EVERYTHING as events.

Table:

events

Fields:

id

workspace_id

room_id

thread_id

actor_type

actor_name

event_type

payload JSONB

created_at

Never lose history.

---

## 14. Notifications

Unread counts.

Mention notifications.

Thread replies.

Agent online/offline.

Browser notifications.

---

## 15. Search

Global search.

Search by:

- room
- thread
- author
- content
- agent
- date

Use PostgreSQL Full Text Search.

---

# REST API

Implement REST and WebSocket.

Examples:

POST /auth/login

GET /workspaces

POST /workspaces

GET /projects

POST /rooms

GET /threads

POST /threads

POST /messages

GET /agents

POST /agents

POST /webhooks/github

Every endpoint must have OpenAPI docs.

---

# Database

Design normalized schema.

Tables:

users

workspaces

memberships

projects

rooms

threads

messages

agents

events

notifications

Indexes are mandatory.

Use UUID primary keys.

Use created_at everywhere.

---

# UI Design

Modern.

Minimal.

Inspired by:

- Linear
- Discord
- Slack
- GitHub

Three-column layout.

Left

Projects + Rooms

Center

Thread List

Right

Conversation

Support:

- Dark mode
- Light mode
- Responsive
- Keyboard shortcuts

---

# CLI

Create relay CLI.

Commands:

relay init

relay login

relay agent start

relay room list

relay room join

relay send

relay watch

relay webhook serve

Must work on Linux, macOS, Windows.

---

# Docker

One command installation.

git clone ...

cp .env.example .env

docker compose up -d

Open:

localhost:3000

No additional manual setup.

---

# Security

JWT

Password hashing

Rate limiting

CORS

Input validation

SQL injection protection

XSS protection

CSRF for browser

Never store AI API keys in plaintext.

Support encrypted secrets.

---

# Performance

Target:

100 concurrent users

1000 websocket connections

Message latency under 100ms locally.

Optimize queries.

Avoid N+1.

Use async everywhere.

---

# Testing

Backend:

pytest

Frontend:

Vitest

E2E:

Playwright

Coverage above 85%.

---

# Documentation

Generate:

README.md

INSTALL.md

ARCHITECTURE.md

API.md

SDK_GUIDE.md

SELF_HOSTING.md

WEBHOOKS.md

CONTRIBUTING.md

---

# Deliverables

Produce a complete production-ready repository including:

- Backend
- Frontend
- SDKs
- CLI
- Docker
- Database
- Tests
- Documentation

Code quality must be comparable to a real open-source project.

Do not generate toy examples.

Do not skip architecture decisions.

Think like a senior staff engineer building an open-source developer platform.