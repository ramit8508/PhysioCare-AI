# NeuroCareAI - Complete Setup Guide

This guide will walk you through setting up the NeuroCareAI platform from scratch. Follow each step carefully to ensure everything works properly.

## Prerequisites

Before you begin, make sure you have:
- Node.js 18+ installed ([Download here](https://nodejs.org/))
- A code editor (VS Code recommended)
- A web browser (Chrome/Edge recommended for video calls)
- Terminal/Command Prompt access

## Step 1: Install Dependencies

Open your terminal in the project directory and run:

```bash
npm install
```

This will install all required packages. Wait for it to complete (may take a few minutes).

## Step 2: Set Up MongoDB Database

### Option A: MongoDB Atlas (Cloud - Recommended)

1. **Create Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Click "Try Free" and create an account
   - Verify your email

2. **Create Cluster**
   - Click "Build a Database"
   - Choose "FREE" tier (M0 Sandbox)
   - Select a cloud provider and region (choose closest to you)
   - Click "Create Cluster" (takes 3-5 minutes)

3. **Set Up Database Access**
   - Click "Database Access" in left sidebar
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Username: `neurocare-admin`
   - Password: Click "Autogenerate Secure Password" and SAVE IT
   - User Privileges: "Atlas admin"
   - Click "Add User"

4. **Configure Network Access**
   - Click "Network Access" in left sidebar
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (for development)
   - Click "Confirm"

5. **Get Connection String**
   - Click "Database" in left sidebar
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string (looks like: `mongodb+srv://...`)
   - Replace `<password>` with your actual password
   - Add `/neurocare` before the `?` in the URL

   Example:
   ```
   mongodb+srv://neurocare-admin:YOUR_PASSWORD@cluster0.abc123.mongodb.net/neurocare?retryWrites=true&w=majority
   ```

### Option B: Local MongoDB

If you prefer local development:

```bash
# macOS (using Homebrew)
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Ubuntu/Debian
sudo apt-get install mongodb
sudo systemctl start mongodb

# Windows
# Download and install from https://www.mongodb.com/try/download/community
```

Your connection string will be:
```
mongodb://localhost:27017/neurocare
```

## Step 3: Set Up ZegoCloud (Video Calls)

1. **Create Account**
   - Go to [ZegoCloud Console](https://console.zegocloud.com/)
   - Sign up with email or Google
   - Verify your email

2. **Create Project**
   - Click "Create Project"
   - Project Name: `NeuroCareAI`
   - Choose "Video Call" as the product
   - Click "Create"

3. **Get Credentials**
   - Click on your project
   - Go to "Projects Config"
   - You'll see:
     - **AppID**: Copy this (looks like: `123456789`)
     - **ServerSecret**: Click "Show" and copy (long string)

## Step 4: Set Up Cloudinary (Video Storage)

1. **Create Account**
   - Go to [Cloudinary](https://cloudinary.com/)
   - Sign up for free account
   - Verify your email

2. **Get Credentials**
   - Log in to Dashboard
   - You'll see "Account Details" section
   - Copy the **CLOUDINARY_URL** (looks like: `cloudinary://API_KEY:API_SECRET@CLOUD_NAME`)

   Example:
   ```
   cloudinary://123456789012345:abcdefghijklmnopqrstuvwxyz@your-cloud-name
   ```

## Step 5: Set Up Groq AI (Exercise Reports)

1. **Create Account**
   - Go to [Groq Console](https://console.groq.com/)
   - Sign up with email or Google

2. **Generate API Key**
   - Click "API Keys" in sidebar
   - Click "Create API Key"
   - Name: `NeuroCareAI`
   - Click "Create"
   - **IMPORTANT**: Copy the API key immediately (you can't see it again!)

   Example:
   ```
   gsk_abcdefghijklmnopqrstuvwxyz1234567890
   ```

## Step 6: Configure Environment Variables

1. **Copy Example File**
   ```bash
   cp .env.example .env
   ```

2. **Edit .env File**
   Open the `.env` file in your code editor and fill in ALL values:

   ```bash
   # Database Configuration
   MONGO_URL=mongodb+srv://neurocare-admin:YOUR_PASSWORD@cluster0.abc123.mongodb.net/neurocare?retryWrites=true&w=majority

   # NextAuth Configuration
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-generated-secret-key-here-minimum-32-characters-long

   # ZegoCloud Video Configuration
   ZEGOCLOUD_APPID=123456789
   ZEGOCLOUD_SERVERSECRET=your-zego-server-secret-here

   # Cloudinary Video Upload
   CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name

   # Groq AI API (for exercise reports)
   GROQ_API=gsk_your_groq_api_key_here

   # ExerciseDB API (optional - uses fallback if not provided)
   EXERCISEDB_API=
   ```

3. **Generate NEXTAUTH_SECRET**

   Run this command:
   ```bash
   # On macOS/Linux
   openssl rand -base64 32

   # On Windows (PowerShell)
   -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
   ```

   Copy the output and paste it as `NEXTAUTH_SECRET` value.

## Step 7: Initialize Database

1. **Generate Prisma Client**
   ```bash
   npm run prisma:generate
   ```

2. **Verify Connection**
   ```bash
   npm run prisma:studio
   ```

   This should open Prisma Studio in your browser (http://localhost:5555). If it works, your database is connected!

## Step 8: Start Development Server

```bash
npm run dev
```

The application should start at: **http://localhost:3000**

## Step 9: Seed Admin Account

1. **Open your browser** and go to:
   ```
   http://localhost:3000/api/admin/seed
   ```

2. **You should see**:
   ```json
   {"ok": true, "message": "Admin created"}
   ```

3. **Default admin credentials**:
   - Email: `admin@gmail.com`
   - Password: `123456`

   **IMPORTANT**: Change these credentials immediately after first login!

## Step 10: Test the Application

### Test Admin Panel
1. Go to http://localhost:3000/admin/login
2. Login with admin credentials
3. Create a test doctor account:
   - Email: `doctor1@test.com`
   - Password: `password123`
   - Degrees: `BPT, MPT`
   - Experience: `5`
   - Bio: `Specialist in sports injury rehabilitation`

### Test Patient Flow
1. Go to http://localhost:3000/login
2. Click "Sign Up" tab
3. Create patient account:
   - Name: `Test Patient`
   - Email: `patient1@test.com`
   - Password: `password123`
4. Login and explore patient dashboard

### Test Doctor Flow
1. Go to http://localhost:3000/doctor/login
2. Login with doctor credentials you created
3. Create time slots:
   - Go to "Timeslots"
   - Add a slot for tomorrow
4. Prescribe exercises:
   - Go to "Exercises"
   - Search for exercises
   - Prescribe to a patient

## Troubleshooting

### "Cannot connect to database"
- Verify `MONGO_URL` is correct
- Check MongoDB Atlas cluster is running
- Ensure IP is whitelisted (allow access from anywhere)
- Test connection string in MongoDB Compass

### "Video calls not working"
- Verify `ZEGOCLOUD_APPID` and `ZEGOCLOUD_SERVERSECRET` are correct
- Check browser permissions for camera/microphone
- Try in Chrome/Edge (best compatibility)
- Check ZegoCloud dashboard for API limits

### "Exercise reports fail"
- Verify `GROQ_API` key is valid
- Check Groq console for API quota/limits
- Look at browser console for specific error messages

### "Video upload fails"
- Verify `CLOUDINARY_URL` format is correct (must include `cloudinary://`)
- Check Cloudinary dashboard for storage quota
- Ensure video size is under 100MB

### "nextauth error"
- Make sure `NEXTAUTH_SECRET` is at least 32 characters
- Verify `NEXTAUTH_URL` matches your local URL exactly
- Clear browser cookies and try again

### Build errors
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Clear Next.js cache
rm -rf .next
npm run build
```

## Production Deployment

### Vercel (Recommended)

1. **Push code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Deploy to Vercel**
   - Go to [Vercel](https://vercel.com/)
   - Import your GitHub repository
   - Add all environment variables from `.env`
   - Change `NEXTAUTH_URL` to your production URL
   - Deploy!

### Environment Variables for Production

Make sure to update:
- `NEXTAUTH_URL` → Your production domain (e.g., `https://neurocare.vercel.app`)
- `MONGO_URL` → Keep same MongoDB Atlas connection
- All other variables stay the same

### Security Checklist

Before going live:
- [ ] Change admin password from default
- [ ] Update `NEXTAUTH_SECRET` to strong random value
- [ ] Enable MongoDB authentication
- [ ] Set up proper CORS policies
- [ ] Enable HTTPS (automatic with Vercel)
- [ ] Review and restrict MongoDB network access
- [ ] Set up rate limiting
- [ ] Enable Cloudinary upload restrictions
- [ ] Review Groq API rate limits

## Next Steps

1. **Customize Branding**
   - Update app name in `app/page.tsx`
   - Change colors in `tailwind.config.ts`
   - Add your logo

2. **Add More Doctors**
   - Use admin panel to create doctor accounts
   - Doctors can then set their availability

3. **Test Full Patient Journey**
   - Sign up as patient
   - Book appointment
   - Join video call
   - Complete exercise session
   - View progress

4. **Monitor Application**
   - Check Prisma Studio for data
   - Review Next.js logs
   - Monitor API usage in dashboards

## Support Resources

- **MongoDB**: https://www.mongodb.com/docs/
- **ZegoCloud**: https://docs.zegocloud.com/
- **Cloudinary**: https://cloudinary.com/documentation
- **Groq**: https://console.groq.com/docs
- **Next.js**: https://nextjs.org/docs
- **Prisma**: https://www.prisma.io/docs

## Getting Help

If you encounter issues:
1. Check this guide's troubleshooting section
2. Review browser console for errors
3. Check terminal logs for server errors
4. Verify all environment variables are set
5. Test each service individually (MongoDB, ZegoCloud, etc.)

---

You're all set! The application should now be fully functional.
