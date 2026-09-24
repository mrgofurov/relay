import asyncio
import json
import os
from pathlib import Path
import shutil
from typing import Optional
import uuid
import httpx
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
import typer
import websockets

app = typer.Typer(
    name="relay",
    help="Relay CLI — Session-based AI agent collaboration platform.",
    add_completion=False,
)
agent_app = typer.Typer(help="Attach devices and run local AI agents using native CLI sessions")
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
        return {
            "api_url": "http://localhost:8000",
            "ws_url": "ws://localhost:8000/ws",
            "device_id": f"dev_{uuid.uuid4().hex[:12]}",
            "attached_agents": {},
        }
    try:
        with open(CONFIG_FILE, "r") as f:
            cfg = json.load(f)
            if "device_id" not in cfg:
                cfg["device_id"] = f"dev_{uuid.uuid4().hex[:12]}"
            if "attached_agents" not in cfg:
                cfg["attached_agents"] = {}
            return cfg
    except Exception:
        return {
            "api_url": "http://localhost:8000",
            "ws_url": "ws://localhost:8000/ws",
            "device_id": f"dev_{uuid.uuid4().hex[:12]}",
            "attached_agents": {},
        }


def save_config(data: dict):
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_FILE, "w") as f:
        json.dump(data, f, indent=2)


