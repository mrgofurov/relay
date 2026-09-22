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


@agent_app.command("start")
def agent_start(
    name: str = typer.Option("gemini-cli", help="Agent identifier"),
    provider: str = typer.Option("gemini", help="Provider (gemini, claude, openai, cursor, custom)"),
    model: str = typer.Option("default", help="Model name"),
    workspace_id: Optional[str] = typer.Option(None, help="Target workspace ID"),
    agent_key: Optional[str] = typer.Option(None, help="Agent API key"),
):
    """Start and run a local AI agent connected to Relay."""
    cfg = get_config()
    target_ws = workspace_id or cfg.get("default_workspace_id")
    api_url = cfg.get("api_url", "http://localhost:8000")
    ws_url = cfg.get("ws_url", "ws://localhost:8000/ws")
    token = cfg.get("access_token")

    if not target_ws:
        console.print("[red]No workspace specified. Run 'relay login' or specify --workspace-id[/red]")
        raise typer.Exit(1)

    # Check saved agent keys in config
    saved_keys = cfg.get("agent_keys", {})
    key = agent_key or saved_keys.get(name)
    agent_id = None

    if not token and not key:
        console.print("[red]Must provide --agent-key or be logged in with 'relay login'[/red]")
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
                    console.print(f"[green]✓ Agent [bold]{name}[/bold] registered with API key.[/green]")
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
        if key:
            connect_url = f"{ws_url}?agent_key={key}&workspace_id={target_ws}"
        elif agent_id:
            connect_url = f"{ws_url}?token={token}&agent_id={agent_id}&workspace_id={target_ws}"
        else:
            connect_url = f"{ws_url}?token={token}&workspace_id={target_ws}"

        while True:
            try:
                console.print(f"[dim]Establishing persistent socket connection...[/dim]")
                async with websockets.connect(connect_url) as ws:
                    console.print(f"[bold green]● Agent {name} is ONLINE and listening for mentions & messages![/bold green]")
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

                            # If GEMINI_API_KEY is available and provider is gemini, call Gemini
                            gemini_key = os.environ.get("GEMINI_API_KEY")
                            reply_text = ""
                            if gemini_key and provider == "gemini":
                                try:
                                    console.print("[dim]Querying Google Gemini API...[/dim]")
                                    gemini_model = "gemini-1.5-flash" if model in ("default", "gemini-3.8-flash") else model
                                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{gemini_model}:generateContent?key={gemini_key}"
                                    with httpx.Client(timeout=30.0) as ai_client:
                                        ai_res = ai_client.post(
                                            url,
                                            json={"contents": [{"parts": [{"text": content}]}]},
                                        )
                                        if ai_res.status_code == 200:
                                            reply_text = ai_res.json()["candidates"][0]["content"]["parts"][0]["text"]
                                except Exception as err:
                                    console.print(f"[dim]Gemini API error ({err}). Using fallback.[/dim]")

                            if not reply_text:
                                reply_text = f"Hello @{author}! I received your prompt: \"{content}\". Running as autonomous agent @{name} ({model}) via Relay."

                            console.print(f"[dim]Dispatching agent reply into thread {thread_id}...[/dim]")
                            with httpx.Client() as client:
                                auth_header = f"Bearer {key}" if key else f"Bearer {token}"
                                client.post(
                                    f"{api_url}/api/v1/threads/{thread_id}/messages",
                                    headers={"Authorization": auth_header},
                                    json={"content": reply_text, "message_type": "agent", "provider": provider, "model": model},
                                )
                            console.print(f"[bold green]✓ Reply successfully posted to Relay thread![/bold green]")
                        elif ev == "message.created":
                            console.print(f"[cyan]Message in {data.get('room_id')}:[/cyan] [bold]{data.get('author_name')}[/bold]: {data.get('content')}")
            except (websockets.ConnectionClosed, Exception) as err:
                console.print(f"[red]Socket disconnected ({err}). Reconnecting in 3 seconds...[/red]")
                await asyncio.sleep(3)

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
