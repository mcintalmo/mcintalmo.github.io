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

  const clearTextHighlights = () => {
    const highlights = document.querySelectorAll("mark.agent-text-highlight");
    for (const highlight of Array.from(highlights)) {
      const parent = highlight.parentElement;
      if (!parent) continue;
      const textNode = document.createTextNode(highlight.textContent || "");
      parent.replaceChild(textNode, highlight);
      parent.normalize(); // merge adjacent text nodes
    }
  };

  const highlightText = (query: string) => {
    // First, clear existing highlights
    clearTextHighlights();

    if (!query || query.trim().length < 2) return;

    const normalizedQuery = query.toLowerCase().trim();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;

        // Skip script, style, inputs, buttons, svg
        const tagName = parent.tagName.toLowerCase();
        if (
          ["script", "style", "textarea", "input", "button", "svg", "code"].includes(
            tagName,
          )
        ) {
          return NodeFilter.FILTER_REJECT;
        }

        // Skip chat widget and agent visualizer elements
        if (
          // biome-ignore lint/security/noSecrets: false positive on CSS selector
          parent.closest("[class*='chat']") ||
          parent.closest(".chat-widget") ||
          parent.closest(".chat-panel") ||
          parent.closest(".fixed")
        ) {
          return NodeFilter.FILTER_REJECT;
        }

        if (node.nodeValue?.toLowerCase().includes(normalizedQuery)) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_REJECT;
      },
    });

    const nodesToReplace: Text[] = [];
    let currentNode = walker.nextNode();
    while (currentNode) {
      nodesToReplace.push(currentNode as Text);
      currentNode = walker.nextNode();
    }

    let firstMatchEl: HTMLElement | null = null;

    for (const node of nodesToReplace) {
      const parent = node.parentElement;
      if (!parent) continue;

      const val = node.nodeValue || "";
      const index = val.toLowerCase().indexOf(normalizedQuery);
      if (index === -1) continue;

      const before = val.substring(0, index);
      const match = val.substring(index, index + query.length);
      const after = val.substring(index + query.length);

      const fragment = document.createDocumentFragment();
      if (before) fragment.appendChild(document.createTextNode(before));

      const mark = document.createElement("mark");
      mark.className = "agent-text-highlight";
      mark.textContent = match;
      fragment.appendChild(mark);

      if (!firstMatchEl) {
        firstMatchEl = mark;
      }

      if (after) fragment.appendChild(document.createTextNode(after));

      parent.replaceChild(fragment, node);
    }

    if (firstMatchEl) {
      firstMatchEl.scrollIntoView({ behavior: "smooth", block: "center" });

      // Auto-remove highlight after 6 seconds
      setTimeout(() => {
        clearTextHighlights();
      }, 6000);
    }
  };

  const reset = () => {
    document.querySelectorAll(".agent-highlight").forEach((el) => {
      el.classList.remove("agent-highlight");
    });
    clearTextHighlights();
  };

  return { scrollTo, highlight, highlightText, clearTextHighlights, reset };
}
