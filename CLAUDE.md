# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sanjivan Medico Traders (SMT) Dashboard — a full-stack enterprise logistics and inventory management system for medical distribution. Built with Next.js 15 App Router, TypeScript, MongoDB (via Prisma), and deployed with Docker/Vercel.

## Commands

```bash
# Development
npm run dev              # Start dev server on port 3000
npm run dev:turbo        # Dev with Turbopack (faster)
make run                 # Kill port 3000 + start dev with Turbopack

# Build & Production
npm run build            # Production build (standalone output)
npm run start            # Start production server

# Lint & Format
npm run lint             # ESLint via next lint

# Database
npx prisma generate      # Generate Prisma client (also runs on postinstall)
npx prisma db push       # Push schema changes to MongoDB
```

## Architecture

### Stack
- **Framework**: Next.js 15.1.3 (App Router) with React 19
- **Database**: MongoDB via Prisma ORM (schema at `prisma/schema.prisma`)
- **Auth**: NextAuth.js 4 with JWT strategy + credentials provider (`lib/auth.ts`)
- **State**: Zustand stores per feature domain (`store/use*Store.ts`)
- **UI**: Shadcn/Radix components (`components/ui/`), Tailwind CSS with dark mode
- **File Storage**: AWS S3 (`lib/s3.ts`)
- **Timezone**: All dates use Asia/Kolkata via moment-timezone

### Layout & Routing
- `app/(dashboard)/layout.tsx` — protected dashboard layout with sidebar, role-filtered navigation
- `app/(dashboard)/[module]/page.tsx` — feature pages (invoice, delivery, receipt, etc.)
- `app/api/[domain]/route.ts` — RESTful API route handlers
- `middleware.ts` — NextAuth route protection on all dashboard paths
- `app/login/` and `app/contact-form/` — public routes

### Key Patterns

**API routes** follow a consistent pattern:
- Auth check via `getServerSession(authOptions)`
- Response shape: `{ success, data, message }` or `{ data }`
- Pagination with `limit` and `page` query params
- Date filtering with moment-timezone (Asia/Kolkata)

**Zustand stores** (`store/use*Store.ts`): one per feature domain (15 total). Each store encapsulates API calls, loading/error states, and pagination. Named `use[Feature]Store`.

**Invoice workflow** is multi-stage: create → check → pack → pickup → deliver → bill. Each stage has its own store, API endpoints, and status enums.

### Role-Based Access

Users have a `UserType` (ADMIN, USER) and multiple `Department` assignments (RECEIPT_MANAGEMENT, INVOICE_MANAGEMENT, PURCHASE_MANAGEMENT, ATTENDANCE_MANAGEMENT, DELIVERY_MEMO_MANAGEMENT, ALL_ROUNDER). Dashboard navigation and feature access are filtered by these. Role definitions and sidebar structure live in `lib/constants/dashboardData.ts`.

### Key Files
- `prisma/schema.prisma` — all data models and enums (620+ lines)
- `lib/auth.ts` — NextAuth config with session token validation
- `lib/constants/dashboardData.ts` — dashboard structure, role permissions, sidebar items
- `lib/prisma.ts` — Prisma client singleton
- `lib/s3.ts` — S3 upload utilities
- `components/ui/` — Shadcn component library

## Conventions

- **Prettier**: single quotes, 2-space indent, trailing comma: none, arrow parens: always (config in `package.json`)
- **Component naming**: PascalCase; files use kebab-case or camelCase
- **Store naming**: `use[Feature]Store` pattern
- **API auth guard**: every protected endpoint calls `getServerSession(authOptions)` and returns 401 if missing
- **Enums** use UPPER_SNAKE_CASE (defined in Prisma schema)

## Environment Variables

Required (see `.env.example`):
- `MONGODB_URI`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `SEED_PASSWORD`
- `S3_ACCESS_KEY`, `S3_SECRET_ACCESS_KEY`, `S3_REGION`, `S3_BUCKET_NAME`
- `NEXT_PUBLIC_S3_REGION`, `NEXT_PUBLIC_S3_BASE_URL`, `NEXT_PUBLIC_S3_BUCKET`
