#!/bin/bash

# NeuroCareAI Quick Start Script
# This script helps you set up the application quickly

echo "========================================="
echo "NeuroCareAI - Quick Start Setup"
echo "========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js version: $(node -v)"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "Creating .env from .env.example..."

    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✓ Created .env file"
        echo ""
        echo "⚠️  IMPORTANT: You must edit .env and fill in your credentials:"
        echo "   - MONGO_URL (MongoDB connection string)"
        echo "   - NEXTAUTH_SECRET (generate with: openssl rand -base64 32)"
        echo "   - ZEGOCLOUD_APPID and ZEGOCLOUD_SERVERSECRET"
        echo "   - CLOUDINARY_URL"
        echo "   - GROQ_API"
        echo ""
        echo "See SETUP_GUIDE.md for detailed instructions on getting these values."
        echo ""
        read -p "Press Enter once you've filled in .env..."
    else
        echo "❌ .env.example not found!"
        echo "Please create .env file manually. See SETUP_GUIDE.md"
        exit 1
    fi
else
    echo "✓ Found .env file"
fi

echo ""
echo "Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✓ Dependencies installed"
echo ""

echo "Generating Prisma client..."
npm run prisma:generate

if [ $? -ne 0 ]; then
    echo "❌ Failed to generate Prisma client"
    echo "Make sure MONGO_URL in .env is correct"
    exit 1
fi

echo "✓ Prisma client generated"
echo ""

echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Start the development server:"
echo "   npm run dev"
echo ""
echo "2. Seed admin account by visiting:"
echo "   http://localhost:3000/api/admin/seed"
echo ""
echo "3. Login credentials:"
echo "   Email: admin@gmail.com"
echo "   Password: 123456"
echo "   (Change these after first login!)"
echo ""
echo "4. For detailed setup instructions, see:"
echo "   SETUP_GUIDE.md"
echo ""
echo "========================================="
