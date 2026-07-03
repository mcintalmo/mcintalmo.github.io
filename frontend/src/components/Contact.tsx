import { motion } from "framer-motion";
import { Linkedin, Mail, MapPin, Phone, Send } from "lucide-react";
import { useState } from "react";
import type { ResumeBasics, SiteConfigRoot } from "../lib/types";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

export function Contact({
  basics,
  config,
}: {
  basics?: ResumeBasics;
  config: SiteConfigRoot;
}) {
  // Extract available-for data strictly from config (no fallback defaults)
  const contactConfig = config.sections?.contact as Record<string, unknown> | undefined;
  const availableForRaw =
    contactConfig?.["available-for"] ?? contactConfig?.availableFor;
  const availableFor: string[] | undefined = Array.isArray(availableForRaw)
    ? (availableForRaw as unknown[]).map((s) => String(s).trim()).filter(Boolean)
    : undefined;

  const targetEmail = basics?.email; // could be extended to pull from config

  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
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

  return (
    <section id="contact" className="py-20">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16 glass-panel rounded-xl py-8 px-6"
        >
          <h2 className="mb-4">{config.sections?.contact?.title || "Contact"}</h2>
          {config.sections?.contact?.description && (
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {config.sections.contact.description}
            </p>
          )}
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {/* Left Column: Contact details + Available For */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle>Get in Touch</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {basics?.email && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      viewport={{ once: true }}
                      className="flex items-center gap-4"
                    >
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Mail className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <a href={`mailto:${basics.email}`} className="underline">
                          {basics.email}
                        </a>
                      </div>
                    </motion.div>
                  )}

                  {basics?.phone && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      viewport={{ once: true }}
                      className="flex items-center gap-4"
                    >
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Phone className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <a href={`tel:${basics.phone}`} className="underline">
                          {basics.phone}
                        </a>
                      </div>
                    </motion.div>
                  )}

                  {(basics?.location?.city || basics?.location?.region) && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      viewport={{ once: true }}
                      className="flex items-center gap-4"
                    >
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Location</p>
                        <p>
                          {[basics?.location?.city, basics?.location?.region]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {basics?.profiles?.find((p) => /linkedin/i.test(p.network || "")) && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.35 }}
                      viewport={{ once: true }}
                      className="flex items-center gap-4"
                    >
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Linkedin className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <p className="text-sm text-muted-foreground">LinkedIn</p>
                        {(() => {
                          const profile = basics.profiles?.find((p) =>
                            /linkedin/i.test(p.network || ""),
                          );
                          if (!profile) return null;
                          const label =
                            profile.username ||
                            profile.url?.replace(/^https?:\/\//, "");
                          return (
                            <a
                              href={
                                profile.url ||
                                `https://www.linkedin.com/in/${profile.username}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline break-all"
                              aria-label="LinkedIn profile"
                            >
                              {label}
                            </a>
                          );
                        })()}
                      </div>
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>

            {availableFor && availableFor.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                viewport={{ once: true }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Available for:</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {availableFor.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.div>

          {/* Right Column: Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Send Message</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    viewport={{ once: true }}
                    className="relative"
                  >
                    <Input
                      id="contact-name"
                      name="name"
                      placeholder="Your Name"
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                      className="peer pt-5 pb-1 placeholder:text-transparent"
                    />
                    <label
                      htmlFor="contact-name"
                      className="absolute left-3 top-1 text-[10px] font-medium text-muted-foreground transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-muted-foreground/60 peer-focus:top-1 peer-focus:text-[10px] peer-focus:text-primary pointer-events-none"
                    >
                      Your Name
                    </label>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    viewport={{ once: true }}
                    className="relative"
                  >
                    <Input
                      id="contact-email"
                      name="email"
                      placeholder="Your Email"
                      type="email"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      required
                      className="peer pt-5 pb-1 placeholder:text-transparent"
                    />
                    <label
                      htmlFor="contact-email"
                      className="absolute left-3 top-1 text-[10px] font-medium text-muted-foreground transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-muted-foreground/60 peer-focus:top-1 peer-focus:text-[10px] peer-focus:text-primary pointer-events-none"
                    >
                      Your Email *
                    </label>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    viewport={{ once: true }}
                    className="relative"
                  >
                    <Input
                      id="contact-subject"
                      name="subject"
                      placeholder="Subject"
                      value={form.subject}
                      onChange={(e) => update("subject", e.target.value)}
                      className="peer pt-5 pb-1 placeholder:text-transparent"
                    />
                    <label
                      htmlFor="contact-subject"
                      className="absolute left-3 top-1 text-[10px] font-medium text-muted-foreground transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-muted-foreground/60 peer-focus:top-1 peer-focus:text-[10px] peer-focus:text-primary pointer-events-none"
                    >
                      Subject
                    </label>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    viewport={{ once: true }}
                    className="relative"
                  >
                    <Textarea
                      id="contact-message"
                      name="message"
                      placeholder="Your message..."
                      className="peer pt-6 pb-2 placeholder:text-transparent min-h-[120px]"
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
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    viewport={{ once: true }}
                  >
                    <Button
                      className="w-full"
                      type="submit"
                      disabled={!targetEmail || !form.email || !form.message}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {targetEmail ? "Send Message" : "Email Unavailable"}
                    </Button>
                  </motion.div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
