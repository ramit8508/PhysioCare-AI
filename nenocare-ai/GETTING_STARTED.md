# Getting Started with NeuroCareAI

Welcome to NeuroCareAI! This guide will help you get the application up and running quickly.

## Quick Setup (5 minutes)

### Option 1: Automated Setup (Linux/macOS)

```bash
./quick-start.sh
```

This script will:
1. Check Node.js installation
2. Copy .env.example to .env
3. Install dependencies
4. Generate Prisma client

### Option 2: Manual Setup

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Edit .env and fill in your credentials
# (See SETUP_GUIDE.md for where to get these)

# 3. Install dependencies
npm install

# 4. Generate Prisma client
npm run prisma:generate

# 5. Start development server
npm run dev

# 6. Seed admin account (visit in browser)
# http://localhost:3000/api/admin/seed
```

## What You Need

Before you start, you'll need accounts and credentials from:

1. **MongoDB Atlas** (free tier) - Database
   - Get it: https://www.mongodb.com/cloud/atlas
   - What you need: Connection string
   - Time: ~5 minutes

2. **ZegoCloud** (free tier) - Video calls
   - Get it: https://www.zegocloud.com/
   - What you need: AppID and ServerSecret
   - Time: ~3 minutes

3. **Cloudinary** (free tier) - Video storage
   - Get it: https://cloudinary.com/
   - What you need: CLOUDINARY_URL
   - Time: ~2 minutes

4. **Groq** (free tier) - AI reports
   - Get it: https://console.groq.com/
   - What you need: API key
   - Time: ~2 minutes

**Total setup time: ~15-20 minutes**

## Environment Variables

Edit your `.env` file with these values:

```bash
# Database (Required)
MONGO_URL=mongodb+srv://user:password@cluster.mongodb.net/neurocare

# Auth (Required)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>

# Video Calls (Required)
ZEGOCLOUD_APPID=<your-app-id>
ZEGOCLOUD_SERVERSECRET=<your-server-secret>

# Video Storage (Required)
CLOUDINARY_URL=cloudinary://key:secret@cloud-name

# AI Reports (Required)
GROQ_API=<your-api-key>

# Exercise API (Optional)
EXERCISEDB_API=<optional-rapidapi-key>
```

## First Login

After setup:

1. Visit http://localhost:3000
2. Click "Sign In" → "Admin login"
3. Use credentials:
   - Email: `admin@gmail.com`
   - Password: `123456`
4. **Important**: Change these immediately!

## Test the Application

### Create a Doctor (as Admin)
1. Login to admin panel
2. Fill in doctor creation form
3. Note the email/password you create

### Create a Patient
1. Go to http://localhost:3000/login
2. Click "Sign Up" tab
3. Create patient account

### Book an Appointment (as Patient)
1. Login as patient
2. Browse doctors
3. Book a time slot

### Approve Appointment (as Doctor)
1. Login as doctor
2. Go to Appointments
3. Approve the request

### Join Video Call
1. When appointment time arrives
2. Click "Join Call" button
3. Test video/audio

## Troubleshooting

### Can't connect to database
```bash
# Check your MONGO_URL is correct
# Make sure cluster is running in MongoDB Atlas
# Verify IP whitelist includes your IP
```

### Video calls not working
```bash
# Verify ZEGOCLOUD credentials
# Check browser permissions
# Use Chrome or Edge (best support)
```

### Dependencies fail to install
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Build fails
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

## Documentation

- **SETUP_GUIDE.md** - Detailed setup with screenshots descriptions
- **IMPROVEMENTS.md** - What's been improved in this version
- **README.md** - Full technical documentation

## Need Help?

1. Check SETUP_GUIDE.md troubleshooting section
2. Review browser console for errors
3. Check terminal logs
4. Verify all environment variables are set
5. Test each service individually

## Next Steps

Once everything works:

1. **Customize**: Update branding, colors, logos
2. **Add Doctors**: Create more doctor accounts
3. **Test Flows**: Try complete patient journey
4. **Deploy**: Use Vercel or your preferred host
5. **Monitor**: Set up error tracking and analytics

## Production Deployment

When ready to deploy:

```bash
# 1. Push to GitHub
git init
git add .
git commit -m "Initial commit"
git push

# 2. Deploy to Vercel
# - Import GitHub repo
# - Add environment variables
# - Change NEXTAUTH_URL to production URL
# - Deploy!
```

See SETUP_GUIDE.md for detailed deployment instructions.

---

That's it! You're ready to start using NeuroCareAI.

For questions or issues, review the documentation files or check the troubleshooting sections.

Happy healing!
