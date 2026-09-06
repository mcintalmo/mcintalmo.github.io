export type NavigationTarget =
  | "hero"
  | "work"
  | "education"
  | "skills"
  | "projects"
  | "blog"
  | "contact";

export type AgentEvent =
  | { type: "navigate"; target: NavigationTarget }
  | { type: "highlight"; target: NavigationTarget }
  | { type: "reset" }
  | {
      type: "tool_call_started";
      call_id: string;
      tool_name: string;
      arguments: string;
      timestamp: number;
    }
  | {
      type: "tool_call_completed";
      call_id: string;
      tool_name: string;
      result: string;
      timestamp: number;
    };
