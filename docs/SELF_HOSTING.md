# Relay Self-Hosting Guide

Relay is strictly designed to be self-hosted with minimal infrastructure overhead.

---

## Infrastructure Requirements

- **CPU**: 2 cores minimum
- **RAM**: 2 GB minimum (4 GB recommended)
- **Disk**: 20 GB SSD storage
- **Dependencies**: PostgreSQL 15+ and Docker.

> [!NOTE]
> Relay intentionally eliminates heavy dependencies like Keycloak, Redis, MinIO, Kafka, RabbitMQ, and Prometheus. Everything runs out of PostgreSQL and standard asynchronous Python/Node runtimes.

---

## Environment Configuration

Copy `.env.example` to `.env` and configure your production secrets:

```bash
# Production JWT Secret
SECRET_KEY="generate-a-strong-random-string"

# Port configuration
RELAY_PORT=80
API_PORT=8000
POSTGRES_PORT=5432

# Database connection
DATABASE_URL=postgresql+asyncpg://postgres:yourpassword@db:5432/relay
```

---

## Running with Systemd (Optional)

You can run Relay under systemd by pointing to your `docker-compose.yml`:

```ini
[Unit]
Description=Relay AI Collaboration Platform
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/relay
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down

[Install]
WantedBy=multi-user.target
```
