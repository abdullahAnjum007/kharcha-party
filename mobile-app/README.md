# kharcha.party

Android-first Expo + React Native app for group-trip budgets, expenses, AI voice logs, and settlements.

## Run locally

```bash
npm install
npm run typecheck
npm run android
```

Run the backend first. Copy `.env.example` to `.env`; Android Emulator uses `http://10.0.2.2:4000`. On a physical Android phone, replace it with your computer's LAN IP.

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
- `src/data/` — mock data for screens not migrated yet
- `src/services/` — typed backend client and audio upload
- `src/theme.ts` — shared colors, spacing, and radii

Create/join authentication and voice expense review are connected to the backend. The voice screen records with `expo-audio`, uploads the file, shows the AI result in a review modal, and only creates an expense after Accept. Dashboard, voting, budget, and sheet screens still use local prototype state while their API migration remains in progress.
