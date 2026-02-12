# Solar Guardian

A solar panel monitoring and management application built with React, TypeScript, and Tailwind CSS.

## Project Info

This is a self-hosted project for monitoring and managing solar panel systems.

## Technologies Used

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Getting Started

### Prerequisites

- Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- PostgreSQL database (free cloud database recommended)

### Database Setup

The application uses SQLite for local development. The database file is automatically created when you run the setup commands.

### Installation

```sh
# Install dependencies
npm install
cd server && npm install

# Set up database
cd server
npx prisma generate
npx prisma db push
npx prisma db seed

# Start both servers
npm run dev:all
```

The app will be available at http://localhost:8080 (or next available port)

## Features

- Real-time power generation monitoring
- Panel health overview
- Weather integration
- Analytics dashboard
- Ticket management for technicians

