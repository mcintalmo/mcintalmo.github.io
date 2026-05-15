# Alexander McIntosh – Portfolio & Resume Generator

Modern, accessible portfolio site built with **Astro + React + TypeScript + Tailwind**, featuring an automated **YAML → LaTeX / PDF / HTML** resume pipeline.

## Features

- Astro static site with React islands & framer‑motion animations (respecting reduced‑motion)
- Central content config: `src/content/resume.yaml` + `src/content/site.config.yaml`
- Resume generator (`tools/pdf_generator/generate-resume.ts`) produces:
  - LaTeX (`tools/pdf_generator/output/resume.tex`)
  - HTML preview (`tools/pdf_generator/output/resume.html`)
  - Public PDF (`public/downloads/<Name>_Resume.pdf`)
- Structured data (JSON‑LD), dynamic `robots.txt`, sitemap generation
- Theming (system / light / dark) with persistent preference
- Accessible components (headings order, aria labels, keyboard support)
- Linting (ESLint flat config), formatting (Prettier + astro plugin), basic tests (Vitest)
- CI-ready build (resume generated before Astro build)

## Key Structure

```text
astro.config.mjs
tools/pdf_generator/
 generate-resume.ts         # CLI to build LaTeX/HTML/PDF
 pdf.config.yaml            # (optional) PDF layout overrides
 templates/resume_template.tex      # LaTeX template
 output/                    # Generated artifacts
src/
 content/
  resume.yaml              # Primary resume data (JSON Resume flavor)
  site.config.yaml         # Site + section settings
 components/                # React UI + sections
 layouts/Layout.astro       # Base document + SEO + JSON-LD
 pages/index.astro          # Home page (mounts React sections)
 pages/robots.txt.ts        # Dynamic robots route
public/downloads/            # Exposed PDF resume
```

## Tech Stack

| Layer        | Choice |
|--------------|--------|
| Framework    | Astro + React 19 |
| Styling      | Tailwind CSS |
| Animations   | framer-motion |
| Forms (current) | mailto fallback (no backend) |
| Resume schema | JSON Resume–inspired YAML + AJV validation |
| PDF Toolchain | Pandoc (HTML/PDF fallback) + XeLaTeX (preferred) |
| Testing       | Vitest |

## Getting Started

```sh
pnpm install
pnpm dev            # http://localhost:4321
```

Build (generates resume then site):

```sh
pnpm build          # outputs dist/ and updates public/downloads/*.pdf
pnpm preview        # serve production build locally
```

## Agent Models & Hardware Acceleration (Ollama)
The system leverages a LiteLLM Proxy routing architecture (port `4000`) within `docker-compose.yml` to supply standardized completions to the backend agents.
However, because Docker for Mac cannot currently passthrough Apple Silicon GPU acceleration to Linux containers, **containerized Ollama instances are strictly CPU-bound**. 

To leverage native hardware acceleration for faster LLM inference:

### Mac M-Series (Local Development)
1. Install [Ollama for Mac natively](https://ollama.com/download/mac).
2. Open a terminal and run `ollama run phi3:mini` (an efficient 3.8B model fitting cleanly in 8GB Unified Memory).
3. The LiteLLM Proxy is already configured to route traffic out of the Docker bridge to `http://host.docker.internal:11434` targeting your Host machine's native Metal GPU.

### Oracle Cloud Infrastructure (Staging / Production OCI)
Unlike Docker Desktop on Mac, **Native Linux hosts (OCI instances)** *can* utilize hardware acceleration (CUDA/ROCm) fully within containers using the `--gpus all` or `deploy.resources.reservations.devices` Docker Compose properties.
If deploying to a 12GB+ RAM OCI VM:
1. Re-enable the `ollama` container in `docker-compose.yml` to bundle the application.
2. Consider scaling up the configured model parameter in `litellm_config.yaml` to `mistral-nemo` or `llama3.1:8b` for a stronger reasoning frontier!

## Resume Generation

`pnpm build` implicitly runs the generator. To run it alone:

```sh
pnpm tsx tools/pdf_generator/generate-resume.ts
```

Outputs appear in `tools/pdf_generator/output/` and the PDF is copied to `public/downloads/` for the site.

Customize layout & limits via `tools/pdf_generator/pdf.config.yaml` (optional) and per‑section flags in `site.config.yaml`.

## Editing Content

1. Update `src/content/resume.yaml` (basics, work, education, projects, skills, certificates, etc.)
2. Adjust section visibility / titles / ordering in `src/content/site.config.yaml`.
3. Re-run `pnpm build` to refresh artifacts.

## Deployment

### GitHub Pages

Use `astro build --site https://user.github.io` (already supported). Provide `SITE_URL` in workflow env to keep canonical URLs correct.

## Contact Form

Currently a `mailto:` based submission (no server). For real submissions pick one:

- Formspree / Web3Forms endpoint
- Cloudflare Pages Function (`functions/api/contact.ts`) + email API

After choosing, replace the form handler in `ContactSection.tsx`.

## Tests & Lint

```sh
pnpm test           # Vitest (basic generator tests)
pnpm lint           # ESLint (flat config)
```

## Accessibility / Performance Tips

- Ensure images use appropriate `alt` text (profile already provided)
- Reduced-motion respected via `useReducedMotion`
- Future improvement: responsive image variants for profile / hero background

## Roadmap / Nice-to-Haves

- Real contact endpoint + spam protection (honeypot + minimal rate limit)
- Add analytics script
- Responsive image optimization (srcset)
- 404 page (`src/pages/404.astro`)
- More tests (LaTeX snapshot, section ordering)
