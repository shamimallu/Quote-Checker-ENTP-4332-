# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this project is

**Quote Checker** — a group project for ENTP 4332 (entp6314). The app lets a user paste in a quote and check it: who actually said it, whether the wording is accurate, and where it originally came from. The repo is currently the Next.js starter; features are still to be built.

## Stack

- Next.js 16 (App Router) with React 19 and TypeScript
- Tailwind CSS v4 (configured via `@import "tailwindcss"` in `src/app/globals.css` — there is no `tailwind.config.js`)
- ESLint 9 flat config (`eslint.config.mjs`) with `eslint-config-next`
- npm as the package manager (commit `package-lock.json`)

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

- `src/app/` — App Router routes. `layout.tsx` is the root layout, `page.tsx` is the home page.
- `public/` — static assets served from `/`.
- Import alias `@/*` maps to `src/*`.

## Conventions

- Put API keys and other secrets in `.env.local`. All `.env*` files are gitignored — never commit them. If the app needs env vars, document their names (not values) here or in the README.
- Server-only secrets must not use the `NEXT_PUBLIC_` prefix; anything with that prefix is shipped to the browser.
- Prefer Server Components by default; add `"use client"` only for components that need state, effects, or browser APIs.
- This is a shared group repo: keep commits focused, and run `npm run lint` and `npm run build` before pushing to `main`.
