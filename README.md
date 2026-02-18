# Solar Guardian

A solar panel monitoring and management application built with React, TypeScript, and Tailwind CSS.

## Project Info

This is a self-hosted project for monitoring and managing solar panel systems.

## Technologies Used

- Vite + React + TypeScript (Frontend)
- Express.js + TypeScript (Backend)
- Prisma ORM + PostgreSQL (Database)
- shadcn-ui + Tailwind CSS (UI)

## Getting Started

### Prerequisites

- Node.js 18+ & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- PostgreSQL database (Neon.tech recommended - free tier available)

### Quick Setup (Automated)

Run the setup script to install dependencies and set up the database:

```sh
chmod +x setup.sh
./setup.sh
```

### Manual Setup

#### 1. Install Dependencies

```sh
# Install root dependencies
npm install

# Install server dependencies
cd server && npm install
cd ..
```

#### 2. Set Up Database

**Option A: Neon (Recommended - Free PostgreSQL)**
1. Sign up at [console.neon.tech](https://console.neon.tech)
2. Create a new project named "solar-guardian"
3. Copy your connection string (format: `postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require`)
4. Update `server/.env` with your connection string

**Option B: Local PostgreSQL**
1. Install PostgreSQL locally or via Docker
2. Create a database named `solar_guardian`
3. Update `server/.env` with your local connection string

#### 3. Initialize Database

```sh
cd server
npx prisma generate
npx prisma db push
npx prisma db seed
```

#### 4. Start Development Servers

```sh
npm run dev:all
```

The application will be available at:
- **Frontend:** http://localhost:8080
- **Backend API:** http://localhost:3000
- **Health Check:** http://localhost:3000/health

## Environment Variables

### Root Directory (.env)
```env
DATABASE_URL="postgresql://..."  # Your Neon/database connection string
```

### Server Directory (server/.env)
```env
DATABASE_URL="postgresql://..."  # Your Neon/database connection string
PORT=3000
NODE_ENV=development
```

## Features

- Real-time power generation monitoring
- Panel health overview with 120 solar panels across 12 zones
- Weather integration
- Analytics dashboard
- Ticket management for technicians
- Fault detection with AI confidence scores

