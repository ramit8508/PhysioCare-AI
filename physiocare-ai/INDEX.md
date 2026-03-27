# NeuroCareAI - Documentation Index

Welcome to NeuroCareAI! This index will help you find the right documentation for your needs.

## Quick Navigation

### I'm New Here
Start with these files in order:
1. **[SUMMARY.md](SUMMARY.md)** - Platform overview (5 min read)
2. **[GETTING_STARTED.md](GETTING_STARTED.md)** - Quick setup (15-20 min)
3. **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Detailed setup if you get stuck

### I Want to Set Up the App
- **Quick Setup**: Run `./quick-start.sh` (Linux/macOS)
- **Manual Setup**: Follow [GETTING_STARTED.md](GETTING_STARTED.md)
- **Detailed Guide**: See [SETUP_GUIDE.md](SETUP_GUIDE.md)
- **Environment Template**: Copy [.env.example](.env.example)

### I Want to Understand the Platform
- **Overview**: Read [SUMMARY.md](SUMMARY.md)
- **Features**: Check [README.md](README.md)
- **Architecture**: See [SUMMARY.md](SUMMARY.md) architecture section
- **Tech Stack**: Review [README.md](README.md) tech stack

### I Want to Know What's Improved
- **Improvements List**: See [IMPROVEMENTS.md](IMPROVEMENTS.md)
- **UI/UX Changes**: Review [VISUAL_IMPROVEMENTS.md](VISUAL_IMPROVEMENTS.md)
- **New Components**: Check [IMPROVEMENTS.md](IMPROVEMENTS.md) files section

### I'm Having Issues
- **Troubleshooting**: See [SETUP_GUIDE.md](SETUP_GUIDE.md) troubleshooting section
- **Common Errors**: Check [GETTING_STARTED.md](GETTING_STARTED.md) troubleshooting
- **Database Issues**: Review MongoDB setup in [SETUP_GUIDE.md](SETUP_GUIDE.md)
- **Video Call Issues**: See ZegoCloud section in [SETUP_GUIDE.md](SETUP_GUIDE.md)

### I Want to Deploy
- **Production Guide**: See [SETUP_GUIDE.md](SETUP_GUIDE.md) deployment section
- **Checklist**: Review [IMPROVEMENTS.md](IMPROVEMENTS.md) deployment checklist
- **Environment**: Update production URLs in .env

### I Want to Customize
- **UI Styling**: See [VISUAL_IMPROVEMENTS.md](VISUAL_IMPROVEMENTS.md)
- **Colors**: Check color palette in [VISUAL_IMPROVEMENTS.md](VISUAL_IMPROVEMENTS.md)
- **Components**: Review component structure in code
- **Branding**: Update logo and app name in components

### I'm a Developer
- **Technical Docs**: Read [README.md](README.md)
- **Database Schema**: See [README.md](README.md) or `prisma/schema.prisma`
- **API Routes**: Check `app/api/` directory
- **Components**: Review `src/components/` directory

## Documentation Files

### Core Documentation

| File | Purpose | Read Time | For Who |
|------|---------|-----------|---------|
| **README.md** | Technical documentation | 10 min | Developers |
| **SUMMARY.md** | Complete platform overview | 5 min | Everyone |
| **GETTING_STARTED.md** | Quick setup guide | 5 min | New users |
| **SETUP_GUIDE.md** | Detailed setup instructions | 15 min | Setup issues |
| **IMPROVEMENTS.md** | What's been improved | 5 min | Curious users |
| **VISUAL_IMPROVEMENTS.md** | UI/UX documentation | 10 min | Designers |
| **INDEX.md** | This file | 2 min | Navigation |

### Configuration Files

| File | Purpose | Important |
|------|---------|-----------|
| **.env.example** | Environment template | Required |
| **package.json** | Dependencies & scripts | Auto |
| **tsconfig.json** | TypeScript config | Auto |
| **tailwind.config.ts** | Styling config | Optional |
| **prisma/schema.prisma** | Database schema | Reference |

### Helper Files

| File | Purpose | Usage |
|------|---------|-------|
| **quick-start.sh** | Automated setup | Run to setup |
| **.gitignore** | Git exclusions | Auto |
| **next.config.mjs** | Next.js config | Auto |

## Common Tasks

### First Time Setup
```bash
1. Read GETTING_STARTED.md
2. Copy .env.example to .env
3. Fill in environment variables
4. Run ./quick-start.sh (or manual setup)
5. Visit http://localhost:3000
6. Seed admin at /api/admin/seed
```

### Daily Development
```bash
npm run dev              # Start dev server
npm run prisma:studio    # Open database GUI
npm run lint             # Check code
```

### Before Deployment
```bash
1. Read SETUP_GUIDE.md deployment section
2. Run npm run build
3. Test all features
4. Update environment variables
5. Change admin password
6. Deploy!
```

## Getting Help

### Step 1: Check Documentation
Look at the relevant documentation file based on your issue.

### Step 2: Check Troubleshooting
All setup guides have troubleshooting sections.

