import { ChevronDown, Download, MessageSquare } from "lucide-react";
import profileImg from "../assets/profile.png";
import type { ResumeBasics, SuggestedQuestion } from "../lib/types";
import { HeroPrompt } from "./HeroPrompt";
import { Markdown } from "./Markdown";
import { Button } from "./ui/button";

export interface Props {
  basics?: ResumeBasics;
  recommendedQuestions?: SuggestedQuestion[];
}

export function Home({ basics, recommendedQuestions }: Props) {
  const name = basics?.name || "";
  const label = basics?.label || "";
  const yamlImage = basics?.image;
  const useYamlDirect = yamlImage && /^(https?:)?\/\//.test(yamlImage);

  const summary = basics?.summary;

  return (
    <section
      id="home"
      className="min-h-screen flex items-center justify-center relative overflow-hidden pt-16"
    >
      <div className="container mx-auto px-4 sm:px-6 text-center relative z-10">
        <div
          className="max-w-4xl mx-auto hero-content"
          style={{ animation: "fadeInUp 1.2s ease-out forwards" }}
        >
          {/* Professional Headshot */}
          <div className="mb-6 sm:mb-8">
            <div className="relative mx-auto w-32 h-32 sm:w-48 sm:h-48">
              {/* Pulse ring */}
              <div
                aria-hidden="true"
                className="absolute inset-0 rounded-full border-2 border-accent-cyan/40 pulse-ring"
                style={{ animation: "pulseRing 4s ease-out infinite" }}
              ></div>

              {/* Profile image */}
              <div className="absolute inset-3 sm:inset-4 rounded-full overflow-hidden border-4 border-background shadow-2xl">
                <div className="w-full h-full image-hover transition-transform duration-300 hover:scale-105">
                  <img
                    src={useYamlDirect ? yamlImage : profileImg.src}
                    width={192}
                    height={192}
                    loading="eager"
                    decoding="async"
                    alt={name || "Profile photo"}
                    className="w-full h-full object-cover"
                    sizes="(max-width: 640px) 128px, 192px"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Name & Label */}
          <div className="glass-panel rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-12 relative z-10 mx-0 sm:mx-4">
            {name && (
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-medium mb-3 sm:mb-4 tracking-tight font-sans">
                Hi, I'm{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent-indigo to-accent-cyan font-bold">
                  {name}
                </span>
              </h1>
            )}
            {label && (
              <h2 className="mb-4 text-muted-foreground font-sans text-lg sm:text-xl">
                {label}
              </h2>
            )}

            {/* Summary tagline */}
            {summary && (
              <div className="text-sm sm:text-base text-muted-foreground font-sans max-w-2xl mx-auto mb-6 leading-relaxed">
                <Markdown
                  className="prose prose-sm dark:prose-invert"
                  content={summary}
                />
              </div>
            )}

            {/* Direct Conversion CTAs */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
              <Button
                asChild
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-6 py-2.5 h-11 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <a href="#contact" className="inline-flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Discuss a Project
                </a>
              </Button>
              <Button
                variant="outline"
                asChild
                className="border-border hover:bg-muted font-medium px-5 py-2.5 h-11 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <a
                  href="/resume.pdf"
                  download
                  className="inline-flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Resume (PDF)
                </a>
              </Button>
            </div>

            {/* Command Prompt Hero */}
            <HeroPrompt recommendedQuestions={recommendedQuestions} />
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 scroll-indicator">
        <a href="#experience" aria-label="Scroll to see more">
          <ChevronDown
            className="w-6 h-6 text-muted-foreground animate-bounce"
            strokeWidth={2}
          />
        </a>
      </div>
    </section>
  );
}
