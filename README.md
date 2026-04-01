# PhysioCare AI Workspace

This repository contains the full PhysioCare AI solution and supporting files.

## Repository Layout

- `physiocare-ai/` - Main Next.js 14 application (patient, doctor, admin, API, Prisma)
- `fix-ui2.js` - Utility script kept at workspace root

## Quick Start

```bash
cd physiocare-ai
cp .env.example .env
npm install
npm run prisma:generate
npm run dev
```

Open `http://localhost:3000` after the server starts.

## Main Documentation

For full product, setup, architecture, API, and feature details, see:

- `physiocare-ai/README.md`
- `physiocare-ai/GETTING_STARTED.md`
- `physiocare-ai/SETUP_GUIDE.md`
- `physiocare-ai/SUMMARY.md`

## Notes

- Runtime: Node.js 18+
- Database: MongoDB via Prisma
- AI + CV stack: Groq + MediaPipe
- Video calls: ZegoCloud

---

Built for AI-enabled physiotherapy and telehealth workflows.
