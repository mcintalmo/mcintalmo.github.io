import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Home } from "./Home";

vi.mock("../assets/profile.png", () => ({
  default: { src: "/assets/profile.png" },
}));

describe("Home Component", () => {
  const mockBasics = {
    name: "Alex McIntosh",
    label: "Data Scientist & AI/ML Engineer",
    summary: "Operationalizing interpretable machine learning at scale.",
  };

  it("renders name and label correctly", () => {
    render(<Home basics={mockBasics} />);
    expect(screen.getByText("Alex McIntosh")).toBeInTheDocument();
    expect(screen.getByText("Data Scientist & AI/ML Engineer")).toBeInTheDocument();
  });

  it("renders primary 'Discuss a Project' CTA button linking to #contact", () => {
    render(<Home basics={mockBasics} />);
    const discussLink = screen.getByRole("link", { name: /discuss a project/i });
    expect(discussLink).toBeInTheDocument();
    expect(discussLink).toHaveAttribute("href", "#contact");
  });

  it("renders secondary 'Download Resume (PDF)' CTA button linking to /resume.pdf", () => {
    render(<Home basics={mockBasics} />);
    const resumeLink = screen.getByRole("link", { name: /download resume/i });
    expect(resumeLink).toBeInTheDocument();
    expect(resumeLink).toHaveAttribute("href", "/resume.pdf");
  });

  it("renders scroll indicator linking to #experience", () => {
    render(<Home basics={mockBasics} />);
    const scrollLink = screen.getByLabelText(/scroll to see more/i);
    expect(scrollLink).toBeInTheDocument();
    expect(scrollLink).toHaveAttribute("href", "#experience");
  });
});
