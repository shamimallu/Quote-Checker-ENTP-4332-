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

The home page, Quote Checker (with job management: create, status, share, delete), and Warranty Vault are built and save to Supabase. Job Files, Proof Log and Muse have database tables but no screens yet; their pages are placeholders.

## Stack

- Next.js 16 (App Router) with React 19 and TypeScript
- Tailwind CSS v4 (configured via `@import "tailwindcss"` in `src/app/globals.css` — there is no `tailwind.config.js`)
- ESLint 9 flat config (`eslint.config.mjs`) with `eslint-config-next`
- npm as the package manager (commit `package-lock.json`)
- `@anthropic-ai/sdk` — used by the Quote Checker's two API routes
  (`src/app/api/extract-quote`, `src/app/api/compare-quotes`) to read
  uploaded quote files and compare them. Requires an `ANTHROPIC_API_KEY` in
  `.env.local` (not committed — get a key at console.anthropic.com).
- Supabase (`@supabase/supabase-js`, `@supabase/ssr`) — Postgres database, email/password
  sign-in, and file storage. Needs `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local` (both safe to expose: the
  publishable key can only do what row level security allows). Never put the secret /
  service-role key in a `NEXT_PUBLIC_` variable.
  - `supabase/schema.sql` is the whole database: tables, row level security, the
    `share_job` function, and the private `homi-files` storage bucket. To change the
    database, edit this file and re-run it in the Supabase SQL Editor (it is safe to run
    more than once). New tables need an explicit `grant ... to authenticated` — this
    project does not grant table access automatically — plus RLS policies.
  - Data model: everything hangs off **jobs** (status: getting quotes, hired, in
    progress, done). A job has `quotes` (with the Quote Checker's comparison saved in
    `analysis`), `job_files`, `proof_log_entries`, and `warranties`. `job_members`
    shares a job with another account as an editor or viewer. `muse_conversations` /
    `muse_messages` are private to each person. `profiles` is created on sign-up.
  - Delete rules: deleting a job deletes its quotes, files and proof log, but only
    unlinks its warranties (`job_id` becomes null); the app asks whether to keep them.
    Deleting an account deletes everything that person owns. Uploaded files are not
    removed by the database — the app deletes them first (storage rules look up the
    job or warranty, so files must go before the row).
  - Files live in `homi-files` under `jobs/<job id>/…` or `warranties/<warranty id>/…`;
    storage policies give the same access as that job or warranty.
  - Client code: `src/lib/supabase/` (browser and server clients, session proxy,
    `currentUserId`), `src/lib/*-storage.ts` (one per table group), `src/proxy.ts`
    (sends signed-out visitors to `/login`). A blocked update/delete returns no error
    and zero rows, so storage functions use `.select()` and check the count.

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
- `src/components/` — shared components (`SectionIcon`, `ComingSoon`, `AuthStatus`, `MuseButton`) and each section's UI.
- Jobs: `src/lib/job-types.ts`, `src/lib/job-storage.ts`, and `src/components/JobBar.tsx` (the job picker at the top of the Quote Checker).
- Quote Checker: `src/lib/quote-types.ts`, `src/lib/quote-storage.ts`, and `src/components/Quote*.tsx`.
- Warranty Vault: `src/lib/warranty-types.ts` (the warranty shape, end-date and status rules — "ending soon" is within `ENDING_SOON_DAYS` = 60), `src/lib/warranty-storage.ts` (saves to the `warranties` table and the `homi-files` bucket), and `src/components/Warranty*.tsx`.
- `public/` — static assets served from `/`.

## Design

Dark, warm, neutral palette defined as Tailwind colors in `src/app/globals.css`: `espresso` (page background), `bark` (surfaces), `walnut` (borders), `cocoa`, `caramel` (accent), `sand` (muted text), `beige` (main text). Use these tokens rather than raw hex values. Headings and the "homi" wordmark use the serif font (`font-serif`, Fraunces); body text uses `font-sans` (Geist).
- Import alias `@/*` maps to `src/*`.

## Conventions

- Put API keys and other secrets in `.env.local`. All `.env*` files are gitignored — never commit them. If the app needs env vars, document their names (not values) here or in the README.
- Server-only secrets must not use the `NEXT_PUBLIC_` prefix; anything with that prefix is shipped to the browser.
- Prefer Server Components by default; add `"use client"` only for components that need state, effects, or browser APIs.
- This is a shared group repo: keep commits focused, and run `npm run lint` and `npm run build` before pushing to `main`.
