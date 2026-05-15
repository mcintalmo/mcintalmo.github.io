import type { NavigationTarget } from "../lib/events";

const SECTION_IDS: Record<NavigationTarget, string> = {
  hero: "home",
  work: "experience",
  education: "education",
  skills: "skills",
  projects: "projects",
  blog: "blog",
  contact: "contact",
};

export function usePortfolioNavigation() {
  const scrollTo = (target: NavigationTarget) => {
    const el = document.getElementById(SECTION_IDS[target]);
    if (el) {
      // Need a slight offset for the fixed header
      const y = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const highlight = (target: NavigationTarget) => {
    // add a CSS class briefly to draw attention
    const el = document.getElementById(SECTION_IDS[target]);
    el?.classList.add("agent-highlight");
    setTimeout(() => el?.classList.remove("agent-highlight"), 2000);
  };

  const reset = () => {
    document.querySelectorAll(".agent-highlight")
      .forEach(el => el.classList.remove("agent-highlight"));
  };

  return { scrollTo, highlight, reset };
}
