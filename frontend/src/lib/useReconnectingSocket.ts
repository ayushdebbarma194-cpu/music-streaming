/**
 * Generic auto-reconnecting WebSocket hook with exponential backoff.
 * Used by usePlaybackSocket and useDownloadsSocket. JSON messages are parsed
 * and handed to onMessage; connection status is exposed for UI affordances.
 */

import { useEffect, useRef, useState } from "react";

export type SocketStatus = "connecting" | "open" | "closed";

interface Options<T> {
  /** Full ws:// URL to connect to. */
  url: string;
  /** Called with each parsed JSON message. Keep this stable (useCallback). */
  onMessage: (data: T) => void;
  /** Whether the socket should be active. Defaults to true. */
  enabled?: boolean;
}

const MAX_BACKOFF_MS = 15_000;
const BASE_BACKOFF_MS = 500;

export function useReconnectingSocket<T>({
  url,
  onMessage,
  enabled = true,
}: Options<T>): SocketStatus {
  const [status, setStatus] = useState<SocketStatus>("closed");
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!enabled) {
      setStatus("closed");
      return;
    }

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      setStatus("connecting");
      try {
        ws = new WebSocket(url);
      } catch {
        scheduleReconnect();
        return;
      }

      ws.onopen = () => {
        attempt = 0;
        setStatus("open");
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data as string) as T;
          onMessageRef.current(parsed);
        } catch {
          /* ignore malformed frames */
        }
      };

      ws.onclose = () => {
        setStatus("closed");
        scheduleReconnect();
      };

      ws.onerror = () => {
        // onclose will fire next and handle reconnect.
        ws?.close();
      };
    };

    const scheduleReconnect = () => {
      if (disposed) return;
      const delay = Math.min(
        BASE_BACKOFF_MS * 2 ** attempt,
        MAX_BACKOFF_MS,
      );
      attempt += 1;
      reconnectTimer = setTimeout(connect, delay);
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
      }
    };
  }, [url, enabled]);

  return status;
}
