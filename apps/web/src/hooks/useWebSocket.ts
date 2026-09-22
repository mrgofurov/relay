"use client";

import { useEffect, useRef } from "react";
import { api } from "../lib/api";
import { useRelayStore } from "../stores/useRelayStore";

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws";

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    activeWorkspace,
    activeRoom,
    activeThread,
    addMessage,
    updateMessage,
    setThreads,
    threads,
    updateAgentStatus,
    setConnected,
    setTyping,
    clearTyping,
  } = useRelayStore();

  useEffect(() => {
    const token = api.getToken();
    if (!token) return;

    let isMounted = true;

    function connect() {
      if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
        return;
      }

      const params = new URLSearchParams();
      if (token) params.set("token", token);
      if (activeWorkspace?.id) params.set("workspace_id", activeWorkspace.id);

      const url = `${WS_BASE}?${params.toString()}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted) return;
        setConnected(true);

        // Auto subscribe to active room and active thread
        if (activeRoom?.id) {
          ws.send(JSON.stringify({ event: "subscribe", data: { channel: `room:${activeRoom.id}` } }));
        }
        if (activeThread?.id) {
          ws.send(JSON.stringify({ event: "subscribe", data: { channel: `thread:${activeThread.id}` } }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const { event: ev, data } = payload;

          switch (ev) {
            case "message.created":
              if (activeThread && data.thread_id === activeThread.id) {
                addMessage(data);
              }
              // Also update thread message count in list
              setThreads(
                threads.map((th) =>
                  th.id === data.thread_id
                    ? { ...th, message_count: th.message_count + 1, updated_at: new Date().toISOString() }
                    : th
                )
              );
              break;

            case "message.updated":
              updateMessage(data.id, data.content, data.edited_at);
              break;

            case "thread.created":
              if (activeRoom && data.room_id === activeRoom.id) {
                setThreads([data, ...threads]);
              }
              break;

            case "thread.updated":
              setThreads(
                threads.map((th) => (th.id === data.id ? { ...th, ...data } : th))
              );
              break;

            case "agent.online":
              updateAgentStatus(data.agent_id, "online");
              break;

            case "agent.offline":
              updateAgentStatus(data.agent_id, "offline");
              break;

            case "typing.start":
              setTyping(data.author_id, data.author_name);
              break;

            case "typing.stop":
              clearTyping(data.author_id);
              break;

            case "git.push":
              // Show notification
              if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
                new Notification(`Git Push: ${data.title}`, { body: data.content });
              }
              break;
          }
        } catch (e) {
          console.error("Error parsing WS message:", e);
        }
      };

      ws.onclose = () => {
        if (!isMounted) return;
        setConnected(false);
        wsRef.current = null;
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.warn("WebSocket error:", err);
        ws.close();
      };
    }

    connect();

    // Heartbeat ping interval
    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ event: "ping", data: { timestamp: Date.now() } }));
      }
    }, 25000);

    return () => {
      isMounted = false;
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [activeWorkspace?.id, activeRoom?.id, activeThread?.id]);

  const sendTyping = (isTyping: boolean) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const ev = isTyping ? "typing.start" : "typing.stop";
      wsRef.current.send(
        JSON.stringify({
          event: ev,
          data: {
            room_id: activeRoom?.id,
            thread_id: activeThread?.id,
          },
        })
      );
    }
  };

  return { sendTyping };
}
