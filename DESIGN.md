# homi Design System

The official design system for homi. Read this before implementing or modifying any UI.

## Brand personality

- Sophisticated
- Welcoming
- Trustworthy

## Design direction

- Premium, warm, minimalist aesthetic
- Dark mode only — no light-mode theme
- Soft, rounded components
- Elegant typography
- Subtle contrast between backgrounds and surfaces
- Consistent styling throughout the app

## Source of truth

[`src/app/globals.css`](src/app/globals.css) is the single source of truth for actual token
values (hex codes, font stacks, radius). This document explains what the tokens mean and
when to use them — if the two ever disagree, globals.css wins and this file should be
updated to match.

## Official color palette

### Backgrounds and surfaces

| Name | Hex | Use |
|---|---|---|
| Espresso | `#28190E` | Main app background |
| Dark Cocoa | `#30251F` | Sidebar, panels, elevated surfaces |
| Mocha | `#403027` | Cards, hover states, secondary surfaces |

### Brand colors

| Name | Hex | Use |
|---|---|---|
| Champagne | `#D6BFA5` | Primary buttons, selected navigation, highlights |
| Warm Cream | `#F0E5D5` | Main text, headings, icons |
| Taupe | `#A99683` | Secondary text, descriptions, muted labels |
| Soft Linen | `#E6D8CA` | Light surfaces and selected elements |
| Cedar | `#7A543D` | Supporting accents and tags |

### Status colors

| Name | Hex | Use |
|---|---|---|
| Sage | `#829078` | Success, completed, active statuses |
| Terracotta Red | `#B86B62` | Errors, expired warranties, destructive actions, negative statuses |
| Antique Gold | `#B79A65` | Warnings, due-soon tasks, upcoming deadlines |

Do not substitute these for similar-looking Tailwind default colors — use the named tokens
(or the semantic tokens built from them) below.

## Semantic tokens

Defined in `globals.css` under `@theme inline`, built from the named colors above:

| Token | Mapped to | Use |
|---|---|---|
| `--background` / `--foreground` | Espresso / Warm Cream | Page background and default text |
| `--primary` / `--primary-foreground` | Champagne / Espresso | Primary buttons, active nav, highlights |
| `--secondary` / `--secondary-foreground` | Dark Cocoa / Warm Cream | Secondary surfaces and their text |
| `--accent` / `--accent-foreground` | Cedar / Warm Cream | Supporting accents, tags |
| `--muted` / `--muted-foreground` | Mocha / Taupe | Muted labels, secondary text |
| `--card` / `--card-foreground` | Mocha / Warm Cream | Card surfaces and their text |
| `--border` | Mocha | Borders and dividers |
| `--destructive` / `--destructive-foreground` | Terracotta Red / Warm Cream | Errors, expired, destructive actions |
| `--success` / `--success-foreground` | Sage / Espresso | Success, completed, active statuses |
| `--warning` / `--warning-foreground` | Antique Gold / Espresso | Warnings, due-soon, upcoming deadlines |
| `--radius` | `0.75rem` | Default border radius |

Use these semantic tokens (via Tailwind utilities like `bg-primary`, `text-muted-foreground`,
`border-border`) for new UI rather than reaching for a named color directly — they describe
*role*, which stays correct even if the underlying palette changes later.

## Legacy tokens (pending migration)

Before this design system, the app used a different palette under these Tailwind utility
names. They still work — their values now point at the closest official color below — but
new UI should use the official named or semantic tokens instead. These are kept only so
existing components (308+ usages across the app) don't break; migrating them away is
Phase 2 work, not part of this change.

| Legacy utility | Old hex | Now resolves to |
|---|---|---|
| `espresso` | `#1c1714` | Espresso `#28190E` |
| `bark` | `#261f1a` | Dark Cocoa `#30251F` |
| `walnut` | `#3d3029` | Mocha `#403027` |
| `cocoa` | `#5a4536` | Cedar `#7A543D` |
| `caramel` | `#c29a6b` | Champagne `#D6BFA5` |
| `sand` | `#b8a68f` | Taupe `#A99683` |
| `beige` | `#ece1cf` | Warm Cream `#F0E5D5` |

## Typography

| Font | Use |
|---|---|
| **DM Serif Display** | homi logo, page titles, major headings, section headings |
| **Gabarito** | Body text, navigation, buttons, inputs/forms, labels, descriptions, status badges |

Loaded via `next/font/google` in `src/app/layout.tsx`, exposed as CSS variables, and mapped
to `--font-heading` (DM Serif Display) and `--font-body` (Gabarito) in `globals.css`. Use the
Tailwind utilities `font-heading` / `font-body` in new UI.

Default body font size: **16px**.

## Border radius

Default radius is `0.75rem`, held in `--radius`. Soft, rounded components are part of the
brand's warm, premium feel — avoid sharp corners on cards, buttons, and inputs.

## Dark mode only

homi does not have a light-mode theme. Do not add one unless explicitly instructed.
