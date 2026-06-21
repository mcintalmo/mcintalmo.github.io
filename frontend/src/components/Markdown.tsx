import type React from "react";
import { mdToHtml, mdToInlineHtml } from "../lib/markdown";

type Props = {
  content?: string | null;
  children?: React.ReactNode;
  inline?: boolean;
  className?: string;
};

export function Markdown({ content, children, inline = false, className }: Props) {
  const source =
    typeof content === "string"
      ? content
      : typeof children === "string"
        ? children
        : "";
  if (!source) return null;
  const html = inline ? mdToInlineHtml(source) : mdToHtml(source);
  // Apply prose classes only for block mode
  const cls = className || (inline ? undefined : "prose prose-invert");
  // biome-ignore lint/security/noDangerouslySetInnerHtml: required to render Markdown HTML output
  return <div className={cls} dangerouslySetInnerHTML={{ __html: html }} />;
}

export default Markdown;
