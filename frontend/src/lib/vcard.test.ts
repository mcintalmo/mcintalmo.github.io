import { describe, expect, it } from "vitest";
import type { ResumeBasics } from "./types";
import { generateVCard } from "./vcard";

describe("generateVCard", () => {
  const sampleBasics: ResumeBasics = {
    name: "Alex McIntosh",
    label: "Data Scientist & AI/ML Engineer",
    email: "mcintalmo@gmail.com",
    phone: "612-555-0199",
    url: "https://www.alexandermcintosh.com",
    location: {
      city: "Minneapolis",
      region: "MN",
      countryCode: "US",
    },
    profiles: [
      {
        network: "LinkedIn",
        username: "mcintalmo",
        url: "https://linkedin.com/in/mcintalmo",
      },
      {
        network: "GitHub",
        username: "mcintalmo",
        url: "https://github.com/mcintalmo",
      },
    ],
  };

  it("formats vCard with correct headers, name, and organization", () => {
    const vcard = generateVCard(sampleBasics);

    expect(vcard).toContain("BEGIN:VCARD\r\n");
    expect(vcard).toContain("VERSION:3.0\r\n");
    expect(vcard).toContain("FN:Alex McIntosh\r\n");
    expect(vcard).toContain("N:McIntosh;Alex;;;\r\n");
    expect(vcard).toContain("TITLE:Data Scientist & AI/ML Engineer\r\n");
    expect(vcard).toContain("ORG:Pioneer Management Consulting\r\n");
    expect(vcard).toContain("EMAIL;TYPE=INTERNET,PREF:mcintalmo@gmail.com\r\n");
    expect(vcard).toContain("URL:https://www.alexandermcintosh.com\r\n");
    expect(vcard).toContain("ADR;TYPE=WORK:;;;Minneapolis;MN;;US\r\n");
    expect(vcard).toContain("END:VCARD");
  });

  it("omits phone number by default for privacy", () => {
    const vcard = generateVCard(sampleBasics);
    expect(vcard).not.toContain("TEL;");
    expect(vcard).not.toContain("612-555-0199");
  });

  it("includes phone number when explicitly requested", () => {
    const vcard = generateVCard(sampleBasics, { includePhone: true });
    expect(vcard).toContain("TEL;TYPE=CELL,VOICE:612-555-0199\r\n");
  });

  it("includes social profile URLs", () => {
    const vcard = generateVCard(sampleBasics);
    expect(vcard).toContain(
      "X-SOCIALPROFILE;type=linkedin:https://linkedin.com/in/mcintalmo\r\n",
    );
    expect(vcard).toContain(
      "X-SOCIALPROFILE;type=github:https://github.com/mcintalmo\r\n",
    );
  });

  it("handles minimal basics gracefully without throwing", () => {
    const minimalBasics: ResumeBasics = {};
    const vcard = generateVCard(minimalBasics);

    expect(vcard).toContain("BEGIN:VCARD\r\n");
    expect(vcard).toContain("FN:Alex McIntosh\r\n");
    expect(vcard).toContain("END:VCARD");
  });
});
