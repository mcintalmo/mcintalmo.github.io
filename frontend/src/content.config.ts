import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";

const tailored = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/tailored" }),
});

export const collections = { tailored };
