# NeuroCareAI - AI-Powered Physiotherapy Platform

A comprehensive Next.js 14 application for multi-role healthcare experiences with real-time telehealth sessions, AI-powered exercise guidance, and progress tracking.

## Features

- **Multi-Role System**: Patient, Doctor, and Admin dashboards
- **Real-Time Telehealth**: Video consultations using ZegoCloud
- **AI Exercise Analysis**: Pose detection with MediaPipe + AI reports via Groq
- **Smart Scheduling**: Doctor slot management and appointment booking
- **Progress Tracking**: Visual analytics and performance metrics
- **Secure Authentication**: NextAuth with role-based access control

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Database**: MongoDB via Prisma ORM
- **Auth**: NextAuth.js
- **Video**: ZegoCloud UIKit
- **AI/ML**: MediaPipe Pose, Groq LLM
- **Storage**: Cloudinary (video uploads)
- **Charts**: Recharts

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- MongoDB database (local or cloud)
- ZegoCloud account
- Cloudinary account
- Groq API key

### Installation

1. **Clone and install dependencies**
   ```bash
   cd nenocare-ai
   npm install
   ```

2. **Set up environment variables**

   Copy `.env.example` to `.env` and fill in your credentials:
   ```bash
   cp .env.example .env
   ```

   Required variables:
   - `MONGO_URL`: Your MongoDB connection string
   - `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
   - `NEXTAUTH_URL`: Your app URL (http://localhost:3000 for dev)
   - `ZEGOCLOUD_APPID`: From ZegoCloud console
   - `ZEGOCLOUD_SERVERSECRET`: From ZegoCloud console
   - `CLOUDINARY_URL`: From Cloudinary dashboard
   - `GROQ_API`: From Groq console (https://console.groq.com)

3. **Set up the database**
   ```bash
   npm run prisma:generate
   ```

4. **Seed admin account**

   Start the dev server first, then visit:
   ```
   http://localhost:3000/api/admin/seed
   ```

   Default admin credentials:
   - Email: admin@gmail.com
   - Password: 123456

5. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

## Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build for production
- `npm run start` - Run the production server
- `npm run lint` - Lint the project
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:studio` - Open Prisma Studio

## Project Structure

```
app/                Next.js App Router pages and routes
app/api/            API routes (auth, sessions, exercises, uploads)
app/doctor/         Doctor experience (appointments, exercises, reviews, slots)
app/patient/        Patient experience (appointments, doctors, exercises, progress)
app/meet/           Real-time meeting rooms
prisma/             Prisma schema
src/components/     Shared components
src/lib/            Auth, Prisma, utilities
```

## User Roles & Workflows

### Patient
1. Sign up and create account
2. Browse available doctors
3. Book appointment slots
4. Join video consultations
5. Receive exercise prescriptions
6. Perform exercises with AI pose detection
7. View progress analytics

### Doctor
1. Login with admin-created credentials
2. Set available time slots
3. Review and approve appointment requests
4. Join telehealth sessions
5. Prescribe exercises from database
6. Review patient exercise recordings with AI analysis

### Admin
1. Login to admin panel
2. Create doctor accounts
3. Manage users (block/unblock)
4. Monitor platform activity

## Configuration Guides

### MongoDB Setup
1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create cluster and database
3. Get connection string and add to `MONGO_URL`

### ZegoCloud Setup
1. Create account at [ZegoCloud](https://www.zegocloud.com/)
2. Create project in console
3. Copy AppID and ServerSecret to `.env`

### Cloudinary Setup
1. Create account at [Cloudinary](https://cloudinary.com/)
2. Go to Dashboard
3. Copy `CLOUDINARY_URL` from API credentials

### Groq Setup
1. Create account at [Groq Console](https://console.groq.com)
2. Generate API key
3. Add to `GROQ_API` in `.env`

## Troubleshooting

### Database connection fails
- Verify `MONGO_URL` is correct
- Check MongoDB cluster is running
- Ensure IP is whitelisted in MongoDB Atlas

### Video calls don't work
- Verify `ZEGOCLOUD_APPID` and `ZEGOCLOUD_SERVERSECRET`
- Check browser permissions for camera/microphone
- Test in Chrome/Edge (best compatibility)

### Exercise reports fail
- Verify `GROQ_API` key is valid
- Check Groq API quota/limits
- Review console for specific error messages

### Video upload fails
- Verify `CLOUDINARY_URL` format is correct
- Check Cloudinary storage quota
- Ensure video size is under 100MB

## License

Proprietary - All rights reserved

---

Built with care for modern healthcare
