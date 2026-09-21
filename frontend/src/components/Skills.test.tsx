import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ResumeSkill, SiteConfigRoot } from "../lib/types";
import { Skills } from "./Skills";

describe("Skills Component (Bento Grid)", () => {
  const mockSkills: ResumeSkill[] = [
    { name: "LangGraph", level: "Expert", keywords: ["LLM & Agents"] },
    { name: "LiveKit", level: "Advanced", keywords: ["LLM & Agents"] },
    { name: "PyTorch", level: "Advanced", keywords: ["Machine Learning & AI"] },
    { name: "PySpark", level: "Advanced", keywords: ["Languages & Frameworks"] },
    { name: "Docker", level: "Expert", keywords: ["Cloud & Infrastructure"] },
  ];

  const mockConfig: SiteConfigRoot = {
    sections: {
      skills: {
        title: "Skills & Technologies",
        description: "Core technical capabilities across the stack",
        enabled: true,
        categories: [
          {
            key: "llm-agents",
            title: "Agentic & Generative AI",
            icon: "brain",
            keywords: ["LLM & Agents"],
          },
          {
            key: "machine-learning-ai",
            title: "Machine Learning & AI",
            icon: "brain",
            keywords: ["Machine Learning & AI"],
          },
          {
            key: "cloud-infrastructure",
            title: "Cloud & Infrastructure",
            icon: "cloud",
            keywords: ["Cloud & Infrastructure"],
          },
        ],
      },
    },
  };

  it("renders category titles and subtitles", () => {
    const configWithFeatured: SiteConfigRoot = {
      sections: {
        skills: {
          title: "Skills & Technologies",
          categories: [
            {
              key: "llm-agents",
              title: "Agentic & Generative AI",
              icon: "bot",
              subtitle: "Autonomous multi-agent workflows",
              keywords: ["LLM & Agents"],
            },
          ],
        },
      },
    };
    render(<Skills skills={mockSkills} config={configWithFeatured} />);
    expect(
      screen.getAllByText("Agentic & Generative AI").length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Autonomous multi-agent workflows")).toBeInTheDocument();
  });

  it("renders all categories directly without redundant filter pills", () => {
    render(<Skills skills={mockSkills} config={mockConfig} />);
    expect(
      screen.queryByRole("button", { name: /all systems/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByText("Agentic & Generative AI").length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("renders skill items as chips without 5-bar battery rating slots", () => {
    render(<Skills skills={mockSkills} config={mockConfig} />);
    expect(screen.getByText("LangGraph")).toBeInTheDocument();
    expect(screen.getByText("LiveKit")).toBeInTheDocument();
    expect(screen.getByText("PyTorch")).toBeInTheDocument();

    // Verify there are no screen-reader "Level:" battery gauges
    expect(screen.queryByText(/level: expert/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/level: advanced/i)).not.toBeInTheDocument();
  });

  it("handles empty skills array gracefully", () => {
    render(<Skills skills={[]} config={mockConfig} />);
    expect(screen.getByText("Skills & Technologies")).toBeInTheDocument();
  });
});
