# Quiz Forge

Quiz Forge is a real-time, interactive quiz platform designed for educators and students. It allows teachers to generate AI-powered quizzes, schedule live sessions, and monitor student progress via a real-time dashboard. Students can join sessions using short codes, participate synchronously, and receive immediate feedback.

## Key Features

- **AI Quiz Generation**: Automatically generate comprehensive quizzes based on a simple prompt using Google's Gemini API.
- **Real-Time Interactivity**: Powered by Socket.io, enabling zero-latency answer submissions and real-time dashboard updates for teachers.
- **Robust Architecture**: Built with NestJS and Next.js, utilizing BullMQ (Redis) to offload heavy background processing and manage high concurrency during live sessions.
- **Secure Authentication**: Integration with Google OAuth 2.0 and JWT-based Role-Based Access Control (RBAC).

## Tech Stack

**Frontend**:
- Next.js 14 (App Router)
- React
- Tailwind CSS
- Recharts (Data Visualization)
- Socket.io-client

**Backend**:
- NestJS (TypeScript)
- TypeORM
- PostgreSQL
- Redis
- BullMQ
- Socket.io

## Prerequisites

Before running the application, ensure you have the following installed:
- Node.js (v18 or higher)
- PostgreSQL
- Redis Server (Ensure it is running locally or provide a remote URI)

## Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/GCell-droid/quiz-forge
cd quiz-forge
```

### 2. Backend Setup
Navigate to the backend directory and install dependencies:
```bash
cd Backend
npm install
```

Create a `.env` file in the `Backend` directory. You will need to configure variables for your PostgreSQL database, Redis connection, Google OAuth client, JWT secrets, and Gemini API key:
```env
# Database
DB_URL=postgres://user:password@localhost:5432/quizforge

# Redis / BullMQ
REDIS_URL=redis://localhost:6379
BULLMQ_REDIS_URL=redis://localhost:6379

# Authentication
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
JWT_SECRET=your_jwt_secret
COOKIE_SECRET=your_cookie_signing_secret
GOOGLE_CALLBACK_URI=http://localhost:7777/v1/auth/google/callback

# AI Integration
GEMINI_KEY=your_gemini_api_key

# Application
FRONTEND_URL=http://localhost:3000
PORT=7777
```

Start the backend development server:
```bash
npm run start:dev
```

### 3. Frontend Setup
Open a new terminal, navigate to the frontend directory, and install dependencies:
```bash
cd Frontend
npm install
```

Create a `.env` file in the `Frontend` directory:
```env
NEXT_PUBLIC_BACKEND_URL=/api
```

The frontend sends HTTP requests through `/api` to the backend's `/v1` routes.
Register the `GOOGLE_CALLBACK_URI` value as an authorized redirect URI in Google
OAuth settings. See [Backend/README.md](Backend/README.md) for the API route map
and compatibility policy.

Start the frontend development server:
```bash
npm run dev
```

### 4. Access the Application
- The frontend will be available at `http://localhost:3000`
- The backend API will be available at `http://localhost:8000`

## Architecture Highlights
- **Event-Driven Processing**: Live quiz answers are instantly queued via BullMQ to prevent database bottlenecks and ensure a lightning-fast user experience.
- **Idempotency**: The system uses deterministic BullMQ job IDs and Redis `HSET` commands to guarantee that duplicate answer submissions from students are strictly ignored.
- **Caching**: Heavy quiz metadata is pre-warmed in Redis before a session goes live, eliminating database reads during the critical real-time phase.

For a deeper dive into the system's architecture, caching strategies, and security paradigms, please refer to the `system_architecture.md` file located in the root directory.
