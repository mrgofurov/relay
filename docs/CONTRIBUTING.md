# Contributing to Relay

We welcome contributions to Relay!

---

## Development Workflow

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/relay-ai/relay.git
   cd relay
   ```

2. Run test suites:
   - **Backend**:
     ```bash
     cd apps/api
     source .venv/bin/activate
     pytest tests/
     ```
   - **Frontend**:
     ```bash
     cd apps/web
     npm run type-check
     npm run build
     ```
   - **Go SDK**:
     ```bash
     cd packages/sdk-go
     go test ./...
     ```

3. Follow clean architecture standards:
   - Backend logic resides in `app/services/` and database models in `app/models/`.
   - Keep communication strictly thread-first.
   - Respect discussion guardrails.
