import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import * as React from "react";
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

  React.useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const fetchToken = async () => {
      const hostname =
        typeof window !== "undefined" ? window.location.hostname : "localhost";
      const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";
      const localApiUrl = `http://${hostname}:8000`;
      const prodApiUrl = "https://api.alexandermcintosh.com";

      // If running on localhost, prioritize the local auth server first; otherwise use configured env or prod
      const primaryUrl = isLocalHost
        ? localApiUrl
        : import.meta.env.PUBLIC_API_URL || prodApiUrl;
      const fallbackUrl = isLocalHost ? prodApiUrl : undefined;

      const searchParams =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : null;
      const roomName = searchParams?.get("room") || "alex-chat";

      const tryFetch = async (url: string) => {
        const res = await fetch(
          `${url}/token?room_name=${encodeURIComponent(
            roomName,
          )}&identity=user-${Math.floor(Math.random() * 10000)}`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      };

      try {
        let data: { token: string; ws_url?: string };
        try {
          data = await tryFetch(primaryUrl);
        } catch (localErr) {
          if (fallbackUrl && primaryUrl !== fallbackUrl) {
            console.info(
              "[ChatAgent] Primary auth server not reachable, falling back to",
              fallbackUrl,
            );
            data = await tryFetch(fallbackUrl);
          } else {
            throw localErr;
          }
        }

        if (!isMounted) return;
        let wsUrl = data.ws_url || `ws://${hostname}:7880`;
        if (wsUrl.includes("localhost") || wsUrl.includes("127.0.0.1")) {
          if (hostname !== "localhost" && wsUrl.includes("localhost")) {
            wsUrl = wsUrl.replace("localhost", hostname);
          } else if (hostname !== "127.0.0.1" && wsUrl.includes("127.0.0.1")) {
            wsUrl = wsUrl.replace("127.0.0.1", hostname);
          }
        }
        setTokenInfo({ token: data.token, ws_url: wsUrl });
      } catch (err) {
        console.warn("[ChatAgent] Token fetch pending/retrying...", err);
        if (isMounted) {
          timeoutId = setTimeout(fetchToken, 3000);
        }
      }
    };

    fetchToken();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

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
      audio={true}
      video={false}
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
