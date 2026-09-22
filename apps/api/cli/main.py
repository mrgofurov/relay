import asyncio
import json
import os
from pathlib import Path
from typing import Optional
import httpx
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
import typer
import websockets

app = typer.Typer(
    name="relay",
    help="Relay CLI — Connect human developers and AI coding agents in real-time.",
    add_completion=False,
)
agent_app = typer.Typer(help="Manage and start AI agents")
room_app = typer.Typer(help="Manage and interact with rooms")
webhook_app = typer.Typer(help="Webhook tools")

app.add_typer(agent_app, name="agent")
app.add_typer(room_app, name="room")
app.add_typer(webhook_app, name="webhook")

console = Console()
CONFIG_DIR = Path.home() / ".relay"
CONFIG_FILE = CONFIG_DIR / "config.json"


def get_config() -> dict:
    if not CONFIG_FILE.exists():
        return {"api_url": "http://localhost:8000", "ws_url": "ws://localhost:8000/ws"}
    try:
        with open(CONFIG_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return {"api_url": "http://localhost:8000", "ws_url": "ws://localhost:8000/ws"}


def save_config(data: dict):
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_FILE, "w") as f:
        json.dump(data, f, indent=2)


CREDENTIALS_FILE = CONFIG_DIR / "credentials.json"


