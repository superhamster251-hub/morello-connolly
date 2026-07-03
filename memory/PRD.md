# Morello Connolly — Product Requirements

## Original Problem Statement
Build a website for Morello Connolly, a two-person web-design agency based in San Francisco, CA, founded by Ryan Morello (510-631-5990) and Ben Connolly (510-827-3471). Site should let visitors:
- Schedule a call/meeting
- Purchase website packages (one-time)
- Optionally add a monthly maintenance / custom-domain fee ($10-$100/mo)

## User Personas
- **Small business owner** — wants a professional site fast; needs clear pricing, an easy way to talk to Ryan/Ben, and confidence in the studio.
- **Boutique / café / contractor** — needs custom photography and/or e-commerce; will pick Professional or Premium.
- **Founders (Ryan & Ben)** — need a simple admin dashboard to see incoming meetings, purchases and messages.

## User Choices (from clarifying prompt)
- Payments: **Stripe checkout**
- Scheduling: **Calendar with available time slots**
- Design: **Modern & bold but also professional and trustworthy**
- Admin dashboard: **Yes, with login**
- Email notifications: skipped for MVP (Stripe sends its own receipt; bookings/contacts visible in dashboard)

## Architecture
- **Backend**: FastAPI + MongoDB + `emergentintegrations.payments.stripe.checkout`. JWT-based auth (bcrypt + PyJWT). All routes under `/api`.
- **Frontend**: React + React Router + Tailwind + shadcn/ui. Framer Motion for hero animation. Custom Swiss high-contrast design (Cabinet Grotesk headings, Satoshi body, JetBrains Mono labels, #0A0A0A + #FF2A00 accent on #F9F9F8).
- **Env vars** (backend/.env): `STRIPE_API_KEY`, `JWT_SECRET`, `ADMIN_EMAIL`/`ADMIN_PASSWORD`, `ADMIN_2_EMAIL`/`ADMIN_2_PASSWORD`, `FRONTEND_URL`, `MONGO_URL`, `DB_NAME`.

## Core Requirements (static)
1. Marketing site: Hero, marquee ribbon, 3-tier pricing, monthly-addon slider, founders, testimonials, schedule form, contact form.
2. Server-side fixed packages (no price manipulation from client).
3. Stripe checkout (one-time), with success/cancel/polling flow.
4. JWT admin login (both founders seeded on startup).
5. Admin dashboard with tabs for Overview, Bookings, Purchases, Contacts.

## What's Been Implemented — 2026-02-03
- ✅ Marketing site (Hero, Services/Packages, Founders, Schedule, Testimonials, Contact, Footer, Marquee)
- ✅ Stripe checkout session + status polling + webhook stub (`/api/webhook/stripe`)
- ✅ Booking form (calendar + time slot) → MongoDB `bookings`
- ✅ Contact form → MongoDB `contacts`
- ✅ Admin JWT auth (bcrypt, httpOnly cookie + Bearer token); both founders seeded
- ✅ Admin dashboard (overview + 3 data tables)
- ✅ Full end-to-end tests passing (17/17 backend, all frontend flows)
- ✅ `data-testid` on every interactive element

## Prioritized Backlog

### P1 (near-term high-value)
- Email notifications via Resend to Ryan & Ben when a booking / contact / purchase lands (needs Resend API key from user).
- True monthly subscription for the $10-$100 maintenance (Stripe subscription mode, currently first-month is charged one-time and stored in metadata).
- Google Calendar / Calendly integration for auto-confirming meeting slots.
- Portfolio / "Work" section with 3-6 case studies once the studio has shipped a few sites.

### P2
- Blog / journal for SEO ("How we photographed [SF café]").
- Referral tracking (client-referred customer gets discount).
- Client project portal (post-purchase login for status updates).
- Analytics (Plausible or PostHog) on marketing pages.

### P3
- Multi-language (Spanish given SF/Bay demo).
- Dark-mode marketing toggle.

## Admin Credentials
See `/app/memory/test_credentials.md`.