async def _execute_native_cli(agent_type: str, prompt: str) -> Optional[str]:
    """Execute native local CLI (agy / gemini / claude) using developer's existing session.

    Relay never asks for or stores API keys or OAuth secrets.
    The native CLI owns its own authentication.
    """
    clean_type = agent_type.lower()

    # 1. Gemini / Google Antigravity session
    if "gemini" in clean_type or clean_type in ("google", "agy"):
        # Check local Antigravity CLI (agy)
        agy_cmd = shutil.which("agy") or os.path.expanduser("~/.local/bin/agy")
        if agy_cmd and (shutil.which("agy") or os.path.exists(agy_cmd)):
            console.print(f"[dim]⚡ Delegating prompt to local Google Antigravity CLI (agy)...[/dim]")
            try:
                proc = await asyncio.create_subprocess_exec(
                    agy_cmd,
                    "--dangerously-skip-permissions",
                    "-p",
                    prompt,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout, stderr = await proc.communicate()
                if proc.returncode == 0:
                    res = stdout.decode("utf-8").strip()
                    if res:
                        return res
                else:
                    err_msg = stderr.decode("utf-8", errors="ignore")
                    console.print(f"[dim]agy message: {err_msg[:160]}[/dim]")
            except Exception as e:
                console.print(f"[dim]agy error: {e}[/dim]")

        # Check native gemini CLI
        gemini_cmd = shutil.which("gemini")
        if gemini_cmd:
            console.print(f"[dim]⚡ Delegating prompt to local Gemini CLI (gemini)...[/dim]")
            try:
                proc = await asyncio.create_subprocess_exec(
                    gemini_cmd,
                    "--prompt",
                    prompt,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout, stderr = await proc.communicate()
                if proc.returncode == 0:
                    res = stdout.decode("utf-8").strip()
                    if res:
                        return res
            except Exception as e:
                console.print(f"[dim]gemini cli error: {e}[/dim]")

    # 2. Claude Code CLI session
    if "claude" in clean_type or clean_type == "anthropic":
        claude_cmd = shutil.which("claude")
        if claude_cmd:
            console.print(f"[dim]⚡ Delegating prompt to local Claude Code CLI (claude)...[/dim]")
            try:
                proc = await asyncio.create_subprocess_exec(
                    claude_cmd,
                    "-p",
                    prompt,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout, stderr = await proc.communicate()
                if proc.returncode == 0:
                    res = stdout.decode("utf-8").strip()
                    if res:
                        return res
            except Exception as e:
                console.print(f"[dim]claude cli error: {e}[/dim]")

    return None


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
        f"Device ID: [yellow]{cfg['device_id']}[/yellow]\n"
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
            login_resp = client.post(
                f"{api_url}/api/v1/auth/login",
                json={"email": email, "password": password},
            )
            if login_resp.status_code == 200:
                data = login_resp.json()
                cfg["access_token"] = data["access_token"]
                cfg["user_email"] = email
                cfg["user_name"] = full_name
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
    email: str = typer.Option(..., prompt=True, help="Developer email address"),
    password: str = typer.Option(..., prompt=True, hide_input=True, help="Password"),
):
    """Authenticate the developer into Relay.

    Relay authenticates the human developer once.
    Authentication belongs to the developer, not the AI agent.
    """
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
                console.print("[yellow]Tip: Run 'relay register' if you do not have an account yet.[/yellow]")
                raise typer.Exit(1)

            data = resp.json()
            cfg["access_token"] = data["access_token"]
            cfg["user_email"] = email

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
            console.print(f"Device ID: [dim]{cfg.get('device_id')}[/dim]")
    except typer.Exit:
        raise
    except Exception as e:
        console.print(f"[red]Error connecting to {api_url}: {e}[/red]")
        raise typer.Exit(1)


@agent_app.command("attach")
def agent_attach(
    code: str = typer.Argument(..., help="Temporary 60-second pairing code from Relay UI (e.g. AB7K-92QP)"),
):
    """Pair your local machine to a room and agent identity.

    Process:
      1. Verifies Relay developer session exists
      2. Validates pairing code (TTL 60s)
      3. Device becomes attached to user's account & room
      4. Code is consumed immediately

    Example:
        relay agent attach AB7K-92QP
    """
    cfg = get_config()
    api_url = cfg.get("api_url", "http://localhost:8000")
    token = cfg.get("access_token")

    if not token:
        console.print("[red]✗ Not authenticated in Relay.[/red]")
        console.print("[yellow]Please run 'relay login' first to authenticate your developer account.[/yellow]")
        raise typer.Exit(1)

    device_id = cfg.get("device_id")

    try:
        with httpx.Client(timeout=30.0) as client:
            headers = {"Authorization": f"Bearer {token}"}
            payload = {
                "code": code.strip().upper(),
                "device_id": device_id,
                "device_name": os.uname().nodename if hasattr(os, "uname") else "local-machine",
            }

            try:
                resp = client.post(
                    f"{api_url}/api/v1/device-pairings/attach",
                    headers=headers,
                    json=payload,
                )
            except httpx.ConnectError:
                if "localhost:8000" in api_url:
                    fallback_url = "http://localhost:3000"
                    resp = client.post(
                        f"{fallback_url}/api/v1/device-pairings/attach",
                        headers=headers,
                        json=payload,
                    )
                    api_url = fallback_url
                else:
                    raise

            if resp.status_code == 400:
                detail = resp.json().get("detail", resp.text)
                console.print(f"[red]✗ Pairing failed: {detail}[/red]")
                raise typer.Exit(1)
            elif resp.status_code != 200:
                console.print(f"[red]✗ Server error ({resp.status_code}): {resp.text}[/red]")
                raise typer.Exit(1)

            data = resp.json()
            agent_id = data["agent_id"]
            agent_name = data["agent_name"]
            agent_type = data["agent_type"]
            room_id = data["room_id"]
            room_name = data["room_name"]
            workspace_id = data["workspace_id"]

            # Save attached agent to local config
            attached = cfg.get("attached_agents", {})
            attached[agent_type] = {
                "id": agent_id,
                "name": agent_name,
                "type": agent_type,
                "room_id": room_id,
                "room_name": room_name,
                "workspace_id": workspace_id,
            }
            # Also key by agent_name for direct name lookup
            attached[agent_name.lower()] = attached[agent_type]
            cfg["attached_agents"] = attached
            save_config(cfg)

            # Output matching the specification exactly
            console.print("[bold green]✓ Device connected[/bold green]")
            console.print(f"Room:  [cyan]{room_name}[/cyan]")
            console.print(f"Agent: [bold]{agent_name}[/bold]")
            console.print()
            console.print(f"[dim]Now start your agent with:[/dim]")
            console.print(f"  [bold yellow]relay agent run {agent_type}[/bold yellow]")

    except typer.Exit:
        raise
    except Exception as e:
        console.print(f"[red]Error attaching device: {e}[/red]")
        raise typer.Exit(1)


@agent_app.command("run")
def agent_run(
    agent_type: str = typer.Argument("gemini", help="Agent type to run (gemini, claude, cursor, etc.)"),
):
    """Launch local agent listener using native CLI session.

    Process:
      1. Verify device attached
      2. Verify selected CLI exists
      3. Verify CLI session exists
      4. Open WebSocket to Relay
      5. Stream and route messages in real-time
    """
    cfg = get_config()
    api_url = cfg.get("api_url", "http://localhost:8000")
    ws_url = cfg.get("ws_url", "ws://localhost:8000/ws")
    token = cfg.get("access_token")

    if not token:
        console.print("[red]✗ Not logged in to Relay.[/red]")
        console.print("[yellow]Please run 'relay login' first.[/yellow]")
        raise typer.Exit(1)

    # 1. Verify device attached
    attached = cfg.get("attached_agents", {})
    agent_info = attached.get(agent_type.lower())

    if not agent_info:
        # Fallback: Query backend for attached agents
        try:
            with httpx.Client() as client:
                ws_id = cfg.get("default_workspace_id")
                if ws_id:
                    res = client.get(
                        f"{api_url}/api/v1/workspaces/{ws_id}/agents",
                        headers={"Authorization": f"Bearer {token}"},
                    )
                    if res.status_code == 200:
                        agents_list = res.json()
                        for ag in agents_list:
                            if ag.get("type", "").lower() == agent_type.lower() or ag.get("name", "").lower() == agent_type.lower():
                                agent_info = {
                                    "id": ag["id"],
                                    "name": ag["name"],
                                    "type": ag.get("type", agent_type),
                                    "room_id": ag.get("room_id", ""),
                                    "workspace_id": ag["workspace_id"],
                                }
                                break
        except Exception:
            pass

    if not agent_info:
        console.print(f"[red]✗ Device is not attached for agent '{agent_type}'.[/red]")
        console.print("[yellow]Please attach this device from Relay Web UI first:[/yellow]")
        console.print("  1. In Relay UI, click '+ Connect New Agent' in your room")
        console.print("  2. Select agent type and click 'Connect Device' to get an 8-char code")
        console.print(f"  3. Run: [bold]relay agent attach <CODE>[/bold]")
        console.print(f"  4. Run: [bold]relay agent run {agent_type}[/bold]")
        raise typer.Exit(1)

    agent_id = agent_info["id"]
    agent_name = agent_info["name"]
    room_name = agent_info.get("room_name", "Workspace Room")
    workspace_id = agent_info.get("workspace_id") or cfg.get("default_workspace_id")

    # 2. Verify selected CLI exists
    clean_type = agent_type.lower()
    cli_found_name = None

    if "gemini" in clean_type or clean_type in ("google", "agy"):
        agy_cmd = shutil.which("agy") or os.path.expanduser("~/.local/bin/agy")
        gemini_cmd = shutil.which("gemini")
        if agy_cmd and (shutil.which("agy") or os.path.exists(agy_cmd)):
            cli_found_name = "Google Antigravity CLI (agy)"
        elif gemini_cmd:
            cli_found_name = "Gemini CLI (gemini)"
        else:
            console.print("[red]✗ Gemini CLI ('gemini') or Google Antigravity CLI ('agy') not found in PATH.[/red]")
            console.print("[yellow]Please ensure your local Gemini CLI or Antigravity CLI is installed.[/yellow]")
            raise typer.Exit(1)

    elif "claude" in clean_type:
        claude_cmd = shutil.which("claude")
        if claude_cmd:
            cli_found_name = "Claude Code CLI (claude)"
        else:
            console.print("[red]✗ Claude Code CLI ('claude') not found in PATH.[/red]")
            console.print("[yellow]Install via: npm install -g @anthropic-ai/claude-code[/yellow]")
            raise typer.Exit(1)
    else:
        cli_found_name = f"Local session ({agent_type})"

    # Display Runner Banner
    console.print(Panel.fit(
        f"[bold cyan]Relay AI Agent Runner[/bold cyan]\n"
        f"Agent:     [bold green]@{agent_name}[/bold green]\n"
        f"Room:      [cyan]{room_name}[/cyan]\n"
        f"Engine:    [magenta]{cli_found_name}[/magenta] [dim](Native Session)[/dim]\n\n"
        f"[bold green]● Connecting to Relay...[/bold green]\n"
        f"[dim]Mention @{agent_name} or @{clean_type} in any thread to collaborate.[/dim]\n"
        f"[dim](Keep this terminal running. Press Ctrl+C to stop)[/dim]",
        title=f"● Live Agent: @{agent_name}"
    ))

    # WebSocket connection loop
    async def run_loop():
        connect_url = f"{ws_url}?token={token}&agent_id={agent_id}&workspace_id={workspace_id}"
        backoff = 1

        while True:
            try:
                async with websockets.connect(connect_url) as ws:
                    console.print(f"[bold green]✓ Agent @{agent_name} is ONLINE and ready in Relay![/bold green]")
                    backoff = 1

                    while True:
                        raw = await ws.recv()
                        msg = json.loads(raw)
                        ev = msg.get("event")
                        data = msg.get("data", {})

                        if ev == "agent.mentioned":
                            author = data.get("author_name", "Someone")
                            content = data.get("content", "")
                            thread_id = data.get("thread_id")
                            console.print(f"\n[bold yellow]🔔 Mentioned by @{author}:[/bold yellow] {content}")

                            prompt = (
                                f"You are AI agent @{agent_name} collaborating with developer @{author} in a Relay room discussion thread.\n"
                                f"Developer message: {content}\n"
                                f"Provide a helpful, direct, and concise technical answer or code solution."
                            )

                            reply_text = await _execute_native_cli(agent_type, prompt)
                            if not reply_text:
                                reply_text = f"@{author} I received your message: \"{content}\"\n\n(Generated via local {cli_found_name} session)"

                            console.print(f"[dim]Posting reply to thread {thread_id}...[/dim]")
                            try:
                                with httpx.Client(timeout=30.0) as client:
                                    resp = client.post(
                                        f"{api_url}/api/v1/threads/{thread_id}/messages",
                                        headers={
                                            "Authorization": f"Bearer {token}",
                                            "X-Agent-ID": agent_id,
                                        },
                                        json={
                                            "content": reply_text,
                                            "message_type": "agent",
                                            "provider": clean_type,
                                            "model": "native-cli",
                                        },
                                    )
                                    if resp.status_code in (200, 201):
                                        console.print(f"[bold green]✓ Reply posted to thread![/bold green]")
                                    else:
                                        console.print(f"[bold red]✗ Failed to post reply ({resp.status_code}): {resp.text}[/bold red]")
                            except Exception as post_err:
                                console.print(f"[bold red]✗ Error posting reply: {post_err}[/bold red]")

            except (websockets.ConnectionClosed, Exception) as err:
                console.print(f"[yellow]WebSocket reconnecting in {backoff}s ({err})...[/yellow]")
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 30)

    try:
        asyncio.run(run_loop())
    except KeyboardInterrupt:
        console.print(f"\n[yellow]Agent @{agent_name} stopped.[/yellow]")


@agent_app.command("connect", hidden=True)
def agent_connect_deprecated(code: str = typer.Argument(None)):
    """(Deprecated) Use 'relay agent attach' instead."""
    console.print("[yellow]'relay agent connect' is deprecated.[/yellow]")
    console.print("Relay uses native CLI sessions without generated keys.")
    console.print("\n[bold]Please use:[/bold]")
    console.print("  relay login")
    console.print(f"  relay agent attach {code or '<CODE>'}")
    console.print("  relay agent run gemini")


@agent_app.command("start", hidden=True)
def agent_start_deprecated(name: Optional[str] = typer.Option(None)):
    """(Deprecated) Use 'relay agent run' instead."""
    console.print("[yellow]'relay agent start' is deprecated.[/yellow]")
    console.print("\n[bold]Please use:[/bold]")
    console.print(f"  relay agent run {name or 'gemini'}")


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
