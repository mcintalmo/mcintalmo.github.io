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
    // Fetch token from FastAPI backend
    const apiUrl = import.meta.env.PUBLIC_API_URL || "http://localhost:8000";
    fetch(
      `${apiUrl}/token?room_name=alex-chat&identity=user-${Math.floor(
        Math.random() * 10000,
      )}`,
    )
      .then((res) => res.json())
      .then((data) => setTokenInfo({ token: data.token, ws_url: data.ws_url }))
      .catch(console.error);
  }, []);

  if (!tokenInfo) {
    return null; // or a loading spinner
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
