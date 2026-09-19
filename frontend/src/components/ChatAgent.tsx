import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import * as React from "react";
import { useLiveKitSession } from "../hooks/useLiveKitSession";
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

  React.useEffect(() => {
    window.__triggerTelemetry = triggerTelemetry;
    return () => {
      delete window.__triggerTelemetry;
    };
  }, [triggerTelemetry]);

  const { tokenInfo, handleDisconnected, handleError } = useLiveKitSession({
    autoConnect: true,
  });

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
