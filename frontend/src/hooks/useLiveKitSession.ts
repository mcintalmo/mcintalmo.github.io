import * as React from "react";
import { fetchLiveKitToken, generateSecureId } from "../lib/token";
import { applyWebRtcDevPatch } from "../lib/webrtcPatch";

export interface UseLiveKitSessionOptions {
  roomName?: string;
  autoConnect?: boolean;
}

export interface LiveKitTokenInfo {
  token: string;
  ws_url: string;
  local_ip?: string;
}

export interface UseLiveKitSessionReturn {
  tokenInfo: LiveKitTokenInfo | null;
  shouldConnect: boolean;
  connect: () => void;
  fetchToken: () => Promise<LiveKitTokenInfo | null>;
  handleDisconnected: () => void;
  handleError: (error: Error) => void;
}

export function useLiveKitSession(
  options: UseLiveKitSessionOptions = {},
): UseLiveKitSessionReturn {
  const { roomName: explicitRoomName, autoConnect = false } = options;

  const [tokenInfo, setTokenInfo] = React.useState<LiveKitTokenInfo | null>(null);
  const [shouldConnect, setShouldConnect] = React.useState(autoConnect);

  const isMountedRef = React.useRef(true);
  const roomNameRef = React.useRef<string | null>(explicitRoomName || null);
  const retryTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Apply dev WebRTC patch on mount
  React.useEffect(() => {
    applyWebRtcDevPatch();
  }, []);

  // Update target host when tokenInfo changes
  React.useEffect(() => {
    if (tokenInfo?.ws_url) {
      try {
        const url = new URL(tokenInfo.ws_url);
        const isFirefox =
          typeof navigator !== "undefined" &&
          navigator.userAgent.toLowerCase().includes("firefox");
        if (isFirefox && tokenInfo.local_ip) {
          (window as unknown as Record<string, unknown>).webrtcTargetHost =
            tokenInfo.local_ip;
        } else {
          (window as unknown as Record<string, unknown>).webrtcTargetHost =
            url.hostname;
        }
      } catch (e) {
        console.error("[useLiveKitSession] Failed to parse ws_url:", e);
      }
    }
  }, [tokenInfo]);

  // Firefox WebRTC loopback redirect helper for local development
  React.useEffect(() => {
    if (tokenInfo?.local_ip && tokenInfo.local_ip !== "127.0.0.1") {
      const isFirefox =
        typeof navigator !== "undefined" &&
        navigator.userAgent.toLowerCase().includes("firefox");
      const isLoopback =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname === "[::1]";
      if (isFirefox && isLoopback) {
        const newUrl = new URL(window.location.href);
        newUrl.hostname = tokenInfo.local_ip;
        console.log(
          `[Firefox Dev Helper] Redirecting to LAN IP for WebRTC loopback: ${newUrl.toString()}`,
        );
        window.location.replace(newUrl.toString());
      }
    }
  }, [tokenInfo]);

  const fetchToken = React.useCallback(async () => {
    if (!roomNameRef.current) {
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        roomNameRef.current = urlParams.get("room") || generateSecureId("portfolio");
      } else {
        roomNameRef.current = generateSecureId("portfolio");
      }
    }
    const room = roomNameRef.current;

    try {
      const data = await fetchLiveKitToken(room);
      if (!isMountedRef.current) return null;
      const info: LiveKitTokenInfo = {
        token: data.token,
        ws_url: data.ws_url,
        local_ip: data.local_ip,
      };
      setTokenInfo(info);
      return info;
    } catch (err) {
      console.warn("[useLiveKitSession] Token fetch failed, retrying in 3s...", err);
      if (isMountedRef.current) {
        retryTimeoutRef.current = setTimeout(fetchToken, 3000);
      }
      return null;
    }
  }, []);

  const connect = React.useCallback(() => {
    setShouldConnect(true);
    if (!tokenInfo) {
      fetchToken();
    }
  }, [tokenInfo, fetchToken]);

  const handleDisconnected = React.useCallback(() => {
    // Refresh token so subsequent reconnect attempts use a fresh JWT
    fetchToken();
  }, [fetchToken]);

  const handleError = React.useCallback(
    (error: Error) => {
      console.error("[useLiveKitSession] Connection error:", error);
      const msg = error.message?.toLowerCase() || "";
      if (
        msg.includes("token") ||
        msg.includes("unauthorized") ||
        msg.includes("expired")
      ) {
        fetchToken();
      }
    },
    [fetchToken],
  );

  // Auto-connect if requested
  React.useEffect(() => {
    isMountedRef.current = true;
    if (autoConnect) {
      fetchToken();
    }
    return () => {
      isMountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [autoConnect, fetchToken]);

  // Proactively refresh token every 12 minutes while active
  const hasToken = Boolean(tokenInfo);
  React.useEffect(() => {
    if (!shouldConnect || !hasToken) return;

    const intervalId = setInterval(
      () => {
        fetchToken();
      },
      12 * 60 * 1000,
    );

    return () => clearInterval(intervalId);
  }, [shouldConnect, hasToken, fetchToken]);

  return {
    tokenInfo,
    shouldConnect,
    connect,
    fetchToken,
    handleDisconnected,
    handleError,
  };
}
