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

  React.useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const fetchToken = async () => {
      const searchParams =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : null;
      const roomName = searchParams?.get("room") || "alex-chat";

      try {
        const data = await fetchLiveKitToken(roomName);
        if (!isMounted) return;
        setTokenInfo({ token: data.token, ws_url: data.ws_url });
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
      audio={false}
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
