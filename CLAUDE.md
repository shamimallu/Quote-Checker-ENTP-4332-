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

All four sections and the home page are built and save to Supabase.

## Stack

- Next.js 16 (App Router) with React 19 and TypeScript
- Tailwind CSS v4 (configured via `@import "tailwindcss"` in `src/app/globals.css` — there is no `tailwind.config.js`)
- ESLint 9 flat config (`eslint.config.mjs`) with `eslint-config-next`
- npm as the package manager (commit `package-lock.json`)
- `@anthropic-ai/sdk` — used by the Quote Checker's two API routes
  (`src/app/api/extract-quote`, `src/app/api/compare-quotes`) to read
  uploaded quote files and compare them. Requires an `ANTHROPIC_API_KEY` in
  `.env.local` (not committed — get a key at console.anthropic.com).
- `@google/genai` — optional Google Gemini support for the same two routes
  (`src/lib/gemini.ts`). Off by default; set `AI_PROVIDER=gemini` and a
  `GEMINI_API_KEY` in `.env.local` (get a key at aistudio.google.com/apikey)
  to use it instead of Claude. Optional `GEMINI_MODEL` picks the model
  (defaults to `gemini-3.5-flash`). There is deliberately no automatic fallback to Claude
  (the group chose not to pay for the Claude API). `getGeminiProblem` in `src/lib/gemini.ts`
  tells a per-minute limit, the daily limit, a model with no free quota, and "busy" apart from
  Google's error, so people see which one happened and the server log says the exact reason.
  The "Ask Gemini" chat button (`src/components/GeminiButton.tsx`, on the home page and
  Quote Checker) calls `src/app/api/ask-gemini` and only needs `GEMINI_API_KEY`. Chats
  are saved per person in `muse_conversations` / `muse_messages` (`src/lib/chat-storage.ts`);
  the newest conversation reopens on sign-in, "New chat" starts another, "History" lists
  past conversations to reopen or delete, and signing out clears the panel. Quotes and
  chats go to Gemini's free tier; the group accepted that while it's a class project with
  no real users — revisit before real people use it.
  Gemini's free tier allows about 5 requests per minute per model.
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
    progress, done; plus address, description, permit, the picked `contractor_id`, and the
    accepted quote's numbers copied into `baseline_*`). A job has `quotes` (with the Quote
    Checker's comparison saved in `analysis`), `job_files`, `job_payments`,
    `job_change_orders`, `proof_log_entries`, and `warranties`. `contractors` is each
    person's own list; a database trigger only lets you put your own contractor on a job. `job_members`
    shares a job with another account as an editor or viewer. `muse_conversations` /
    `muse_messages` hold the Ask Gemini chat history, private to each person. `profiles` is created on sign-up.
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

- Vercel Web Analytics (`@vercel/analytics`) — `<Analytics />` from `@vercel/analytics/next`
  is the last child of `<body>` in `src/app/layout.tsx`. It counts page views on the deployed
  site only (nothing in local dev) and is viewed under the project's Analytics tab in Vercel
  (Hobby plan: 50,000 events/month, no custom events). No third-party cookies; Vercel identifies visitors
  by a hash of the request that is discarded after 24 hours. On Vercel the script and its
  page-view requests use a random per-project path (like `/f8c69566d99462bf/script.js` and
  `.../view`) that Vercel handles before `src/proxy.ts` runs, so signed-out visits are counted
  without any proxy change. The proxy matcher also skips `_vercel`, which covers the older
  `/_vercel/insights/*` path the package falls back to.

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
- `src/components/` — shared components (`SectionIcon`, `ComingSoon`, `AuthStatus`, `GeminiButton`) and each section's UI.
- Jobs: `src/lib/job-types.ts`, `src/lib/job-storage.ts`, `src/lib/use-jobs.ts` (loads jobs and remembers the selected one, shared by Quote Checker, Job Files and Proof Log), and `src/components/JobBar.tsx` (the job picker, create/status/share/delete).
- Job Files (`/job-files`): a neutral record of one repair job. `src/components/JobFilesApp.tsx` loads the job's record; one component per section in `src/components/job-files/` (alerts, details + permit, contractor, accepted quote, money, files). Storage: `contractor-storage.ts` (the homeowner's reusable contractor list; bring-your-own, never lead fees), `job-baseline.ts` (accepting a quote copies its total, deposit and warranty terms onto the job), `job-ledger-storage.ts` (payments, change orders), `job-file-storage.ts` (uploads to `homi-files` under `jobs/<id>/files/`). `src/lib/job-alerts.ts` computes the alerts in plain code, no AI: deposit over 30% of the quote, change orders raising the price, paid more than quote + change orders, no permit recorded once hired, no warranty, no contract once hired.
- Proof Log (`/proof-log`): a dated record of the work on a job, with optional photos. `src/components/ProofLogApp.tsx` loads the selected job's entries; the form and list are in `src/components/proof-log/`. Storage: `src/lib/proof-log-types.ts` and `src/lib/proof-log-storage.ts` (rows in `proof_log_entries`, photos in `homi-files` under `jobs/<id>/proof-log/<entry id>/`, 10MB per photo; deleting an entry removes its photos first).
- Quote Checker: `src/lib/quote-types.ts`, `src/lib/quote-storage.ts`, and `src/components/Quote*.tsx`.
- Warranty Vault: `src/lib/warranty-types.ts` (the warranty shape, end-date and status rules — "ending soon" is within `ENDING_SOON_DAYS` = 60), `src/lib/warranty-storage.ts` (saves to the `warranties` table and the `homi-files` bucket), and `src/components/Warranty*.tsx`.
- `public/` — static assets served from `/`.

## Design

homi has an official design system — read [`DESIGN.md`](DESIGN.md) before implementing or
modifying any UI. In short:

- Treat `src/app/globals.css` as the single source of truth for actual color, typography, and
  radius token values — `DESIGN.md` explains what they mean, globals.css has the real values.
- Keep using Tailwind CSS v4 (`@theme inline` in globals.css); don't introduce another styling
  framework or hardcode colors/font families in individual components.
- Use the official named colors (Espresso, Dark Cocoa, Mocha, Champagne, Warm Cream, Taupe,
  Soft Linen, Cedar, Sage, Terracotta Red, Antique Gold) or the semantic tokens built from them
  (`bg-primary`, `text-muted-foreground`, `border-border`, `bg-destructive`, etc.) for new UI.
  Some older components still use legacy utility names (`espresso`, `bark`, `walnut`, `cocoa`,
  `caramel`, `sand`, `beige`); these still work but are documented as pending migration in
  `DESIGN.md` — don't carry them into new UI.
- Headings, the "homi" wordmark, and page titles use `font-heading` (DM Serif Display, also
  aliased as `font-serif`); everything else uses `font-body` (Gabarito, also aliased as
  `font-sans`, and the default body font).
- Default border radius is `0.75rem` (`--radius`). Soft, rounded components are part of the brand.
- homi is dark-mode only — don't add a light theme unless explicitly instructed.
- Import alias `@/*` maps to `src/*`.

## Conventions

- Put API keys and other secrets in `.env.local`. All `.env*` files are gitignored — never commit them. If the app needs env vars, document their names (not values) here or in the README.
- Server-only secrets must not use the `NEXT_PUBLIC_` prefix; anything with that prefix is shipped to the browser.
- Prefer Server Components by default; add `"use client"` only for components that need state, effects, or browser APIs.
- This is a shared group repo: keep commits focused, and run `npm run lint` and `npm run build` before pushing to `main`.
