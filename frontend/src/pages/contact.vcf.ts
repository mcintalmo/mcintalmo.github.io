import type { APIRoute } from "astro";
import { loadAll } from "../lib/data";
import { generateVCard } from "../lib/vcard";

export const GET: APIRoute = async () => {
  const { resume } = loadAll();
  const vcard = generateVCard(resume.basics || {});

  return new Response(vcard, {
    status: 200,
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": 'inline; filename="Alex_McIntosh.vcf"',
      "Cache-Control": "public, max-age=86400",
    },
  });
};