def get_credentials() -> dict:
    """Load agent credentials from ~/.relay/credentials.json."""
    if not CREDENTIALS_FILE.exists():
        return {}
    try:
        with open(CREDENTIALS_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return {}


def save_credentials(data: dict):
    """Save agent credentials to ~/.relay/credentials.json with secure permissions."""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    CREDENTIALS_FILE.write_text(json.dumps(data, indent=2))
    try:
        import stat
        CREDENTIALS_FILE.chmod(stat.S_IRUSR | stat.S_IWUSR)  # 0600
    except Exception:
        pass


async def _agent_ws_loop(
    connect_url: str,
    api_url: str,
    user_token: Optional[str],
    agent_token: Optional[str],
    agent_id: Optional[str],
    name: str,
    provider: str,
    model: str,
    ai_key: Optional[str],
):
    """Shared WebSocket event loop for all agent authentication methods.

    Handles agent.mentioned events and posts AI replies back to threads.
    Reconnects automatically with exponential backoff on disconnection.
    """
    backoff = 1

    while True:
        try:
            console.print(f"[dim]Establishing persistent socket connection...[/dim]")
            async with websockets.connect(connect_url) as ws:
                console.print(f"[bold green]● Agent {name} is ONLINE and listening for mentions & messages![/bold green]")
                backoff = 1  # reset backoff on successful connection

                while True:
                    raw = await ws.recv()
                    msg = json.loads(raw)
                    ev = msg.get("event")
                    data = msg.get("data", {})

                    if ev == "agent.mentioned":
                        author = data.get("author_name", "Someone")
                        content = data.get("content", "")
                        thread_id = data.get("thread_id")
                        console.print(f"\n[bold yellow]🔔 Mentioned by {author}:[/bold yellow] {content}")

                        # Call AI provider API if key is available
                        gemini_key = ai_key or os.environ.get("GEMINI_API_KEY")
                        reply_text = ""
                        if gemini_key and provider == "gemini":
                            try:
                                console.print("[dim]Querying Google Gemini API...[/dim]")
                                gemini_model = "gemini-1.5-flash" if model in ("default", "gemini-3.8-flash", "gemini-1.5-flash") else model
                                gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{gemini_model}:generateContent?key={gemini_key}"
                                with httpx.Client(timeout=30.0) as ai_client:
                                    ai_res = ai_client.post(
                                        gemini_url,
                                        json={"contents": [{"parts": [{"text": content}]}]},
                                    )
                                    if ai_res.status_code == 200:
                                        reply_text = ai_res.json()["candidates"][0]["content"]["parts"][0]["text"]
                                    else:
                                        console.print(f"[dim]Gemini API error {ai_res.status_code}: {ai_res.text[:200]}[/dim]")
                            except Exception as err:
                                console.print(f"[dim]Gemini API error ({err}). Using fallback.[/dim]")

                        if not reply_text:
                            if not gemini_key:
                                reply_text = (
                                    f"⚠️ @{author}, I'm **@{name}** but no AI API key is configured.\n\n"
                                    f"To enable real AI responses, restart with:\n"
                                    f"```\nrelay agent start --name {name} --ai-key YOUR_GEMINI_API_KEY\n```\n"
                                    f"Or set: `export GEMINI_API_KEY=your_key`"
                                )
                            else:
                                reply_text = f"@{author} I'm online as **@{name}** ({model}) but couldn't generate a response right now."

                        console.print(f"[dim]Dispatching agent reply into thread {thread_id}...[/dim]")
                        with httpx.Client() as client:
                            # Use device-flow agent_token if available, else legacy user token + X-Agent-ID
                            if agent_token:
                                post_headers = {"Authorization": f"Bearer {agent_token}"}
                            else:
                                post_headers = {
                                    "Authorization": f"Bearer {user_token}",
                                    "X-Agent-ID": agent_id or "",
                                }
                            client.post(
                                f"{api_url}/api/v1/threads/{thread_id}/messages",
                                headers=post_headers,
                                json={"content": reply_text, "message_type": "agent", "provider": provider, "model": model},
                            )
                        console.print(f"[bold green]✓ Reply posted to thread![/bold green]")

                    elif ev == "message.created":
                        author_n = data.get("author_name", "")
                        if data.get("author_type") != "agent" or author_n != name:
                            console.print(f"[dim]{author_n}: {str(data.get('content', ''))[:80]}[/dim]")

        except (websockets.ConnectionClosed, Exception) as err:
            console.print(f"[red]Socket disconnected ({err}). Reconnecting in {backoff}s...[/red]")
            await asyncio.sleep(backoff)
            backoff = min(backoff * 2, 30)  # exponential backoff, max 30s


@app.command()
def init(
    api_url: str = typer.Option("http://localhost:8000", help="Relay API Base URL"),
    ws_url: str = typer.Option("ws://localhost:8000/ws", help="Relay WebSocket URL"),
):
    """Initialize Relay CLI configuration."""
    cfg = get_config()
    cfg["api_url"] = api_url.rstrip("/")
    cfg["ws_url"] = ws_url
    save_config(cfg)
    console.print(Panel.fit(
        f"[green]✓ Relay CLI initialized successfully![/green]\n"
        f"API URL: [cyan]{cfg['api_url']}[/cyan]\n"
        f"WebSocket: [cyan]{cfg['ws_url']}[/cyan]\n"
        f"Config saved to: [yellow]{CONFIG_FILE}[/yellow]",
        title="Relay Init"
    ))


@app.command()
def register(
    email: str = typer.Option(..., prompt=True, help="User email address"),
    password: str = typer.Option(..., prompt=True, hide_input=True, help="User password"),
    full_name: str = typer.Option(..., prompt=True, help="Full name"),
):
    """Register a new user account and log in."""
    cfg = get_config()
    api_url = cfg.get("api_url", "http://localhost:8000")

    try:
        with httpx.Client() as client:
            resp = client.post(
                f"{api_url}/api/v1/auth/register",
                json={"email": email, "password": password, "full_name": full_name},
            )
            if resp.status_code != 200:
                console.print(f"[red]Registration failed: {resp.text}[/red]")
                raise typer.Exit(1)

            console.print(f"[green]✓ Successfully registered account for [bold]{email}[/bold]![/green]")
            # Automatically log in after registration
            login_resp = client.post(
                f"{api_url}/api/v1/auth/login",
                json={"email": email, "password": password},
            )
            if login_resp.status_code == 200:
                data = login_resp.json()
                cfg["access_token"] = data["access_token"]
                me_resp = client.get(
                    f"{api_url}/api/v1/workspaces",
                    headers={"Authorization": f"Bearer {data['access_token']}"},
                )
                if me_resp.status_code == 200:
                    workspaces = me_resp.json()
                    if workspaces:
                        cfg["default_workspace_id"] = workspaces[0]["id"]
                        cfg["default_workspace_name"] = workspaces[0]["name"]
                save_config(cfg)
                console.print(f"[green]✓ Logged in to workspace [cyan]{cfg.get('default_workspace_name', 'Default')}[/cyan]![/green]")
    except typer.Exit:
        raise
    except Exception as e:
        console.print(f"[red]Error connecting to {api_url}: {e}[/red]")
        raise typer.Exit(1)


@app.command()
def login(
    email: str = typer.Option(..., prompt=True, help="User email address"),
    password: str = typer.Option(..., prompt=True, hide_input=True, help="User password"),
):
    """Authenticate and store login session."""
    cfg = get_config()
    api_url = cfg.get("api_url", "http://localhost:8000")

    try:
        with httpx.Client() as client:
            resp = client.post(
                f"{api_url}/api/v1/auth/login",
                json={"email": email, "password": password},
            )
            if resp.status_code != 200:
                console.print(f"[red]Authentication failed: {resp.text}[/red]")
                console.print("[yellow]Tip: If you haven't created an account yet, run 'relay register' or sign up at http://localhost:3000[/yellow]")
                raise typer.Exit(1)

            data = resp.json()
            cfg["access_token"] = data["access_token"]

            # Fetch user workspaces
            me_resp = client.get(
                f"{api_url}/api/v1/workspaces",
                headers={"Authorization": f"Bearer {data['access_token']}"},
            )
            if me_resp.status_code == 200:
                workspaces = me_resp.json()
                if workspaces:
                    cfg["default_workspace_id"] = workspaces[0]["id"]
                    cfg["default_workspace_name"] = workspaces[0]["name"]

            save_config(cfg)
            console.print(f"[green]✓ Successfully logged in as [bold]{email}[/bold]![/green]")
            if "default_workspace_name" in cfg:
                console.print(f"Active workspace: [cyan]{cfg['default_workspace_name']}[/cyan]")
    except typer.Exit:
        raise
    except Exception as e:
        console.print(f"[red]Error connecting to {api_url}: {e}[/red]")
        raise typer.Exit(1)



@agent_app.command("connect")
def agent_connect(
    code: str = typer.Argument(..., help="One-time connection code from Relay UI (e.g. RLY-7K4P-X9Q2)"),
    agent_name: Optional[str] = typer.Option(None, "--name", help="Override agent name"),
    model: Optional[str] = typer.Option(None, "--model", help="Override model identifier"),
):
    """Connect a local AI agent to Relay using a one-time connection code.

    Get the code from: Relay Web UI → Settings → Agents → Connect Agent

    Example:
        relay agent connect RLY-7K4P-X9Q2

    No AI provider API key is required.
    Your Relay credential is saved to ~/.relay/credentials.json
    """
    cfg = get_config()
    api_url = cfg.get("api_url", "http://localhost:8000")

    console.print(Panel.fit(
        f"[bold cyan]Relay Agent Connection[/bold cyan]\n"
        f"Connecting to Relay at [cyan]{api_url}[/cyan]...",
        title="relay agent connect"
    ))

    try:
        with httpx.Client(timeout=30.0) as client:
            payload: dict = {"code": code.strip().upper()}
            if agent_name:
                payload["agent_name"] = agent_name
            if model:
                payload["model"] = model

            resp = client.post(
                f"{api_url}/api/v1/agent-connections/exchange",
                json=payload,
            )

            if resp.status_code == 400:
                error = resp.json().get("detail", resp.text)
                console.print(f"[red]✗ Connection failed: {error}[/red]")
                if "already been used" in error:
                    console.print("[yellow]Tip: Each code can only be used once. Generate a new code from the Relay UI.[/yellow]")
                elif "expired" in error:
                    console.print("[yellow]Tip: Codes expire in 10 minutes. Generate a fresh code from the Relay UI.[/yellow]")
                raise typer.Exit(1)

            if resp.status_code != 200:
                console.print(f"[red]✗ Server error ({resp.status_code}): {resp.text}[/red]")
                raise typer.Exit(1)

            data = resp.json()
            agent_token = data["agent_token"]
            resolved_agent_id = data["agent_id"]
            resolved_agent_name = data["agent_name"]
            workspace_id = data["workspace_id"]
            workspace_name = data["workspace_name"]

            # Save credential securely to ~/.relay/credentials.json
            creds = get_credentials()
            creds[resolved_agent_name] = {
                "agent_token": agent_token,
                "agent_id": resolved_agent_id,
                "workspace_id": workspace_id,
                "workspace_name": workspace_name,
            }
            save_credentials(creds)

            console.print(f"\n[bold green]✓ Connection code accepted[/bold green]")
            console.print(f"[bold green]✓ Workspace verified[/bold green]: [cyan]{workspace_name}[/cyan]")
            console.print(f"[bold green]✓ Agent identity created[/bold green]: [bold]{resolved_agent_name}[/bold]")
            console.print(f"[bold green]✓ Credential saved[/bold green] to [yellow]~/.relay/credentials.json[/yellow]")
            console.print()
            console.print(Panel.fit(
                f"[bold green]Agent Connected![/bold green]\n\n"
                f"Agent:      [bold]{resolved_agent_name}[/bold]\n"
                f"Workspace:  [cyan]{workspace_name}[/cyan]\n\n"
                f"[dim]Now start the agent runner:[/dim]\n"
                f"[bold yellow]relay agent start --name {resolved_agent_name}[/bold yellow]",
                title="✓ Connected to Relay"
            ))

    except typer.Exit:
        raise
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        raise typer.Exit(1)


@agent_app.command("start")
def agent_start(
    name: str = typer.Option("gemini-cli", help="Agent identifier"),
    provider: str = typer.Option("gemini", help="Provider (gemini, claude, openai, cursor, custom)"),
    model: str = typer.Option("default", help="Model name"),
    workspace_id: Optional[str] = typer.Option(None, help="Target workspace ID"),
    agent_key: Optional[str] = typer.Option(None, help="Agent API key (legacy, prefer relay login)"),
    ai_key: Optional[str] = typer.Option(None, "--ai-key", help="AI provider API key (e.g. GEMINI_API_KEY). Falls back to env var."),
):
    """Start and run a local AI agent connected to Relay."""
    cfg = get_config()
    target_ws = workspace_id or cfg.get("default_workspace_id")
    api_url = cfg.get("api_url", "http://localhost:8000")
    ws_url = cfg.get("ws_url", "ws://localhost:8000/ws")
    token = cfg.get("access_token")

    # ── Priority 1: device-flow agent token from credentials.json ─────────────
    creds = get_credentials()
    agent_cred = creds.get(name, {})
    agent_token_from_creds = agent_cred.get("agent_token")
    agent_id_from_creds = agent_cred.get("agent_id")

    if agent_token_from_creds and agent_id_from_creds:
        target_ws = workspace_id or agent_cred.get("workspace_id") or cfg.get("default_workspace_id")
        agent_id = agent_id_from_creds
        console.print(f"[green]✓ Using device-flow credential for [bold]{name}[/bold][/green]")
        console.print(f"[dim]  Workspace: {agent_cred.get('workspace_name', target_ws)}[/dim]")

        # Display panel and launch WebSocket loop using agent_token
        console.print(Panel.fit(
            f"[bold cyan]Relay AI Agent Runner[/bold cyan]\n"
            f"Name: [green]{name}[/green] | Provider: [magenta]{provider}[/magenta] | Model: [yellow]{model}[/yellow]\n"
            f"Auth: [bold green]Device Token[/bold green] (no API key required)\n"
            f"Connecting to Relay WebSocket at: [cyan]{ws_url}[/cyan]\n"
            f"[dim]💡 Mention [bold]@{name}[/bold] in any thread on http://localhost:3000 to interact.[/dim]\n"
            f"[dim](Keep this terminal running in the background)[/dim]",
            title=f"Agent: {name}"
        ))

        async def run_agent_loop_token():
            connect_url = f"{ws_url}?agent_token={agent_token_from_creds}&workspace_id={target_ws}"
            await _agent_ws_loop(connect_url, api_url, token, agent_token_from_creds, agent_id, name, provider, model, ai_key)

        asyncio.run(run_agent_loop_token())
        return

    # ── Priority 2: legacy flows (backward compat) ────────────────────────────
    if not target_ws:
        console.print("[red]No workspace specified. Run 'relay login' or specify --workspace-id[/red]")
        raise typer.Exit(1)

    # Check saved agent keys in config
    saved_keys = cfg.get("agent_keys", {})
    key = agent_key or saved_keys.get(name)
    agent_id = None

    if not token and not key:
        console.print("[red]No credential found. Run:[/red]")
        console.print(f"  [bold yellow]relay agent connect <CODE>[/bold yellow]  ← get code from Relay UI")
        console.print("  or: relay login")
        raise typer.Exit(1)

    if token:
        with httpx.Client() as client:
            # Query existing agents in workspace
            ag_list_resp = client.get(
                f"{api_url}/api/v1/workspaces/{target_ws}/agents",
                headers={"Authorization": f"Bearer {token}"},
            )
            existing_agents = ag_list_resp.json() if ag_list_resp.status_code == 200 else []
            matching = [a for a in existing_agents if a["name"] == name]

            if matching:
                agent_id = matching[0]["id"]
                console.print(f"[green]✓ Found registered agent [bold]{name}[/bold] (ID: {agent_id})[/green]")
            else:
                resp = client.post(
                    f"{api_url}/api/v1/workspaces/{target_ws}/agents",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"name": name, "provider": provider, "model": model, "transport": "cli"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    key = data.get("api_key")
                    agent_id = data.get("agent", {}).get("id")
                    if key:
                        saved_keys[name] = key
                        cfg["agent_keys"] = saved_keys
                        save_config(cfg)
                    console.print(f"[green]✓ Agent [bold]{name}[/bold] registered.[/green]")
                else:
                    console.print(f"[red]Failed to register agent: {resp.text}[/red]")
                    raise typer.Exit(1)

    console.print(Panel.fit(
        f"[bold cyan]Relay AI Agent Runner[/bold cyan]\n"
        f"Name: [green]{name}[/green] | Provider: [magenta]{provider}[/magenta] | Model: [yellow]{model}[/yellow]\n"
        f"Connecting to Relay WebSocket at: [cyan]{ws_url}[/cyan]\n"
        f"[dim]💡 Mention [bold]@{name}[/bold] in any thread on http://localhost:3000 to interact.[/dim]\n"
        f"[dim](Keep this terminal running in the background)[/dim]",
        title=f"Agent: {name}"
    ))

    async def run_agent_loop():
        # Prefer session-based connection (token + agent_id) over legacy agent_key
        if token and agent_id:
            connect_url = f"{ws_url}?token={token}&agent_id={agent_id}&workspace_id={target_ws}"
        elif key:
            connect_url = f"{ws_url}?agent_key={key}&workspace_id={target_ws}"
        else:
            connect_url = f"{ws_url}?token={token}&workspace_id={target_ws}"

        await _agent_ws_loop(connect_url, api_url, token, None, agent_id, name, provider, model, ai_key)

    asyncio.run(run_agent_loop())


@room_app.command("list")
def room_list(
    workspace_id: Optional[str] = typer.Option(None, help="Workspace ID"),
):
    """List all available projects and rooms in the workspace."""
    cfg = get_config()
    target_ws = workspace_id or cfg.get("default_workspace_id")
    api_url = cfg.get("api_url", "http://localhost:8000")
    token = cfg.get("access_token")

    if not token or not target_ws:
        console.print("[red]Please run 'relay login' first.[/red]")
        raise typer.Exit(1)

    with httpx.Client() as client:
        projects_resp = client.get(
            f"{api_url}/api/v1/workspaces/{target_ws}/projects",
            headers={"Authorization": f"Bearer {token}"},
        )
        if projects_resp.status_code != 200:
            console.print(f"[red]Error fetching projects: {projects_resp.text}[/red]")
            raise typer.Exit(1)

        projects = projects_resp.json()
        table = Table(title="Relay Workspace Projects & Rooms")
        table.add_column("Project", style="cyan")
        table.add_column("Key", style="dim")
        table.add_column("Room Name", style="green")
        table.add_column("Slug", style="yellow")
        table.add_column("Discussion Mode", style="magenta")

        for proj in projects:
            rooms_resp = client.get(
                f"{api_url}/api/v1/projects/{proj['id']}/rooms",
                headers={"Authorization": f"Bearer {token}"},
            )
            if rooms_resp.status_code == 200:
                rooms = rooms_resp.json()
                for r in rooms:
                    disc_mode = f"Auto: {r['auto_discussion']} (max {r['max_reply_depth']})"
                    table.add_row(proj["name"], proj["key"], r["name"], f"#{r['slug']}", disc_mode)

        console.print(table)


@room_app.command("join")
def room_join(
    room_id: str = typer.Argument(..., help="Room ID to watch and interact with"),
):
    """Join and stream live room messages."""
    cfg = get_config()
    ws_url = cfg.get("ws_url", "ws://localhost:8000/ws")
    token = cfg.get("access_token")

    async def join_loop():
        connect_url = f"{ws_url}?token={token}" if token else ws_url
        async with websockets.connect(connect_url) as ws:
            # Subscribe to room
            await ws.send(json.dumps({"event": "subscribe", "data": {"channel": f"room:{room_id}"}}))
            console.print(f"[bold green]Joined room {room_id}. Streaming messages...[/bold green]")
            while True:
                raw = await ws.recv()
                data = json.loads(raw)
                ev = data.get("event")
                msg_data = data.get("data", {})
                if ev == "message.created":
                    author = msg_data.get("author_name", "Unknown")
                    content = msg_data.get("content", "")
                    console.print(f"[[cyan]{author}[/cyan]]: {content}")

    asyncio.run(join_loop())


@app.command()
def send(
    thread_id: str = typer.Option(..., "--thread", "-t", help="Thread ID"),
    message: str = typer.Option(..., "--message", "-m", help="Message text"),
):
    """Send a message to a thread."""
    cfg = get_config()
    api_url = cfg.get("api_url", "http://localhost:8000")
    token = cfg.get("access_token")

    if not token:
        console.print("[red]Please run 'relay login' first.[/red]")
        raise typer.Exit(1)

    with httpx.Client() as client:
        resp = client.post(
            f"{api_url}/api/v1/threads/{thread_id}/messages",
            headers={"Authorization": f"Bearer {token}"},
            json={"content": message, "message_type": "human"},
        )
        if resp.status_code in (200, 201):
            console.print("[green]✓ Message sent successfully![/green]")
        else:
            console.print(f"[red]Failed to send message: {resp.text}[/red]")


@app.command()
def watch(
    workspace_id: Optional[str] = typer.Option(None, help="Workspace ID to watch"),
):
    """Watch all real-time events across the workspace."""
    cfg = get_config()
    target_ws = workspace_id or cfg.get("default_workspace_id")
    ws_url = cfg.get("ws_url", "ws://localhost:8000/ws")
    token = cfg.get("access_token")

    async def watch_loop():
        connect_url = f"{ws_url}?token={token}&workspace_id={target_ws}"
        console.print(f"[bold cyan]Watching Relay live event stream for workspace {target_ws}...[/bold cyan]")
        async with websockets.connect(connect_url) as ws:
            while True:
                raw = await ws.recv()
                event_obj = json.loads(raw)
                ev = event_obj.get("event")
                payload = event_obj.get("data", {})
                console.print(f"[dim]{ev}[/dim] -> {payload}")

    asyncio.run(watch_loop())


@webhook_app.command("serve")
def webhook_serve(
    port: int = typer.Option(9000, help="Local port to receive GitHub webhooks"),
    relay_url: str = typer.Option("http://localhost:8000", help="Relay API URL"),
    workspace_id: Optional[str] = typer.Option(None, help="Target Relay workspace ID"),
):
    """Serve a local webhook receiver that forwards GitHub payloads to Relay."""
    from http.server import HTTPServer, BaseHTTPRequestHandler

    cfg = get_config()
    target_ws = workspace_id or cfg.get("default_workspace_id")

    class WebhookHandler(BaseHTTPRequestHandler):
        def do_POST(self):
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)
            event_type = self.headers.get("X-GitHub-Event", "push")
            console.print(f"[green]Received GitHub {event_type} webhook. Forwarding to Relay...[/green]")

            with httpx.Client() as client:
                res = client.post(
                    f"{relay_url}/api/v1/webhooks/github/{target_ws}",
                    headers={"X-GitHub-Event": event_type, "Content-Type": "application/json"},
                    content=body,
                )
                console.print(f"Relay response: {res.status_code}")

            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'{"status":"forwarded"}')

    server = HTTPServer(("0.0.0.0", port), WebhookHandler)
    console.print(f"[bold green]✓ Webhook server listening on http://0.0.0.0:{port}[/bold green]")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        console.print("\n[yellow]Stopping webhook server...[/yellow]")


if __name__ == "__main__":
    app()
