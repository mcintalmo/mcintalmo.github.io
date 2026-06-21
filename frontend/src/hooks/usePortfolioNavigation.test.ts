import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePortfolioNavigation } from "./usePortfolioNavigation";

// Set up DOM sections before each test
beforeEach(() => {
  document.body.innerHTML = `
    <section id="home"></section>
    <section id="experience"></section>
    <section id="projects"></section>
    <section id="contact"></section>
  `;
});

describe("usePortfolioNavigation", () => {
  it("scrolls to the correct section", () => {
    // Mock window.scrollTo
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);

    const { result } = renderHook(() => usePortfolioNavigation());

    act(() => result.current.scrollTo("work"));

    expect(scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({
        behavior: "smooth",
      }),
    );
  });

  it("adds and removes highlight class", async () => {
    vi.useFakeTimers();
    const el = document.getElementById("projects");
    expect(el).not.toBeNull();
    if (!el) return;
    const { result } = renderHook(() => usePortfolioNavigation());

    act(() => result.current.highlight("projects"));
    expect(el.classList.contains("agent-highlight")).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(el.classList.contains("agent-highlight")).toBe(false);

    vi.useRealTimers();
  });

  it("reset clears all highlights", () => {
    document.getElementById("home")?.classList.add("agent-highlight");
    document.getElementById("contact")?.classList.add("agent-highlight");

    const { result } = renderHook(() => usePortfolioNavigation());
    act(() => result.current.reset());

    document.querySelectorAll(".agent-highlight").forEach((el) => {
      expect(el).not.toBeInTheDocument();
    });
  });
});
