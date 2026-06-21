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
  | { type: "reset" };
