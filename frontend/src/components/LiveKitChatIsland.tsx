import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import "@livekit/components-styles";
import type { TokenInfo } from "../lib/token";
import type { SiteConfigRoot } from "../lib/types";
import { AgentController } from "./AgentController";
import { CustomChatWidget } from "./CustomChatWidget";
import { TelemetryPopoffs, useTelemetry } from "./TelemetryPopoffs";

interface LiveKitChatIslandProps {
  tokenInfo: TokenInfo | null;
  shouldConnect: boolean;
  onDisconnected: () => void;
  onError: (error: Error) => void;
  onStartInteraction: () => void;
  config?: SiteConfigRoot;
}

export default function LiveKitChatIsland({
  tokenInfo,
  shouldConnect,
  onDisconnected,
  onError,
  onStartInteraction,
  config,
}: LiveKitChatIslandProps) {
  const { events } = useTelemetry();

  return (
    <LiveKitRoom
      serverUrl={tokenInfo?.ws_url}
      token={tokenInfo?.token}
      connect={shouldConnect && !!tokenInfo?.token && !!tokenInfo?.ws_url}
      audio={false}
      video={false}
      onDisconnected={onDisconnected}
      onError={onError}
      style={{ display: "contents" }}
    >
      <AgentController />
      <CustomChatWidget
        onStartInteraction={onStartInteraction}
        recommendedQuestions={config?.agent?.["recommended-questions"]}
      />
      <RoomAudioRenderer />
      <TelemetryPopoffs events={events} />
    </LiveKitRoom>
  );
}
