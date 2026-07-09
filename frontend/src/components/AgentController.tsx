import { useRoomContext } from "@livekit/components-react";
import type { RpcInvocationData } from "livekit-client";
import { useEffect } from "react";
import { useAgentEvents } from "../hooks/useAgentEvents";
import { usePortfolioNavigation } from "../hooks/usePortfolioNavigation";

// Drop this inside your LiveKitRoom provider, it renders nothing
export function AgentController() {
  const room = useRoomContext();
  const { scrollTo, highlight, highlightText, reset } = usePortfolioNavigation();

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

    room.registerRpcMethod("highlight_text", async (data: RpcInvocationData) => {
      try {
        const payload = JSON.parse(data.payload);
        const text = payload.text;
        if (text) {
          window.dispatchEvent(
            new CustomEvent("agent-action", {
              detail: { type: "highlight-text", text },
            }),
          );
          return JSON.stringify({ success: true });
        }
      } catch (e) {
        console.error("Failed to execute highlight_text RPC:", e);
      }
      return JSON.stringify({ success: false });
    });

    room.registerRpcMethod(
      "expand_experience_card",
      async (data: RpcInvocationData) => {
        try {
          const payload = JSON.parse(data.payload);
          const company = payload.company;
          if (company) {
            window.dispatchEvent(
              new CustomEvent("agent-action", {
                detail: { type: "expand-experience", company },
              }),
            );
            return JSON.stringify({ success: true });
          }
        } catch (e) {
          console.error("Failed to execute expand_experience_card RPC:", e);
        }
        return JSON.stringify({ success: false });
      },
    );

    return () => {
      room.unregisterRpcMethod("navigate_to");
      room.unregisterRpcMethod("highlight_text");
      room.unregisterRpcMethod("expand_experience_card");
    };
  }, [room, scrollTo]);

  useEffect(() => {
    const handleAgentAction = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.type === "highlight-text") {
        const text = customEvent.detail.text;
        if (text) {
          highlightText(text);
        }
      } else if (customEvent.detail?.type === "reset") {
        reset();
      }
    };

    window.addEventListener("agent-action", handleAgentAction);
    return () => {
      window.removeEventListener("agent-action", handleAgentAction);
    };
  }, [highlightText, reset]);

  return null;
}
