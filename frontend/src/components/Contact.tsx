import { motion } from "framer-motion";
import { Calendar, Check, Copy, ExternalLink, Mail, MapPin, Send } from "lucide-react";
import { useState } from "react";
import type { ResumeBasics, SiteConfigRoot } from "../lib/types";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Linkedin } from "./ui/icons";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

const INQUIRY_TOPICS = [
  {
    label: "AI Architecture",
    subject: "Project Inquiry: AI Architecture",
  },
  {
    label: "Voice & Agentic Systems",
    subject: "Project Inquiry: Voice & Agentic Systems",
  },
  {
    label: "Data & ML Infrastructure",
    subject: "Project Inquiry: Data & ML Infrastructure",
  },
  {
    label: "General Inquiry",
    subject: "General Inquiry",
  },
];

export function Contact({
  basics,
  config,
}: {
  basics?: ResumeBasics;
  config: SiteConfigRoot;
}) {
  const contactConfig = config.sections?.contact as Record<string, unknown> | undefined;

  const targetEmail = basics?.email;

  const bookingUrl =
    (contactConfig?.["booking-url"] as string | undefined) ??
    (contactConfig?.bookingUrl as string | undefined);

  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSelectTopic(topic: { label: string; subject: string }) {
    setForm((prev) => ({
      ...prev,
      subject: topic.subject,
      message:
        prev.message.trim() === "" ||
        prev.message.startsWith("Hi Alex, I would like to discuss")
          ? `Hi Alex, I would like to discuss ${topic.label.toLowerCase()}.\n`
          : prev.message,
    }));
  }

  async function handleCopyEmail() {
    if (!targetEmail) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(targetEmail);
      } else if (typeof document !== "undefined") {
        const textArea = document.createElement("textarea");
        textArea.value = targetEmail;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback: noop
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetEmail) return;
    const subject = encodeURIComponent(form.subject || "Website Inquiry");
    const bodyLines = [
      form.message,
      "",
      `--`,
      form.name && `From: ${form.name}`,
      form.email && `Email: ${form.email}`,
    ]
      .filter(Boolean)
      .join("\n");
    const body = encodeURIComponent(bodyLines);
    window.location.href = `mailto:${targetEmail}?subject=${subject}&body=${body}`;
  }

  const linkedinProfile = basics?.profiles?.find((p) =>
    /linkedin/i.test(p.network || ""),
  );

  return (
    <section id="contact" className="py-20">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: "100px 0px" }}
          className="text-center mb-16 glass-panel rounded-xl py-6 sm:py-8 px-4 sm:px-6 max-w-4xl mx-auto"
        >
          <h2 className="mb-4">
            {config.sections?.contact?.title || "Let's Work Together"}
          </h2>
          {config.sections?.contact?.description && (
            <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg">
              {config.sections.contact.description}
            </p>
          )}
        </motion.div>

        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 max-w-5xl mx-auto items-start">
          {/* Left Column: Coordinates & Focus Areas (5 cols) */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true, margin: "100px 0px" }}
            className="lg:col-span-5 space-y-6"
          >
            {/* Direct Connect Card */}
            <Card className="border-border/60 bg-card/60 backdrop-blur-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold tracking-tight">
                  Direct Inquiries & Coordinates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3">
                  {/* Primary Mail Action */}
                  {targetEmail && (
                    <a
                      href={`mailto:${targetEmail}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all group min-h-[52px]"
                      aria-label={`Send email to ${targetEmail}`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                          Email
                        </p>
                        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {targetEmail}
                        </p>
                      </div>
                    </a>
                  )}

                  {/* Copy Email Button */}
                  {targetEmail && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCopyEmail}
                      className="h-11 rounded-xl border-border/80 hover:bg-muted/80 flex items-center justify-center gap-2 cursor-pointer w-full"
                      aria-label="Copy Email"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm font-medium text-emerald-400">
                            Copied!
                          </span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Copy Email</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Optional Calendar Booking Link */}
                {bookingUrl && (
                  <Button
                    variant="outline"
                    asChild
                    className="w-full h-11 rounded-xl border-accent-cyan/30 hover:border-accent-cyan hover:bg-accent-cyan/10 font-medium transition-all"
                  >
                    <a
                      href={bookingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 text-foreground"
                      aria-label="Schedule an Intro Call"
                    >
                      <Calendar className="w-4 h-4 text-accent-cyan" />
                      <span>Schedule an Intro Call</span>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground ml-1" />
                    </a>
                  </Button>
                )}

                {/* Location & LinkedIn Row */}
                <div className="pt-3 border-t border-border/40 space-y-2.5 text-sm">
                  {(basics?.location?.city || basics?.location?.region) && (
                    <div className="flex items-center gap-3 text-muted-foreground py-1">
                      <MapPin className="w-4 h-4 text-primary shrink-0" />
                      <span>
                        {[basics?.location?.city, basics?.location?.region]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </div>
                  )}

                  {linkedinProfile && (
                    <a
                      href={
                        linkedinProfile.url ||
                        `https://www.linkedin.com/in/${linkedinProfile.username}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 text-muted-foreground hover:text-primary transition-colors py-1 group"
                      aria-label="LinkedIn profile"
                    >
                      <Linkedin className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-medium group-hover:underline">
                        LinkedIn Profile
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity ml-auto" />
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Right Column: Send a Message Form (7 cols) */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true, margin: "100px 0px" }}
            className="lg:col-span-7"
          >
            <Card className="border-border/80 bg-card/70 backdrop-blur-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold tracking-tight">
                  Send a Message
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Select a topic below or customize your message directly.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Topic Selection Buttons */}
                <div className="flex flex-wrap gap-2 pb-1">
                  {INQUIRY_TOPICS.map((topic) => {
                    const isSelected = form.subject === topic.subject;
                    return (
                      <button
                        key={topic.label}
                        type="button"
                        onClick={() => handleSelectTopic(topic)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer font-medium ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
                        }`}
                      >
                        {topic.label}
                      </button>
                    );
                  })}
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                  {/* Name Input */}
                  <div className="relative">
                    <Input
                      id="contact-name"
                      name="name"
                      placeholder="Your Name"
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                      className="peer pt-5 pb-1 placeholder:text-transparent h-12"
                    />
                    <label
                      htmlFor="contact-name"
                      className="absolute left-3 top-1 text-[10px] font-medium text-muted-foreground transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-muted-foreground/60 peer-focus:top-1 peer-focus:text-[10px] peer-focus:text-primary pointer-events-none"
                    >
                      Your Name
                    </label>
                  </div>

                  {/* Email Input */}
                  <div className="relative">
                    <Input
                      id="contact-email"
                      name="email"
                      placeholder="Your Email"
                      type="email"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      required
                      className="peer pt-5 pb-1 placeholder:text-transparent h-12"
                    />
                    <label
                      htmlFor="contact-email"
                      className="absolute left-3 top-1 text-[10px] font-medium text-muted-foreground transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-muted-foreground/60 peer-focus:top-1 peer-focus:text-[10px] peer-focus:text-primary pointer-events-none"
                    >
                      Your Email *
                    </label>
                  </div>

                  {/* Subject Input */}
                  <div className="relative">
                    <Input
                      id="contact-subject"
                      name="subject"
                      placeholder="Subject"
                      value={form.subject}
                      onChange={(e) => update("subject", e.target.value)}
                      className="peer pt-5 pb-1 placeholder:text-transparent h-12"
                    />
                    <label
                      htmlFor="contact-subject"
                      className="absolute left-3 top-1 text-[10px] font-medium text-muted-foreground transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-muted-foreground/60 peer-focus:top-1 peer-focus:text-[10px] peer-focus:text-primary pointer-events-none"
                    >
                      Subject
                    </label>
                  </div>

                  {/* Message Textarea */}
                  <div className="relative">
                    <Textarea
                      id="contact-message"
                      name="message"
                      placeholder="Your message..."
                      className="peer pt-6 pb-2 placeholder:text-transparent min-h-[140px]"
                      value={form.message}
                      onChange={(e) => update("message", e.target.value)}
                      required
                    />
                    <label
                      htmlFor="contact-message"
                      className="absolute left-3 top-1.5 text-[10px] font-medium text-muted-foreground transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-3 peer-placeholder-shown:text-muted-foreground/60 peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:text-primary pointer-events-none"
                    >
                      Your message *
                    </label>
                  </div>

                  {/* Submit Button */}
                  <Button
                    className="w-full h-12 rounded-xl text-sm sm:text-base font-medium shadow-md transition-all cursor-pointer"
                    type="submit"
                    disabled={!targetEmail || !form.email || !form.message}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {targetEmail ? "Send Message" : "Email Unavailable"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
