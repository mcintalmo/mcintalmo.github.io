import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDictation } from "./useDictation";

class MockSpeechRecognition {
  static lastInstance: MockSpeechRecognition | null = null;

  static getInstance(): MockSpeechRecognition {
    if (!MockSpeechRecognition.lastInstance) {
      throw new Error("No MockSpeechRecognition instance created");
    }
    return MockSpeechRecognition.lastInstance;
  }

  continuous = false;
  interimResults = false;
  lang = "";
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onresult: ((event: unknown) => void) | null = null;
  start = vi.fn();
  stop = vi.fn();

  constructor() {
    MockSpeechRecognition.lastInstance = this;
  }
}

describe("useDictation", () => {
  let originalSpeechRecognition: unknown;

  beforeEach(() => {
    MockSpeechRecognition.lastInstance = null;
    originalSpeechRecognition = (window as unknown as Record<string, unknown>)
      .SpeechRecognition;
  });

  afterEach(() => {
    (window as unknown as Record<string, unknown>).SpeechRecognition =
      originalSpeechRecognition;
    vi.restoreAllMocks();
  });

  it("returns isDictating false initially", () => {
    const inputRef = { current: document.createElement("input") };
    const { result } = renderHook(() => useDictation({ inputRef }));

    expect(result.current.isDictating).toBe(false);
  });

  it("alerts user when SpeechRecognition is not available", () => {
    delete (window as unknown as Record<string, unknown>).SpeechRecognition;
    delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;

    const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});
    const inputRef = { current: document.createElement("input") };
    const { result } = renderHook(() => useDictation({ inputRef }));

    act(() => {
      result.current.toggleDictation();
    });

    expect(alertMock).toHaveBeenCalledWith(
      "Speech recognition is not supported in this browser.",
    );
    expect(result.current.isDictating).toBe(false);
  });

  it("starts speech recognition and updates isDictating state onstart", () => {
    (window as unknown as Record<string, unknown>).SpeechRecognition =
      MockSpeechRecognition;

    const inputRef = { current: document.createElement("input") };
    inputRef.current.value = "Hello ";
    const { result } = renderHook(() => useDictation({ inputRef }));

    act(() => {
      result.current.toggleDictation();
    });

    const instance = MockSpeechRecognition.getInstance();
    expect(instance.start).toHaveBeenCalledTimes(1);
    expect(inputRef.current.getAttribute("data-base-text")).toBe("Hello ");

    act(() => {
      instance.onstart?.();
    });

    expect(result.current.isDictating).toBe(true);
  });

  it("stops speech recognition when toggled while dictating", () => {
    (window as unknown as Record<string, unknown>).SpeechRecognition =
      MockSpeechRecognition;

    const inputRef = { current: document.createElement("input") };
    const { result } = renderHook(() => useDictation({ inputRef }));

    act(() => {
      result.current.toggleDictation();
    });
    const instance = MockSpeechRecognition.getInstance();
    act(() => {
      instance.onstart?.();
    });
    expect(result.current.isDictating).toBe(true);

    act(() => {
      result.current.toggleDictation();
    });

    expect(instance.stop).toHaveBeenCalledTimes(1);
    expect(result.current.isDictating).toBe(false);
  });

  it("updates input element value on speech results", () => {
    (window as unknown as Record<string, unknown>).SpeechRecognition =
      MockSpeechRecognition;

    const inputRef = { current: document.createElement("input") };
    inputRef.current.value = "Initial: ";
    const { result } = renderHook(() => useDictation({ inputRef }));

    act(() => {
      result.current.toggleDictation();
    });
    const instance = MockSpeechRecognition.getInstance();
    act(() => {
      instance.onstart?.();
    });

    act(() => {
      instance.onresult?.({
        resultIndex: 0,
        results: [
          {
            isFinal: true,
            length: 1,
            0: { transcript: "final transcript " },
          },
          {
            isFinal: false,
            length: 1,
            0: { transcript: "interim..." },
          },
        ],
      });
    });

    expect(inputRef.current.value).toBe("Initial: final transcript interim...");
  });

  it("handles start throwing an exception gracefully", () => {
    class FailingSpeechRecognition extends MockSpeechRecognition {
      override start = vi.fn().mockImplementation(() => {
        throw new Error("NotAllowedError");
      });
    }

    (window as unknown as Record<string, unknown>).SpeechRecognition =
      FailingSpeechRecognition;

    const inputRef = { current: document.createElement("input") };
    const { result } = renderHook(() => useDictation({ inputRef }));

    expect(() => {
      act(() => {
        result.current.toggleDictation();
      });
    }).not.toThrow();

    expect(result.current.isDictating).toBe(false);
  });

  it("cleans up active recognition on unmount", () => {
    (window as unknown as Record<string, unknown>).SpeechRecognition =
      MockSpeechRecognition;

    const inputRef = { current: document.createElement("input") };
    const { result, unmount } = renderHook(() => useDictation({ inputRef }));

    act(() => {
      result.current.toggleDictation();
    });
    const instance = MockSpeechRecognition.getInstance();

    unmount();
    expect(instance.stop).toHaveBeenCalled();
  });
});
