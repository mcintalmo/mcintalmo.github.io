import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRoomContext } from "@livekit/components-react";
import { useAgentEvents } from "./useAgentEvents";

// Build a minimal mock room with an event emitter
function makeMockRoom() {
  const listeners: Record<string, Function[]> = {};
  return {
    on: vi.fn((event: string, cb: Function) => {
      listeners[event] = [...(listeners[event] ?? []), cb];
    }),
    off: vi.fn((event: string, cb: Function) => {
      listeners[event] = listeners[event]?.filter(l => l !== cb);
    }),
    emit: (event: string, payload: unknown) => {
      listeners[event]?.forEach(l => l(payload));
    },
  };
}

describe("useAgentEvents", () => {
  let mockRoom: ReturnType<typeof makeMockRoom>;

  beforeEach(() => {
    mockRoom = makeMockRoom();
    vi.mocked(useRoomContext).mockReturnValue(mockRoom as any);
  });

  it("calls onNavigate when a navigate event is received", () => {
    const onNavigate = vi.fn();
    renderHook(() => useAgentEvents({ onNavigate }));

    const payload = new TextEncoder().encode(
      JSON.stringify({ type: "navigate", target: "work" }),
    );
    mockRoom.emit("dataReceived", payload);

    expect(onNavigate).toHaveBeenCalledWith("work");
  });

  it("ignores malformed data without throwing", () => {
    const onNavigate = vi.fn();
    renderHook(() => useAgentEvents({ onNavigate }));

    const payload = new TextEncoder().encode("not json {{{");
    expect(() => mockRoom.emit("dataReceived", payload)).not.toThrow();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("removes the listener on unmount", () => {
    const { unmount } = renderHook(() => useAgentEvents({}));
    unmount();
    expect(mockRoom.off).toHaveBeenCalledWith("dataReceived", expect.any(Function));
  });
});
