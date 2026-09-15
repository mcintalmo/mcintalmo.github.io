import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import * as React from "react";
import { fetchLiveKitToken } from "../lib/token";
import type { SiteConfigRoot } from "../lib/types";
import { CustomChatWidget } from "./CustomChatWidget";
import { TelemetryPopoffs, useTelemetry } from "./TelemetryPopoffs";
import "@livekit/components-styles";

declare global {
  interface Window {
    __triggerTelemetry?: (message: string, clientX: number, clientY: number) => void;
  }
}

export const ChatAgent = ({ config }: { config?: SiteConfigRoot }) => {
  const { events, triggerTelemetry } = useTelemetry();
  const [tokenInfo, setTokenInfo] = React.useState<{
    token: string;
    ws_url: string;
  } | null>(null);

  React.useEffect(() => {
    window.__triggerTelemetry = triggerTelemetry;
    return () => {
      delete window.__triggerTelemetry;
    };
  }, [triggerTelemetry]);

  const isMountedRef = React.useRef(true);
  const timeoutIdRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchToken = React.useCallback(async () => {
    const searchParams =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : null;
    const roomName = searchParams?.get("room") || "alex-chat";

    try {
      const data = await fetchLiveKitToken(roomName);
      if (!isMountedRef.current) return null;
      setTokenInfo({ token: data.token, ws_url: data.ws_url });
      return data;
    } catch (err) {
      console.warn("[ChatAgent] Token fetch pending/retrying...", err);
      if (isMountedRef.current) {
        timeoutIdRef.current = setTimeout(fetchToken, 3000);
      }
      return null;
    }
  }, []);

  const handleDisconnected = React.useCallback(() => {
    fetchToken();
  }, [fetchToken]);

  const handleError = React.useCallback(
    (error: Error) => {
      console.error("[ChatAgent] LiveKit room error:", error);
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

  React.useEffect(() => {
    isMountedRef.current = true;
    fetchToken();

    return () => {
      isMountedRef.current = false;
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, [fetchToken]);

  const hasToken = Boolean(tokenInfo);
  // Proactively refresh token every 12 minutes while active
  React.useEffect(() => {
    if (!hasToken) return;

    const intervalId = setInterval(
      () => {
        fetchToken();
      },
      12 * 60 * 1000,
    );

    return () => clearInterval(intervalId);
  }, [hasToken, fetchToken]);

  if (!tokenInfo) {
    return (
      <CustomChatWidget
        recommendedQuestions={config?.agent?.["recommended-questions"]}
      />
    );
  }

  return (
    <LiveKitRoom
      serverUrl={tokenInfo.ws_url}
      token={tokenInfo.token}
      connect={true}
      audio={false}
      video={false}
      onDisconnected={handleDisconnected}
      onError={handleError}
      style={{ display: "contents" }}
    >
      <CustomChatWidget
        recommendedQuestions={config?.agent?.["recommended-questions"]}
      />
      <RoomAudioRenderer />
      <TelemetryPopoffs events={events} />
    </LiveKitRoom>
  );
};
