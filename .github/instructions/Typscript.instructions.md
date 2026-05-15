---
applyTo: "**/*.tsx"
---

# TypeScript & Astro Coding Instructions

## Project context

This is an **Astro 5** single page application, static site with **React** islands, written in
TypeScript. It lives under `frontend/` in the monorepo.

The frontend is deployed to **GitHub Pages** as a fully static build. There is
no server-side rendering — `output: 'static'` is set in `astro.config.mjs`.
All dynamic behaviour happens client-side via React islands.

Package manager is **pnpm**. Never use `npm` or `yarn` commands.

---

## TypeScript

- **Strict mode is on.** Never disable or loosen `tsconfig.json` strictness to
  fix a type error — fix the type instead.
- Use **TypeScript 5+** features freely: `satisfies`, `const` type parameters,
  variadic tuple types.
- Prefer `type` over `interface` for object shapes unless you need declaration
  merging or `implements`.
- Use `unknown` instead of `any` for values of unknown type, then narrow with
  guards. Never use `any`.
- Use `as` casts only as a last resort and always accompany them with a comment
  explaining why the cast is safe.
- Avoid enums — use `const` objects with `as const` and derive the union type:
  ```ts
  const ConnectionState = {
    Connecting: "connecting",
    Connected: "connected",
    Disconnected: "disconnected",
  } as const;
  type ConnectionState = typeof ConnectionState[keyof typeof ConnectionState];
  ```
- All environment variables must be accessed via `import.meta.env` and declared
  in `src/env.d.ts`. Never access `process.env` in frontend code.

---

## Astro conventions

- **Use `.astro` files for pages and layouts.** Only reach for React (`.tsx`)
  when you need client-side interactivity — static structure, metadata, and
  composition belong in `.astro`.
- **Prefer `client:load` sparingly.** Use `client:visible` for components below
  the fold and `client:idle` for non-critical islands to avoid blocking the
  main thread. Only use `client:load` for components that must be interactive
  immediately (e.g. the demo page).
- Frontmatter in `.astro` files runs at build time only. Never put secrets or
  runtime logic there that you expect to run in the browser.
- Always set `<title>` and `<meta name="description">` in every page via the
  `Base.astro` layout's props — never hardcode them per-page.
- Image optimisation: always use Astro's `<Image />` component from
  `astro:assets` rather than raw `<img>` tags for any image in `src/assets/`.

---

## React islands

- Islands live under `src/components/` (LiveKit/agent UI) or
  `src/components/ui/` (reusable primitives) or `src/components/portfolio/`
  (portfolio-specific interactive components).
- Every React component file is `.tsx`. No `.jsx`.
- Use **function components** exclusively — no class components.
- Props must always have an explicit type alias:
  ```tsx
  type AgentChatProps = {
    roomName: string;
    onDisconnect: () => void;
  };

  export function AgentChat({ roomName, onDisconnect }: AgentChatProps) { ... }
  ```
- Do not use `React.FC` or `React.FunctionComponent` — annotate props directly
  as above.
- Export components as **named exports**, not default exports, except for
  Astro pages which require a default export.

---

## Hooks

- Custom hooks live in `src/hooks/` and are prefixed with `use`.
- A hook that wraps a LiveKit or agent concern should own all the state and
  side effects for that concern — components should be as stateless as possible.
- Always clean up subscriptions and event listeners in the `useEffect` return
  function.
- Prefer `useReducer` over multiple `useState` calls when a component or hook
  manages more than two related pieces of state.

---

## API & environment

- All backend calls go through the typed wrapper in `src/lib/api.ts`. Never
  call `fetch` directly in components or hooks.
- The base URL is always read from `import.meta.env.PUBLIC_API_URL`. Astro
  exposes only `PUBLIC_`-prefixed variables to the client — never prefix
  secrets with `PUBLIC_`.
- `src/lib/livekit.ts` wraps the LiveKit client SDK. Components and hooks
  import from there, not directly from `livekit-client`.
- Handle all API errors explicitly — never let a failed fetch silently return
  `undefined`. Surface errors to the user via component state.

---

## Styling

- Use **CSS custom properties** defined in `src/styles/tokens.css` for all
  colours, spacing, and typography values. Never hardcode hex values or pixel
  sizes in component styles.
- Scope component styles with CSS Modules (`.module.css`) or Astro's scoped
  `<style>` blocks. Never use global class names in component files.
- Do not use a CSS-in-JS library — keep styles in `.css` files or Astro
  `<style>` blocks.

---

## Linting & formatting

- **Biome** handles linting and formatting for all `.ts` and `.tsx` files.
  **Prettier** with `prettier-plugin-astro` handles `.astro` files.
- Run `pnpm lint` before committing. CI will fail on lint errors.
- Do not add `// biome-ignore` suppressions without an inline comment explaining
  why.
- Biome enforces double quotes, 2-space indent, trailing commas, and
  semicolons. Do not override these per-file.

---

## Testing

- Unit tests use **Vitest** (configured in `astro.config.mjs` via
  `@astrojs/vitest`).
- Test files live alongside the code they test as `*.test.ts` or `*.test.tsx`.
- Use `@testing-library/react` for component tests. Do not test implementation
  details — test behaviour from the user's perspective.
- Mock `src/lib/api.ts` at the module level in tests that involve backend calls
  — never make real network requests in tests.
- LiveKit SDK calls should be mocked via `vi.mock('src/lib/livekit')`.

---

## Performance

- Never use `import()` for any large dependency that isn't needed on initial
  render.
