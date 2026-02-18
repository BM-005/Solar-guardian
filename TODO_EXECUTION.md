# Solar Guardian - Project Execution Plan

## Project Overview

This is a full-stack solar panel monitoring application with:
- **Frontend**: Vite + React + TypeScript + shadcn-ui + Tailwind CSS (port 8080)
- **Backend**: Express + Prisma + PostgreSQL (port 3000)
- **API Proxy**: Vite configured to forward `/api` requests to backend

## Current State Assessment

### ✅ What's Already Done
- Project structure is complete
- Frontend dependencies installed
- Backend dependencies installed  
- All source code written
- Prisma schema defined
- Seed script created
- Vite proxy configured

### ❌ What's Missing
1. No `.env` file with `DATABASE_URL`
2. No PostgreSQL database running
3. Prisma client not generated
4. Database migrations not applied
5. Database not seeded

## Execution Steps

### Step 1: Create Environment Files
Create `.env` files for configuration.

### Step 2: Install All Dependencies
Install npm packages for both root and server directories.

### Step 3: Set Up PostgreSQL
Ensure PostgreSQL is installed and running.

### Step 4: Initialize Database
- Generate Prisma client
- Run database migrations
- Seed the database with test data

### Step 5: Start Backend Server
Start the Express API server on port 3000.

### Step 6: Start Frontend
Start the Vite development server on port 8080.

## Commands to Execute

```bash
# 1. Create environment file
echo "DATABASE_URL=\"postgresql://postgres:postgres@localhost:5432/solar_guardian?schema=public\" PORT=3000" > .env
echo "DATABASE_URL=\"postgresql://postgres:postgres@localhost:5432/solar_guardian?schema=public\" PORT=3000" > server/.env

# 2. Install root dependencies
cd /Users/bhargavm/Desktop/solar/solar-guardian-main\ 2 && npm install

# 3. Install server dependencies
cd /Users/bhargavm/Desktop/solar/solar-guardian-main\ 2/server && npm install

# 4. Generate Prisma client
cd /Users/bhargavm/Desktop/solar/solar-guardian-main\ 2/server && npx prisma generate

# 5. Run database migrations
cd /Users/bhargavm/Desktop/solar/solar-guardian-main\ 2/server && npx prisma migrate dev --name init

# 6. Seed the database
cd /Users/bhargavm/Desktop/solar/solar-guardian-main\ 2/server && npm run seed

# 7. Start backend (in background)
cd /Users/bhargavm/Desktop/solar/solar-guardian-main\ 2/server && npm run dev &

# 8. Start frontend
cd /Users/bhargavm/Desktop/solar/solar-guardian-main\ 2 && npm run dev
```

## Prerequisite: Install PostgreSQL

If PostgreSQL is not installed:
```bash
# macOS with Homebrew
brew install postgresql
brew services start postgresql

# Create database
createdb solar_guardian
```

Or use Docker:
```bash
docker run --name solar-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=solar_guardian -p 5432:5432 -d postgres
```

## Expected Outcome

After completing these steps:
- Frontend: http://localhost:8080
- Backend API: http://localhost:3000
- Health Check: http://localhost:3000/health
- API Base: http://localhost:3000/api

