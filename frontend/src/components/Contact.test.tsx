import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ResumeBasics, SiteConfigRoot } from "../lib/types";
import { Contact } from "./Contact";

describe("Contact Component", () => {
  const mockBasics: ResumeBasics = {
    name: "Alex McIntosh",
    email: "mcintalmo@gmail.com",
    phone: "555-123-4567",
    location: {
      city: "Minneapolis",
      region: "MN",
    },
    profiles: [
      {
        network: "LinkedIn",
        username: "mcintalmo",
        url: "https://linkedin.com/in/mcintalmo",
      },
      {
        network: "GitHub",
        username: "mcintalmo",
        url: "https://github.com/mcintalmo",
      },
    ],
  };

  const mockConfig: SiteConfigRoot = {
    sections: {
      contact: {
        title: "Let's Work Together",
        description:
          "Ready to turn your data into intelligent solutions? Let's discuss your roadmap.",
        enabled: true,
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders section title and description", () => {
    render(<Contact basics={mockBasics} config={mockConfig} />);
    expect(screen.getByText("Let's Work Together")).toBeInTheDocument();
    expect(
      screen.getByText(/ready to turn your data into intelligent solutions/i),
    ).toBeInTheDocument();
  });

  it("renders email and LinkedIn connection link", () => {
    render(<Contact basics={mockBasics} config={mockConfig} />);
    expect(screen.getByText("mcintalmo@gmail.com")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /linkedin/i })).toHaveAttribute(
      "href",
      "https://linkedin.com/in/mcintalmo",
    );
  });

  it("does not render phone number even when present in basics (filtered for privacy)", () => {
    render(<Contact basics={mockBasics} config={mockConfig} />);
    expect(screen.queryByText("555-123-4567")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /call/i })).not.toBeInTheDocument();
  });

  it("renders 3 commercial engagement pillars", () => {
    render(<Contact basics={mockBasics} config={mockConfig} />);
    expect(screen.getByText("AI Architecture & Strategy Advisory")).toBeInTheDocument();
    expect(screen.getByText("Agentic Voice & Real-Time Systems")).toBeInTheDocument();
    expect(
      screen.getByText("Data & Machine Learning Infrastructure"),
    ).toBeInTheDocument();
  });

  it("clicking an engagement card updates the subject input", () => {
    render(<Contact basics={mockBasics} config={mockConfig} />);
    const subjectInput = screen.getByLabelText(/subject/i) as HTMLInputElement;
    expect(subjectInput.value).toBe("");

    const voiceCard = screen.getByRole("button", {
      name: /agentic voice & real-time systems/i,
    });
    fireEvent.click(voiceCard);

    expect(subjectInput.value).toContain("Agentic Voice & Real-Time Systems");
  });

  it("renders category selection pills and clicking one updates the subject", () => {
    render(<Contact basics={mockBasics} config={mockConfig} />);
    const fullTimePill = screen.getByRole("button", {
      name: /full-time opportunities/i,
    });
    fireEvent.click(fullTimePill);

    const subjectInput = screen.getByLabelText(/subject/i) as HTMLInputElement;
    expect(subjectInput.value).toContain("Full-Time Opportunities");
  });

  it("copies email to clipboard and provides visual feedback", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<Contact basics={mockBasics} config={mockConfig} />);
    const copyButton = screen.getByRole("button", { name: /copy email/i });
    fireEvent.click(copyButton);

    expect(writeTextMock).toHaveBeenCalledWith("mcintalmo@gmail.com");

    await waitFor(() => {
      expect(screen.getByText(/copied/i)).toBeInTheDocument();
    });
  });

  it("disables send button when required fields are empty", () => {
    render(<Contact basics={mockBasics} config={mockConfig} />);
    const submitBtn = screen.getByRole("button", { name: /send message/i });
    expect(submitBtn).toBeDisabled();

    const emailInput = screen.getByLabelText(/your email/i);
    const messageInput = screen.getByLabelText(/your message/i);

    fireEvent.change(emailInput, { target: { value: "lead@example.com" } });
    fireEvent.change(messageInput, {
      target: { value: "We want to hire your services." },
    });

    expect(submitBtn).not.toBeDisabled();
  });

  it("renders booking link when booking-url is configured in site config", () => {
    const configWithBooking: SiteConfigRoot = {
      sections: {
        contact: {
          title: "Contact",
          enabled: true,
          "booking-url": "https://calendar.app.google/sample-schedule",
        } as unknown as Record<string, unknown>,
      },
    };

    render(<Contact basics={mockBasics} config={configWithBooking} />);
    const bookingLink = screen.getByRole("link", {
      name: /schedule an intro call|book an intro call/i,
    });
    expect(bookingLink).toBeInTheDocument();
    expect(bookingLink).toHaveAttribute(
      "href",
      "https://calendar.app.google/sample-schedule",
    );
  });
});
