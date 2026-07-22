# Changelog

## 1.0.0 — July 2026 (Initial Release)

### Core Features
- Family chore tracking with per-kid point assignments
- Behaviour/skills tracking alongside chores
- Marble jar reward system (family and personal jars)
- Companion system — 8 mascots kids earn from their jar
- Memory feed with photo/video/voice notes, 90-day seasonal refresh
- Printable chore chart export
- Montage video rendering from memory season
- Trial welcome email + parenting tips nurture sequence (day 3, day 7, month 1)

### Platforms
- Web PWA (pointpals.co.nz)
- Android via Capacitor
- iOS via Capacitor

### Technical
- TanStack Start + React 19
- Supabase backend (auth, DB, storage, edge functions)
- Stripe subscription billing (NZD, AUD, USD)
- PostHog product analytics (parent-facing only, no child sessions)
- Sentry error tracking (PII scrubbed before send)
- Capacitor native wrappers with deep-link auth callbacks

### Privacy
- Children's data never used for advertising or profiling
- Anonymous IDs on kid-facing screens
- 90-day memory retention with opt-out
- GDPR/NZ Privacy Act 2020 compliant data export and deletion
