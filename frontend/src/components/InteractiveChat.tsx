import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import * as React from "react";
import { CustomChatWidget } from "./CustomChatWidget";
import { TelemetryPopoffs, useTelemetry } from "./TelemetryPopoffs";
import "@livekit/components-styles";

import { useLiveKitSession } from "../hooks/useLiveKitSession";
import type { SiteConfigRoot } from "../lib/types";
import { AgentController } from "./AgentController";

type Props = {
  config?: SiteConfigRoot;
};

export function InteractiveChat({ config }: Props) {
  const { events } = useTelemetry();
  const { tokenInfo, shouldConnect, connect, handleDisconnected, handleError } =
    useLiveKitSession({ autoConnect: false });

  React.useEffect(() => {
    const handleHeroSubmit = () => {
      connect();
    };
    window.addEventListener("hero-prompt-submit", handleHeroSubmit);
    return () => window.removeEventListener("hero-prompt-submit", handleHeroSubmit);
  }, [connect]);

  return (
    <LiveKitRoom
      serverUrl={tokenInfo?.ws_url}
      token={tokenInfo?.token}
      connect={shouldConnect && !!tokenInfo?.token && !!tokenInfo?.ws_url}
      audio={false}
      video={false}
      onDisconnected={handleDisconnected}
      onError={handleError}
      style={{ display: "contents" }}
    >
      <AgentController />
      <CustomChatWidget
        onStartInteraction={connect}
        recommendedQuestions={config?.agent?.["recommended-questions"]}
      />
      <RoomAudioRenderer />
      <TelemetryPopoffs events={events} />
    </LiveKitRoom>
  );
}
