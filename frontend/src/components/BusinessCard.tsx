import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Bot,
  Briefcase,
  Check,
  Copy,
  Download,
  FileText,
  Github,
  Globe,
  Linkedin,
  Mail,
  MapPin,
  QrCode,
  Share2,
  Sparkles,
  User,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ResumeBasics, ResumeWork, SiteConfigRoot } from "../lib/types";
import { downloadVCard, generateVCard } from "../lib/vcard";
import { QRCodeDisplay } from "./QRCodeDisplay";
import { Button } from "./ui/button";

interface BusinessCardProps {
  basics?: ResumeBasics;
  work?: ResumeWork[];
  config?: SiteConfigRoot;
}

export function BusinessCard({ basics = {}, work = [] }: BusinessCardProps) {
  // Read initial view from URL query param: ?view=qr vs ?view=card
  const [view, setView] = useState<"card" | "qr">("card");
  const [copied, setCopied] = useState(false);
  const [cardUrl, setCardUrl] = useState("https://www.alexandermcintosh.com/card");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      setCardUrl(`${origin}/card`);

      const params = new URLSearchParams(window.location.search);
      const urlView = params.get("view");
      if (urlView === "qr") {
        setView("qr");
      }
    }
  }, []);

  // Update query parameter when view changes
  const switchView = (newView: "card" | "qr") => {
    setView(newView);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (newView === "qr") {
        url.searchParams.set("view", "qr");
      } else {
        url.searchParams.delete("view");
      }
      window.history.replaceState({}, "", url.toString());
    }
  };

  const name = basics.name || "Alex McIntosh";
  const title = basics.label || "Data Scientist & AI/ML Engineer";
  const currentRole = work[0];
  const company = currentRole?.name || "Pioneer Management Consulting";
  const location = [basics.location?.city, basics.location?.region]
    .filter(Boolean)
    .join(", ");

  const email = basics.email || "mcintalmo@gmail.com";
  const profiles = basics.profiles || [];
  const linkedin = profiles.find((p) => /linkedin/i.test(p.network || ""));
  const github = profiles.find((p) => /github/i.test(p.network || ""));

  const vcardContent = useMemo(() => {
    return generateVCard(basics, {
      includePhone: false,
      company,
    });
  }, [basics, company]);

  const handleSaveContact = () => {
    downloadVCard(vcardContent, `${name.replace(/\s+/g, "_")}.vcf`);
  };

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(cardUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Fallback if clipboard fails
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${name} | Digital Business Card`,
          text: `Connect with ${name} (${title})`,
          url: cardUrl,
        });
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <main className="min-h-[100dvh] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-radial from-background via-background to-muted/20">
      {/* Background glowing ambient orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-96 h-80 sm:h-96 bg-accent-indigo/15 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-80 sm:w-96 h-80 sm:h-96 bg-accent-cyan/15 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Bar Navigation */}
      <header className="w-full max-w-sm mb-4 flex items-center justify-between">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[48px] px-3 -ml-3 rounded-lg focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Back to Portfolio Homepage"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Portfolio</span>
        </a>

        {/* View Switcher Capsule */}
        <div className="relative flex bg-muted/60 p-0.5 rounded-full border border-border/10 w-44 h-10 items-center select-none shrink-0 shadow-xs">
          <div
            className={`absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] bg-background rounded-full shadow-sm border border-border/10 transition-all duration-300 ease-out ${
              view === "card" ? "left-0.5" : "left-[calc(50%)]"
            }`}
          />
          <button
            type="button"
            onClick={() => switchView("card")}
            className={`flex-1 flex justify-center items-center gap-1.5 h-full relative z-10 transition-colors duration-300 rounded-full text-xs font-medium focus:outline-hidden ${
              view === "card"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Card</span>
          </button>
          <button
            type="button"
            onClick={() => switchView("qr")}
            className={`flex-1 flex justify-center items-center gap-1.5 h-full relative z-10 transition-colors duration-300 rounded-full text-xs font-medium focus:outline-hidden ${
              view === "qr"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>QR Code</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="w-full max-w-sm relative [perspective:1000px]">
        <AnimatePresence mode="wait" initial={false}>
          {view === "card" ? (
            /* ============================================================ */
            /* 1. CONTACT CARD VIEW                                          */
            /* ============================================================ */
            <motion.div
              key="card-view"
              initial={{ rotateY: -90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: 90, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              style={{ transformStyle: "preserve-3d" }}
              className="glass-panel border border-border/40 rounded-3xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl"
            >
              {/* Holographic top accent glow */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-accent-indigo via-accent-cyan to-accent-indigo" />

              {/* Profile Header */}
              <div className="flex flex-col items-center text-center mt-2">
                <div className="relative mb-4 group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-accent-indigo to-accent-cyan rounded-full blur-md opacity-70 group-hover:opacity-100 transition duration-700" />
                  <img
                    src={basics.image || "/assets/profile.png"}
                    alt={name}
                    className="relative w-24 h-24 rounded-full object-cover border-2 border-background shadow-xl"
                    onError={(e) => {
                      // Fallback avatar icon if image fails
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                  {/* Status Indicator */}
                  <div
                    className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center shadow-md"
                    title="Available for AI Consulting & Roles"
                  >
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  </div>
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-foreground font-sans">
                  {name}
                </h1>
                <p className="text-sm font-medium text-accent-cyan mt-1">{title}</p>

                <div className="flex flex-wrap items-center justify-center gap-y-1 gap-x-3 text-xs text-muted-foreground mt-2">
                  <span className="inline-flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-muted-foreground/80" />
                    {company}
                  </span>
                  {location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground/80" />
                      {location}
                    </span>
                  )}
                </div>

                {/* Status Pill */}
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Available for AI Systems Consulting</span>
                </div>
              </div>

              {/* Primary 1-Tap CTA: Save Contact (.vcf) */}
              <div className="mt-6">
                <Button
                  onClick={handleSaveContact}
                  className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg hover:bg-primary/90 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer text-base"
                  aria-label="Save contact to phone address book"
                >
                  <Download className="w-5 h-5" />
                  <span>Save to Contacts</span>
                </Button>
              </div>

              {/* Quick Action Icons (Google 48px standard) */}
              <div className="grid grid-cols-4 gap-3 mt-4">
                {/* Voice AI Agent Hook */}
                <a
                  href="/?open-chat=true"
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-accent-indigo/10 border border-accent-indigo/20 hover:bg-accent-indigo/20 transition-colors group min-h-[56px]"
                  title="Talk to Alex's AI Agent"
                  aria-label="Talk to Alex's AI Assistant"
                >
                  <Bot className="w-5 h-5 text-accent-cyan group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-medium text-accent-cyan mt-1">
                    Voice AI
                  </span>
                </a>

                {/* Email */}
                <a
                  href={`mailto:${email}`}
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-muted/60 border border-border/20 hover:bg-muted transition-colors group min-h-[56px]"
                  title={`Send email to ${email}`}
                  aria-label={`Send email to ${email}`}
                >
                  <Mail className="w-5 h-5 text-foreground group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-medium text-muted-foreground mt-1">
                    Email
                  </span>
                </a>

                {/* LinkedIn */}
                {linkedin?.url ? (
                  <a
                    href={linkedin.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-muted/60 border border-border/20 hover:bg-muted transition-colors group min-h-[56px]"
                    title="LinkedIn Profile"
                    aria-label="LinkedIn profile"
                  >
                    <Linkedin className="w-5 h-5 text-foreground group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-medium text-muted-foreground mt-1">
                      LinkedIn
                    </span>
                  </a>
                ) : (
                  <div className="hidden" />
                )}

                {/* GitHub */}
                {github?.url ? (
                  <a
                    href={github.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-muted/60 border border-border/20 hover:bg-muted transition-colors group min-h-[56px]"
                    title="GitHub Profile"
                    aria-label="GitHub profile"
                  >
                    <Github className="w-5 h-5 text-foreground group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-medium text-muted-foreground mt-1">
                      GitHub
                    </span>
                  </a>
                ) : (
                  <div className="hidden" />
                )}
              </div>

              {/* Resource Links List */}
              <div className="mt-5 space-y-2 border-t border-border/30 pt-4">
                <a
                  href="/"
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/40 transition-colors border border-border/20 min-h-[48px] group"
                >
                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-accent-cyan" />
                    <span className="text-sm font-medium">Explore Full Portfolio</span>
                  </div>
                  <span className="text-xs text-muted-foreground group-hover:translate-x-0.5 transition-transform">
                    →
                  </span>
                </a>

                <a
                  href="/resume.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/40 transition-colors border border-border/20 min-h-[48px] group"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-accent-indigo" />
                    <span className="text-sm font-medium">View Resume (PDF)</span>
                  </div>
                  <span className="text-xs text-muted-foreground group-hover:translate-x-0.5 transition-transform">
                    →
                  </span>
                </a>
              </div>

              {/* Bottom Action: Show QR Code & Share */}
              <div className="mt-6 flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => switchView("qr")}
                  className="flex-1 h-12 rounded-xl border-border/60 hover:bg-muted flex items-center justify-center gap-2 text-sm"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Show QR Code</span>
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleShare}
                  className="h-12 w-12 rounded-xl shrink-0 border-border/60 hover:bg-muted"
                  title="Share or Copy Link"
                  aria-label="Share or copy card link"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Share2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </motion.div>
          ) : (
            /* ============================================================ */
            /* 2. QR PRESENTER VIEW                                         */
            /* ============================================================ */
            <motion.div
              key="qr-view"
              initial={{ rotateY: -90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: 90, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              style={{ transformStyle: "preserve-3d" }}
              className="glass-panel border border-border/40 rounded-3xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl flex flex-col items-center text-center"
            >
              {/* Holographic top accent glow */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-accent-indigo via-accent-cyan to-accent-indigo" />

              <div className="inline-flex items-center gap-1.5 text-xs text-accent-cyan font-mono uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Scan to Connect</span>
              </div>

              <h2 className="text-xl font-bold font-sans text-foreground">{name}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{title}</p>

              {/* High-Contrast QR Code */}
              <div className="my-6">
                <QRCodeDisplay url={cardUrl} size={240} />
              </div>

              <p className="text-xs text-muted-foreground max-w-[240px] leading-relaxed">
                Point any phone camera at this code to open the digital business card
                and save contact details.
              </p>

              <div className="w-full space-y-2 mt-6">
                <Button
                  onClick={() => switchView("card")}
                  className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold shadow-md hover:bg-primary/90 flex items-center justify-center gap-2"
                >
                  <User className="w-4 h-4" />
                  <span>Show Contact Card</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={handleCopyLink}
                  className="w-full h-12 rounded-xl border-border/60 hover:bg-muted flex items-center justify-center gap-2 text-sm"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span className="text-emerald-500">Card Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Card Link</span>
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Branding */}
      <footer className="mt-6 text-center">
        <p className="text-[11px] text-muted-foreground/70 font-mono">
          alexandermcintosh.com • AI/ML Systems
        </p>
      </footer>
    </main>
  );
}
