# PhysioCare AI - AI-Powered Physiotherapy Platform

PhysioCare AI is a full-stack Next.js 14 platform for physiotherapy telehealth. It connects patients and doctors through live video sessions, AI-guided exercise tracking, and progress analytics with role-based access control.

> Workspace-level overview is available at `../README.md`.

## What is Included

- **Multi-role experience**: Patient, Doctor, and Admin portals with role-based routing and permissions.
- **Telehealth video**: Live sessions using ZegoCloud with meeting tokens generated on demand.
- **AI exercise analysis**: MediaPipe Pose for joint tracking and Groq for clinical summary reports.
- **Smart Assistant (voice-first)**: Patients can speak symptoms during sets and receive instant Groq-powered modification guidance.
- **Low Bandwidth Mode**: Optimized camera/sampling for weak rural networks and low-end phones (exercise + telehealth).
- **Scheduling system**: Doctor availability slots, appointment requests, approvals, and meeting links.
- **Exercise prescriptions**: Search, assign, and track physiotherapy exercises.
- **Progress analytics**: Session history, charts, and performance metrics.
- **Secure auth**: NextAuth with hashed passwords and server-side session validation.
- **Uploads**: Patient exercise recordings stored in Cloudinary.
- **UX improvements**: Toast notifications, empty states, and loading states for all major flows.

## How Core Features Work

### Telehealth Sessions (ZegoCloud)
1. Doctor approves an appointment.
2. The API generates a meeting token for both parties.
3. Patient and doctor join the same room via the meeting link.
4. Optional **Low Bandwidth Mode** starts audio-first and lowers video resolution to reduce data usage.
5. ZegoCloud handles video/audio; the app manages roles and session state.

### AI Exercise Analysis (MediaPipe + Groq)
1. Patient starts an exercise session from their dashboard.
2. MediaPipe Pose runs in the browser to detect joints and movement.
3. Reps and form quality are tracked locally.
4. A summary payload is sent to the server and stored.
5. Groq generates a clinical report that the doctor can review.

### Smart Assistant (Voice-First)
1. Patient taps **Start Voice** inside live exercise mode.
2. Browser speech recognition captures voice input (Web Speech API).
3. The transcript is sent to `/api/patient/voice-assistant`.
4. Groq returns immediate coaching advice (reduce range, slow tempo, pause set, etc.).
5. If risk is detected, the concern is automatically flagged for doctor review.
6. The doctor sees the flagged alert in existing Reports/Session Review flow.

### Scheduling and Appointments
1. Doctors publish availability slots.
2. Patients book a slot; the request is marked pending.
3. Doctor accepts or declines.
4. On acceptance, a meeting URL is generated and stored.

### Exercise Prescription Flow
1. Doctor searches exercises (ExerciseDB or fallback data).
2. Selected exercises are assigned to the patient.
3. Patient completes the routine with AI tracking.
4. Results and videos are saved for review.

### Progress Tracking
1. Each session writes metrics (reps, accuracy, duration).
2. Dashboards compute trends and show charts.
3. Doctors can review patient history and AI reports.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Database**: MongoDB via Prisma ORM
- **Auth**: NextAuth.js
- **Video**: ZegoCloud UIKit
- **AI/ML**: MediaPipe Pose, Groq LLM
- **Voice**: Web Speech API (speech-to-text) + SpeechSynthesis (text-to-speech)
- **Storage**: Cloudinary
- **Charts**: Recharts

## Project Structure

```
app/                Next.js App Router pages and routes
app/api/            API routes (auth, sessions, exercises, uploads)
app/doctor/         Doctor portal (appointments, exercises, review, settings)
app/patient/        Patient portal (appointments, doctors, exercise, progress)
app/meet/           Video meeting rooms
prisma/             Prisma schema
src/components/     Shared components and UI
src/lib/            Auth, Prisma, and utilities
```

## User Journeys

### Patient
1. Sign up and create account.
2. Browse doctors and book a slot.
3. Join video consultation at the scheduled time.
4. Receive prescribed exercises.
5. Perform exercises with AI guidance.
6. Review progress and reports.

### Doctor
1. Login with admin-created credentials.
2. Create availability slots.
3. Approve appointment requests.
4. Join telehealth sessions.
5. Prescribe exercises and review recordings.
6. Read AI clinical summaries.

### Admin
1. Login to admin panel.
2. Create doctors and manage users.
3. Monitor overall platform activity.

## Setup

### Prerequisites

- Node.js 18+
- MongoDB (Atlas or local)
- ZegoCloud account
- Cloudinary account
- Groq API key

### Quick Start

```bash
cd physiocare-ai
cp .env.example .env
npm install
npm run prisma:generate
npm run dev
```

Seed admin account:

```
http://localhost:3000/api/admin/seed
```

Default admin credentials:
- Email: admin@gmail.com
- Password: 123456

## Environment Variables

```bash
MONGO_URL=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
ZEGOCLOUD_APPID=...
ZEGOCLOUD_SERVERSECRET=...
CLOUDINARY_URL=...
GROQ_API=...
EXERCISEDB_API=... # optional
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Run production server
- `npm run lint` - Lint the project
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:studio` - Open Prisma Studio

## API Highlights

- `POST /api/auth/[...nextauth]` - Authentication
- `POST /api/patient/signup` - Patient signup
- `GET /api/admin/seed` - Seed admin
- `POST /api/meetings/token` - ZegoCloud token
- `POST /api/cloudinary/upload` - Upload recordings
- `GET /api/exercises` - Exercise search

## Security Notes

- Role-based access control enforced in middleware.
- Passwords are hashed before storage.
- Secrets are stored only in `.env`.
- Sensitive API routes are protected server-side.

## Documentation

- [GETTING_STARTED.md](GETTING_STARTED.md)
- [SETUP_GUIDE.md](SETUP_GUIDE.md)
- [SUMMARY.md](SUMMARY.md)
- [IMPROVEMENTS.md](IMPROVEMENTS.md)
- [VISUAL_IMPROVEMENTS.md](VISUAL_IMPROVEMENTS.md)

## Troubleshooting (Quick)

- **Database errors**: Confirm `MONGO_URL` and Atlas IP whitelist.
- **Video issues**: Check ZegoCloud keys and browser permissions.
- **AI report failures**: Verify `GROQ_API` and usage limits.
- **Upload failures**: Validate `CLOUDINARY_URL` and file size limits.

## License

Proprietary - All rights reserved

---

Built for modern physiotherapy workflows.
