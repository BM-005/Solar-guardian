#!/bin/bash

# ========================================
# Solar Guardian - Setup Script
# ========================================
# This script automates the complete setup process
# for new developers cloning the repository.
# ========================================

set -e  # Exit on error

echo "🔧 Solar Guardian Setup Script"
echo "=============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${GREEN}✅${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

# Step 1: Check prerequisites
echo "📋 Step 1: Checking prerequisites..."

if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

if ! command -v git &> /dev/null; then
    print_error "git is not installed. Please install git first."
    exit 1
fi

print_status "All prerequisites met (Node.js, npm, git)"
echo ""

# Step 2: Create environment files from templates
echo "📋 Step 2: Creating environment files..."

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        print_status "Created .env from .env.example"
    else
        print_warning "No .env.example found, skipping .env creation"
    fi
else
    print_status ".env already exists, skipping"
fi

if [ ! -f server/.env ]; then
    if [ -f server/.env.example ]; then
        cp server/.env.example server/.env
        print_status "Created server/.env from server/.env.example"
    else
        print_warning "No server/.env.example found, skipping server/.env creation"
    fi
else
    print_status "server/.env already exists, skipping"
fi
echo ""

# Step 3: Install root dependencies
echo "📋 Step 3: Installing root dependencies..."
if [ -f package.json ]; then
    npm install
    print_status "Root dependencies installed"
else
    print_error "package.json not found in root directory"
    exit 1
fi
echo ""

# Step 4: Install server dependencies
echo "📋 Step 4: Installing server dependencies..."
if [ -f server/package.json ]; then
    cd server
    npm install
    cd ..
    print_status "Server dependencies installed"
else
    print_error "server/package.json not found"
    exit 1
fi
echo ""

# Step 5: Setup Prisma
echo "📋 Step 5: Setting up Prisma..."

cd server

# Generate Prisma client
npx prisma generate
print_status "Prisma client generated"

# Push database schema
npx prisma db push
print_status "Database schema pushed"

# Seed the database
npx prisma db seed
print_status "Database seeded"

cd ..
echo ""

# Step 6: Final instructions
echo "======================================="
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo "======================================="
echo ""
echo "✅ Connected to shared Neon database"
echo "✅ Database seeded with initial data"
echo ""
echo "Next steps:"
echo "1. Start the development servers:"
echo "   npm run dev:all"
echo ""
echo "2. The application will be available at:"
echo "   - Frontend: http://localhost:8080"
echo "   - Backend:  http://localhost:3000"
echo ""
print_warning "Note: All team members share the same Neon database!"

