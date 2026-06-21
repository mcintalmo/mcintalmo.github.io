import { useRoomContext } from "@livekit/components-react";
import { useEffect } from "react";
import type { AgentEvent, NavigationTarget } from "../lib/events";

type Handlers = {
  onNavigate?: (target: NavigationTarget) => void;
  onHighlight?: (target: NavigationTarget) => void;
  onReset?: () => void;
};

export function useAgentEvents(handlers: Handlers) {
  const room = useRoomContext();

  useEffect(() => {
    const handleData = (payload: Uint8Array) => {
      try {
        const event = JSON.parse(new TextDecoder().decode(payload)) as AgentEvent;

        switch (event.type) {
          case "navigate":
            handlers.onNavigate?.(event.target);
            break;
          case "highlight":
            handlers.onHighlight?.(event.target);
            break;
          case "reset":
            handlers.onReset?.();
            break;
        }
      } catch {
        // malformed event, ignore
      }
    };

    room.on("dataReceived", handleData);
    return () => {
      room.off("dataReceived", handleData);
    };
  }, [room, handlers]);
}
