import type { ResumeBasics } from "./types";

export interface VCardOptions {
  includePhone?: boolean;
  company?: string;
  notes?: string;
}

/**
 * Generates an RFC 6350 / vCard 3.0 standard string from ResumeBasics.
 * Standardized for native integration with Apple Contacts and Google Contacts.
 */
export function generateVCard(
  basics: ResumeBasics,
  options: VCardOptions = {},
): string {
  const {
    includePhone = false,
    company = "Pioneer Management Consulting",
    notes,
  } = options;

  const name = basics.name || "Alex McIntosh";
  const nameParts = name.trim().split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  const lines: string[] = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${name}`,
    `N:${lastName};${firstName};;;`,
  ];

  if (basics.label) {
    lines.push(`TITLE:${basics.label}`);
  }

  if (company) {
    lines.push(`ORG:${company}`);
  }

  if (basics.email) {
    lines.push(`EMAIL;TYPE=INTERNET,PREF:${basics.email}`);
  }

  if (includePhone && basics.phone) {
    lines.push(`TEL;TYPE=CELL,VOICE:${basics.phone}`);
  }

  if (basics.url) {
    lines.push(`URL:${basics.url}`);
  }

  if (basics.location) {
    const city = basics.location.city || "";
    const region = basics.location.region || "";
    const country = basics.location.countryCode || "US";
    lines.push(`ADR;TYPE=WORK:;;;${city};${region};;${country}`);
  }

  if (basics.profiles && basics.profiles.length > 0) {
    for (const profile of basics.profiles) {
      if (profile.url) {
        const net = (profile.network || "social").toLowerCase();
        lines.push(`X-SOCIALPROFILE;type=${net}:${profile.url}`);
      }
    }
  }

  const defaultNote =
    notes ||
    `${name} - ${basics.label || "AI/ML Engineer"}. Portfolio & Voice AI Assistant: ${basics.url || "https://alexandermcintosh.com"}`;
  lines.push(`NOTE:${defaultNote.replace(/\n/g, " ")}`);

  lines.push("END:VCARD");

  return lines.join("\r\n");
}

/**
 * Triggers a client-side .vcf file download using Blob URL.
 */
export function downloadVCard(
  vcardContent: string,
  filename = "Alex_McIntosh.vcf",
): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const blob = new Blob([vcardContent], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
