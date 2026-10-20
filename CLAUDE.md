# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this project is

**homi** is a group project for ENTP 4332 (entp6314). It helps homeowners understand a repair quote before agreeing to the work. It checks price context, missing scope items, quote differences, deposit terms, and warranty language. Then it helps the homeowner request comparable bids and keep a reliable record of the job.

The app has four sections, linked from the home page:

- **Quote Checker** (`/quote-checker`): analyze a contractor's repair quote
- **Job Files** (`/job-files`): keep the documents for each job together
- **Warranty Vault** (`/warranty-vault`): store and review warranty terms
- **Proof Log** (`/proof-log`): keep a reliable record of the work

The home page, Quote Checker, and Warranty Vault are built. Job Files and Proof Log are still placeholder "coming soon" pages.

## Stack

- Next.js 16 (App Router) with React 19 and TypeScript
- Tailwind CSS v4 (configured via `@import "tailwindcss"` in `src/app/globals.css` — there is no `tailwind.config.js`)
- ESLint 9 flat config (`eslint.config.mjs`) with `eslint-config-next`
- npm as the package manager (commit `package-lock.json`)
- `@anthropic-ai/sdk` — used by the Quote Checker's two API routes
  (`src/app/api/extract-quote`, `src/app/api/compare-quotes`) to read
  uploaded quote files and compare them. Requires an `ANTHROPIC_API_KEY` in
  `.env.local` (not committed — get a key at console.anthropic.com).

Next.js 16 has breaking changes versus older versions. Before writing framework code, check the bundled docs in `node_modules/next/dist/docs/` rather than relying on memory (see `AGENTS.md`).

## Commands

```bash
npm install      # install dependencies
npm run dev      # start dev server at http://localhost:3000
npm run build    # production build (also type-checks)
npm run lint     # run ESLint
```

There is no test runner configured yet.

## Layout

- `src/app/` — App Router routes. `layout.tsx` is the root layout (fonts, metadata), `page.tsx` is the home page, and each section has its own folder (e.g. `src/app/quote-checker/page.tsx`).
- `src/lib/sections.ts` — the single list of app sections (title, route, icon). The home page and placeholders read from it, so add or rename sections here.
- `src/components/` — shared components (`SectionIcon`, `ComingSoon`) and each section's UI.
- Warranty Vault: `src/lib/warranty-types.ts` (the warranty shape, end-date and status rules — "ending soon" is within `ENDING_SOON_DAYS` = 60), `src/lib/warranty-storage.ts` (saves warranties and their attached PDFs/photos in the browser's IndexedDB, not localStorage, because files are too big for localStorage; no library), and `src/components/Warranty*.tsx`. Nothing is sent to a server.
- `public/` — static assets served from `/`.

## Design

Dark, warm, neutral palette defined as Tailwind colors in `src/app/globals.css`: `espresso` (page background), `bark` (surfaces), `walnut` (borders), `cocoa`, `caramel` (accent), `sand` (muted text), `beige` (main text). Use these tokens rather than raw hex values. Headings and the "homi" wordmark use the serif font (`font-serif`, Fraunces); body text uses `font-sans` (Geist).
- Import alias `@/*` maps to `src/*`.

## Conventions

- Put API keys and other secrets in `.env.local`. All `.env*` files are gitignored — never commit them. If the app needs env vars, document their names (not values) here or in the README.
- Server-only secrets must not use the `NEXT_PUBLIC_` prefix; anything with that prefix is shipped to the browser.
- Prefer Server Components by default; add `"use client"` only for components that need state, effects, or browser APIs.
- This is a shared group repo: keep commits focused, and run `npm run lint` and `npm run build` before pushing to `main`.
