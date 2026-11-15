# kharcha.party

Android-first Expo + React Native prototype for group-trip budgets, expenses, voice logs, and settlements.

## Run locally

```bash
npm install
npm run android
```

## Quality checks

```bash
npm run typecheck
npm run lint
npm run export:android
```

## Structure

- `src/app/` — Expo Router screens and the complete prototype flow
- `src/components/` — shared mobile UI primitives
- `src/state/` — typed local prototype state
- `src/data/` — mock expenses and voice transcripts
- `src/theme.ts` — shared colors, spacing, and radii

This version intentionally has no backend, authentication, external database, or real microphone transcription. The integration points for backend persistence, real-time group sync, and voice-to-text are marked in the source.