### Step 3: Review Console
- Browser console for frontend errors
- Terminal for backend errors

### Step 4: Verify Configuration
- Check all environment variables
- Verify service accounts (MongoDB, Zego, etc.)
- Test connections individually

## Feature Documentation

### Patient Features
- **Browse Doctors**: See doctor cards with slots
- **Book Appointments**: Click slot, get toast confirmation
- **Video Calls**: Join via meeting room
- **Exercises**: AI pose detection, video recording
- **Progress**: Charts and analytics

### Doctor Features
- **Manage Slots**: Create availability
- **Review Requests**: Approve/decline
- **Video Calls**: Join telehealth sessions
- **Prescribe**: Search and assign exercises
- **Review**: Watch recordings, read AI reports

### Admin Features
- **Create Doctors**: Account creation form
- **Manage Users**: Block/unblock
- **View Stats**: Platform metrics

## Code Structure

```
physiocare-ai/
├── Documentation/
│   ├── README.md              (Technical docs)
│   ├── SUMMARY.md            (Overview)
│   ├── GETTING_STARTED.md    (Quick setup)
│   ├── SETUP_GUIDE.md        (Detailed setup)
│   ├── IMPROVEMENTS.md       (Changes)
│   ├── VISUAL_IMPROVEMENTS.md (UI/UX)
│   └── INDEX.md              (This file)
│
├── Configuration/
│   ├── .env.example          (Template)
│   ├── package.json          (Dependencies)
│   ├── tsconfig.json         (TypeScript)
│   └── tailwind.config.ts    (Styles)
│
├── Application/
│   ├── app/                  (Next.js routes)
│   │   ├── (auth)/          (Login pages)
│   │   ├── admin/           (Admin panel)
│   │   ├── doctor/          (Doctor portal)
│   │   ├── patient/         (Patient portal)
│   │   ├── api/             (API routes)
│   │   └── meet/            (Video rooms)
│   │
│   ├── src/
│   │   ├── components/      (Reusable UI)
│   │   ├── lib/             (Utilities)
│   │   └── types/           (TypeScript)
│   │
│   └── prisma/
│       └── schema.prisma    (Database)
│
└── Scripts/
    └── quick-start.sh       (Setup script)
```

## API Documentation

### Authentication
- `POST /api/auth/[...nextauth]` - NextAuth handler
- `POST /api/patient/signup` - Patient registration
- `GET /api/admin/seed` - Seed admin account

### Data
- `GET /api/exercises` - Search exercises
- `POST /api/sessions` - Create exercise session
- `POST /api/zego/token` - Generate video token
- `POST /api/cloudinary/upload` - Upload video

## Environment Variables Reference

| Variable | Required | Description | Where to Get |
|----------|----------|-------------|--------------|
| `MONGO_URL` | Yes | Database connection | MongoDB Atlas |
| `NEXTAUTH_SECRET` | Yes | Session security | Generate locally |
| `NEXTAUTH_URL` | Yes | App URL | localhost:3000 |
| `ZEGOCLOUD_APPID` | Yes | Video app ID | ZegoCloud |
| `ZEGOCLOUD_SERVERSECRET` | Yes | Video secret | ZegoCloud |
| `CLOUDINARY_URL` | Yes | Storage URL | Cloudinary |
| `GROQ_API` | Yes | AI API key | Groq |
| `EXERCISEDB_API` | No | Exercise API | RapidAPI |

See [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed instructions on obtaining each credential.

## Version History

### Current Version: 0.1.0

**What's New:**
- Complete platform implementation
- Multi-role authentication
- Video telehealth integration
- AI pose detection
- Toast notification system
- Comprehensive documentation
- Production-ready setup

## Next Steps

1. **Setup**: Follow [GETTING_STARTED.md](GETTING_STARTED.md)
2. **Test**: Try all user flows
3. **Customize**: Update branding/colors
4. **Deploy**: Use [SETUP_GUIDE.md](SETUP_GUIDE.md) deployment section

## Quick Links

- **MongoDB Setup**: [SETUP_GUIDE.md#mongodb-setup](SETUP_GUIDE.md)
- **ZegoCloud Setup**: [SETUP_GUIDE.md#zegocloud-setup](SETUP_GUIDE.md)
- **Cloudinary Setup**: [SETUP_GUIDE.md#cloudinary-setup](SETUP_GUIDE.md)
- **Groq Setup**: [SETUP_GUIDE.md#groq-setup](SETUP_GUIDE.md)
- **Troubleshooting**: [SETUP_GUIDE.md#troubleshooting](SETUP_GUIDE.md)
- **Deployment**: [SETUP_GUIDE.md#production-deployment](SETUP_GUIDE.md)

---

**Need help?** Start with [GETTING_STARTED.md](GETTING_STARTED.md) or [SETUP_GUIDE.md](SETUP_GUIDE.md) troubleshooting sections.

**Want overview?** Read [SUMMARY.md](SUMMARY.md).

**Ready to code?** Check [README.md](README.md).

Happy building with NeuroCareAI!
