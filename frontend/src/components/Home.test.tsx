import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Home } from "./Home";

vi.mock("../assets/profile.png", () => ({
  default: { src: "/assets/profile.png" },
}));

describe("Home Component", () => {
  const mockBasics = {
    name: "Alexander McIntosh",
    label: "Data Scientist & AI/ML Engineer",
    summary: "Operationalizing interpretable machine learning at scale.",
  };

  it("renders name and label correctly", () => {
    render(<Home basics={mockBasics} />);
    expect(screen.getByText("Alexander McIntosh")).toBeInTheDocument();
    expect(screen.getByText("Data Scientist & AI/ML Engineer")).toBeInTheDocument();
  });

  it("renders primary 'Discuss an Engagement' CTA button linking to #contact", () => {
    render(<Home basics={mockBasics} />);
    const discussLink = screen.getByRole("link", { name: /discuss an engagement/i });
    expect(discussLink).toBeInTheDocument();
    expect(discussLink).toHaveAttribute("href", "#contact");
  });

  it("renders secondary 'Download Resume' CTA button linking to resume download", () => {
    render(<Home basics={mockBasics} />);
    const downloadLink = screen.getByRole("link", { name: /download resume/i });
    expect(downloadLink).toBeInTheDocument();
    expect(downloadLink).toHaveAttribute(
      "href",
      "/downloads/McIntosh_Alexander_Resume.pdf",
    );
    expect(downloadLink).toHaveAttribute("download");
  });

  it("renders scroll indicator linking to #experience", () => {
    render(<Home basics={mockBasics} />);
    const scrollLink = screen.getByLabelText(/scroll to see more/i);
    expect(scrollLink).toBeInTheDocument();
    expect(scrollLink).toHaveAttribute("href", "#experience");
  });
});
