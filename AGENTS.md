<!-- BEGIN:nextjs-agent-rules -->

# Project Guidelines

## Critical Notes

- This is NOT the Next.js you know. This version has breaking changes; APIs, conventions, and file structure may differ. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code.

## Build and Test

- Dev server: `npm run dev`
- Build: `npm run build`
- Start: `npm run start`
- Lint: `npm run lint`

## Architecture

- App Router in `src/app/` with a root layout that wraps `WalletProvider`, `Navbar`, and `Sidebar`.
- UI components live in `src/components/`.
- Business logic is grouped in `src/services/`.
- Shared types are in `src/types/index.ts`.

## Conventions

- Skeuomorphic UI uses `neu-*` utility classes defined in `src/app/globals.css`.
- Fonts are loaded with `next/font` (Fraunces, Manrope, JetBrains Mono) in `src/app/layout.tsx`.
- Use Client Components (`"use client"`) for interactive UI and wallet logic.
- Path alias `@/*` maps to `src/*`.

<!-- END:nextjs-agent-rules -->
