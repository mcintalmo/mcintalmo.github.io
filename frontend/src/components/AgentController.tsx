import { useAgentEvents } from "../hooks/useAgentEvents";
import { usePortfolioNavigation } from "../hooks/usePortfolioNavigation";

// Drop this inside your LiveKitRoom provider, it renders nothing
export function AgentController() {
  const { scrollTo, highlight, reset } = usePortfolioNavigation();

  useAgentEvents({
    onNavigate: scrollTo,
    onHighlight: highlight,
    onReset: reset,
  });

  return null;
}
