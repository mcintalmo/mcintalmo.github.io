import * as React from "react";
import { useLiveKitSession } from "../hooks/useLiveKitSession";
import type { SiteConfigRoot } from "../lib/types";

// biome-ignore lint/security/noSecrets: component import path
const LiveKitChatIsland = React.lazy(() => import("./LiveKitChatIsland"));

type Props = {
  config?: SiteConfigRoot;
};

export function InteractiveChat({ config }: Props) {
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
    <React.Suspense fallback={null}>
      <LiveKitChatIsland
        tokenInfo={tokenInfo}
        shouldConnect={shouldConnect}
        onDisconnected={handleDisconnected}
        onError={handleError}
        onStartInteraction={connect}
        config={config}
      />
    </React.Suspense>
  );
}
