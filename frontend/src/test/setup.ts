import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock LiveKit globally — it requires a real WebRTC environment
vi.mock("@livekit/components-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@livekit/components-react")>();
  return {
    ...actual,
    useRoomContext: vi.fn(),
    useLocalParticipant: vi.fn(() => ({
      localParticipant: {
        publishData: vi.fn(),
      },
    })),
  };
});

// Mock import.meta.env
vi.stubEnv("PUBLIC_API_URL", "http://localhost:8000");
