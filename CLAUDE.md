# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OOTD is an AI-powered outfit recommendation app. Users upload clothing items and personal photos, and AI generates virtual try-on images and intelligent daily outfit recommendations. Built as a Next.js full-stack MVP.

## Commands

All commands run from the `web/` directory:

```bash
# Development
npm run dev          # Dev server at localhost:3000
npm run build        # Production build
npm run lint         # ESLint

# Database (SQLite via Prisma)
npx prisma db push   # Sync schema changes to dev.db
npx prisma generate  # Regenerate Prisma client types
npx prisma studio    # GUI database browser

# Reset
rm -rf .next && npm run dev              # Clear Next.js cache
rm web/dev.db && npx prisma db push      # Recreate database
```

## Architecture

**Monorepo layout:**
- `web/` — Next.js 16 app (App Router), the entire application
- `docs/` — Product docs (PRD, database spec, deployment guide, etc.)

**Key directories inside `web/`:**
- `app/` — Pages and API routes (App Router)
- `lib/` — Core utilities: LLM abstraction, AI wrappers, weather, prompts
- `lib/prompts/` — All AI prompt templates (matching, scoring, tryon, recognition, remove-bg)
- `prisma/schema.prisma` — Data models (Item, PersonImage, Outfit, DailyRecommendation, WeatherCache)
- `public/uploads/` — User-uploaded and AI-generated images (items, persons, outfits)

**Tech stack:** Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 + Prisma 7 + SQLite

## AI Integration

All AI features use Alibaba Cloud's DashScope (Qwen models):
- **`qwen-image-2.0-pro`** — Virtual try-on image generation
- **`qwen-image-edit`** — Background removal for clothing items
- **`qwen-vl-max`** — Multi-modal outfit scoring (5D radar: color harmony, style cohesion, trendiness, practicality, creativity) and item recognition
- **`qwen-max`** — Text-based outfit combination suggestions

LLM provider is switchable via `LLM_PROVIDER` env var: `dashscope` (prod) or `openai-compat` (dev). The abstraction lives in `lib/llm.ts`.

## Core Pipelines

1. **Item Upload:** image → background removal (`remove-bg.ts`) → AI auto-classification (`qwen-vl-max`) → save with metadata
2. **Virtual Try-On:** person + top + bottom → check cache (unique constraint on combo) → generate via `qwen-image-2.0-pro` → store result
3. **Daily Recommendations (SSE):** fetch weather → get wardrobe items → LLM suggests 5 combos → batch try-on generation → AI scoring → store top 3 → stream progress via SSE

## Data Models

Key entities in `prisma/schema.prisma`:
- **Item** — Clothing piece with category (TOP/BOTTOM/OUTERWEAR/ONEPIECE/SHOES/ACCESSORY), color, style, season, occasion, material, fit, pattern, thickness
- **PersonImage** — User portrait photos (one marked as default)
- **Outfit** — Generated try-on result, cached by `(personImageId, topItemId, bottomItemId)` unique constraint, with optional 5D score and HTML evaluation
- **DailyRecommendation** — Top 3 outfits per date with rank and reason
- **WeatherCache** — Hourly weather data cached by `(locationId, hourKey)`, 30-day TTL

## Environment Variables

See `web/.env.example`. Required keys:
- `DASHSCOPE_API_KEY` — Alibaba Cloud Bailian API key (for all AI features)
- `QWEATHER_API_KEY` / `QWEATHER_API_HOST` — Weather integration
- `LLM_PROVIDER` — `dashscope` or `openai-compat`

## Styling Conventions

- Design language: warm pink (#F27C88) + purple tones + cream background (#FFF8F6)
- Glass-morphism cards with backdrop blur
- Font: Plus Jakarta Sans (loaded locally from `public/fonts/`)
- Custom styles in `app/globals.css` alongside Tailwind utilities
- TypeScript path alias: `@/*` maps to `web/` root

## Language

The app UI and AI prompts are in **Chinese (简体中文)**. Code, comments, and variable names are in English.
