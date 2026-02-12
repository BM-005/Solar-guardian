# Solar Guardian - Database Setup & Run Guide

## Project Structure (Cleaned)
```
server/
├── .env                  # PostgreSQL connection (created)
├── .env.example          # Environment template
├── package.json          # Dependencies + scripts
├── tsconfig.json         # TypeScript config
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts          # Seed data
└── src/
    ├── db.ts            # Prisma client
    ├── index.ts         # Express server
    └── routes/          # API routes
```

## Next Steps to Run

### 1. Install PostgreSQL (if not installed)
```bash
brew install postgresql@18
brew services start postgresql@18
```

### 2. Create Database
```bash
psql -U postgres
CREATE DATABASE solar_guardian;
\q
```

### 3. Update `.env` with your password
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/solar_guardian?schema=public"
```

### 4. Push Schema & Generate Client
```bash
cd server
npx prisma db push
npx prisma generate
```

### 5. Seed Test Data (Optional)
```bash
npm run seed
```

### 6. Start Development Server
```bash
npm run dev
```

## Available API Endpoints
- `GET /health` - Health check
- `GET /api/panels` - Get all panels
- `GET /api/technicians` - Get all technicians
- `GET /api/tickets` - Get all tickets
- `GET /api/faults` - Get all fault detections
- `GET /api/weather` - Get weather data
- `GET /api/analytics` - Get analytics data

## Quick Commands
| Action | Command |
|--------|---------|
| Install deps | `cd server && npm install` |
| Start server | `cd server && npm run dev` |
| Prisma Studio | `cd server && npx prisma studio` |
| Run seed | `cd server && npm run seed` |
| Build | `cd server && npm run build` |

