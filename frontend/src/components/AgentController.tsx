import { useRoomContext } from "@livekit/components-react";
import type { RpcInvocationData } from "livekit-client";
import { useEffect } from "react";
import { useAgentEvents } from "../hooks/useAgentEvents";
import { usePortfolioNavigation } from "../hooks/usePortfolioNavigation";

// Drop this inside your LiveKitRoom provider, it renders nothing
export function AgentController() {
  const room = useRoomContext();
  const { scrollTo, highlight, reset } = usePortfolioNavigation();

  useAgentEvents({
    onNavigate: scrollTo,
    onHighlight: highlight,
    onReset: reset,
  });

  useEffect(() => {
    room.registerRpcMethod("navigate_to", async (data: RpcInvocationData) => {
      try {
        const payload = JSON.parse(data.payload);
        const target = payload.target;
        if (target) {
          scrollTo(target);
          return JSON.stringify({ success: true });
        }
      } catch (e) {
        console.error("Failed to execute navigate_to RPC:", e);
      }
      return JSON.stringify({ success: false });
    });

    return () => {
      room.unregisterRpcMethod("navigate_to");
    };
  }, [room, scrollTo]);

  return null;
}
