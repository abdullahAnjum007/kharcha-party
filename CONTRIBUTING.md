# Contributing to kharcha.party

Thanks for helping keep the hisaab clean and the dosti intact. ✌️

## Development setup

1. Fork and clone the repository.
2. Use Node.js 22 or newer.
3. Run `npm install` inside both `mobile-app/` and `backend/`.
4. Copy `backend/.env.example` to `backend/.env`.
5. Create a focused branch such as `feat/receipt-upload` or `fix/settlement-rounding`.

## Before opening a pull request

Run the backend checks:

```bash
cd backend
npm run check
```

Run the mobile checks:

```bash
cd mobile-app
npm run typecheck
npm run lint
npm run export:android
```

Keep pull requests small enough to review. Explain the user-visible change, mention any API or schema impact, and include validation evidence. Never commit `.env` files, tokens, database files, signing keys, or real invitation codes.

## Product voice

UI text should stay warm, concise, playful, and understandable to Roman Urdu/Hinglish speakers. Humour should help the user; it should never hide an important amount, status, or action.
