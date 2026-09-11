import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchLiveKitToken } from "./token";

describe("fetchLiveKitToken", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("successfully fetches token from first reachable endpoint", async () => {
    const mockResponse = {
      token: "mock-jwt-token",
      ws_url: "ws://localhost:7880",
      local_ip: "192.168.1.100",
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const tokenInfo = await fetchLiveKitToken("test-room", "test-user");
    expect(tokenInfo.token).toBe("mock-jwt-token");
    expect(tokenInfo.ws_url).toBe("ws://localhost:7880");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("falls back to secondary port if primary port fails", async () => {
    const mockResponse = {
      token: "mock-jwt-token-port-8002",
      ws_url: "ws://localhost:7880",
    };

    // First candidate (port 8000) fails with connection refused
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error("Failed to fetch"))
      // Second candidate (port 8002) succeeds
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

    const tokenInfo = await fetchLiveKitToken("test-room");
    expect(tokenInfo.token).toBe("mock-jwt-token-port-8002");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("throws error when all endpoints fail", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Connection refused"));

    await expect(fetchLiveKitToken("test-room")).rejects.toThrow();
  });
});
