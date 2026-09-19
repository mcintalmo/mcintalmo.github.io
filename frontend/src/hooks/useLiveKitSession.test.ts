import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as tokenModule from "../lib/token";
import { useLiveKitSession } from "./useLiveKitSession";

describe("useLiveKitSession", () => {
  beforeEach(() => {
    vi.spyOn(tokenModule, "fetchLiveKitToken").mockResolvedValue({
      token: "mock-jwt-token",
      ws_url: "ws://localhost:7880",
      local_ip: "192.168.1.50",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes with default options without auto-connecting", () => {
    const { result } = renderHook(() => useLiveKitSession({ autoConnect: false }));

    expect(result.current.shouldConnect).toBe(false);
    expect(result.current.tokenInfo).toBeNull();
    expect(tokenModule.fetchLiveKitToken).not.toHaveBeenCalled();
  });

  it("connects and fetches token when connect() is called", async () => {
    const { result } = renderHook(() => useLiveKitSession({ autoConnect: false }));

    await act(async () => {
      result.current.connect();
    });

    expect(result.current.shouldConnect).toBe(true);
    expect(tokenModule.fetchLiveKitToken).toHaveBeenCalled();
    expect(result.current.tokenInfo).toEqual({
      token: "mock-jwt-token",
      ws_url: "ws://localhost:7880",
      local_ip: "192.168.1.50",
    });
  });

  it("auto-connects when autoConnect is true", async () => {
    const { result } = renderHook(() => useLiveKitSession({ autoConnect: true }));

    expect(result.current.shouldConnect).toBe(true);
    await act(async () => {
      // allow promise to resolve
    });

    expect(tokenModule.fetchLiveKitToken).toHaveBeenCalled();
    expect(result.current.tokenInfo?.token).toBe("mock-jwt-token");
  });

  it("refreshes token on handleDisconnected", async () => {
    const { result } = renderHook(() => useLiveKitSession({ autoConnect: false }));

    await act(async () => {
      result.current.handleDisconnected();
    });

    expect(tokenModule.fetchLiveKitToken).toHaveBeenCalled();
  });

  it("refreshes token on expired or unauthorized errors", async () => {
    const { result } = renderHook(() => useLiveKitSession({ autoConnect: false }));

    await act(async () => {
      result.current.handleError(new Error("Token expired"));
    });

    expect(tokenModule.fetchLiveKitToken).toHaveBeenCalled();
  });
});
