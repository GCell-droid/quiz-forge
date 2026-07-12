# Quiz Forge: Comprehensive System Architecture & Technical Documentation

## 1. System Overview & Core Philosophy
**Quiz Forge** is an enterprise-grade, real-time interactive learning platform. Its primary goal is to facilitate seamless, zero-latency live quizzing experiences for large groups of concurrent students. To achieve this, the architecture heavily favors **event-driven background processing**, **aggressive caching**, and **decoupled micro-operations** over synchronous database operations.

### Technology Stack
- **Backend**: NestJS, TypeScript, TypeORM, PostgreSQL
- **Real-Time Layer**: Socket.io, BullMQ (Redis-backed Job Queue), Redis (Key-Value Store)
- **Frontend**: Next.js 14+ (App Router), React, Tailwind CSS, Recharts
- **AI Integration**: Google Gemini API

---

## 2. Data Modeling & Database Architecture

The PostgreSQL database relies heavily on relational mapping and normalization.

> [!NOTE]
> **Soft Deletes**: TypeORM `@DeleteDateColumn` is utilized across parent entities (like `Question` and `Quiz`). This guarantees that if a teacher deletes a quiz, historical analytics and `QuestionResponse` rows tied to that quiz are not broken by foreign-key constraint violations.

### Key Entities
1. **User**: Stores OAuth identities, roles (`TEACHER`, `STUDENT`), and profile data.
2. **Quiz & Question**: 
   - A `Quiz` can have many `Question`s. 
   - To support reusability, a junction table `QuizQuestion` maps questions to quizzes with a `displayOrder`. This allows the same question to exist in multiple quizzes simultaneously.
3. **Question Bundle**: Groups logical sets of questions (e.g., "Math 101 Pool") by tags, enabling educators to quickly build quizzes from pre-existing pools.
4. **Quiz Session**: Represents a specific live occurrence of a quiz. Holds the `scheduledStart`, `actualStart`, `endTime`, `timeLimit`, and the unique short `joinCode`.
5. **Question Response**: The core analytical entity. Logs exactly what string the user answered, the points scored, and the time taken in seconds. Enforces a `@Unique(['session', 'question', 'user'])` constraint to guarantee data integrity at the lowest level.

---

## 3. The Real-Time Lifecycle (WebSockets + BullMQ)

The heart of the application is the live session. Managing 100+ concurrent students clicking answers requires strict decoupling of I/O (WebSockets) from Business Logic (PostgreSQL).

### 3.1 The WebSocket Handshake & Join Phase
1. **Routing**: Students scan a QR code or click a link containing a 6-character `joinCode` (e.g., `7GTNDQ`).
2. **Translation**: The Gateway calls `processJoinSession()`. The backend detects it is a short code, looks up the true `UUID` in PostgreSQL, and generates a unified UUID payload.
3. **Room Assignment**:
   - Students join `session_<UUID>`.
   - Teachers join `session_<UUID>` AND `session_<UUID>_teacher` (to receive private elevated events, like the `initial_stats` payload).

### 3.2 Asynchronous State Transitions
Instead of standard cron jobs, session states (`SCHEDULED` -> `ACTIVE` -> `COMPLETED`) are managed by BullMQ delayed jobs (`quiz-lifecycle` queue).
- **Pre-Warm (T-1 hour)**: Fetches the entire relational tree of the Quiz and its Questions from PostgreSQL and serializes it into Redis.
- **Go-Live (T-0)**: Pulls the pre-warmed quiz from Redis instantly, updates the DB to `ACTIVE`, and broadcasts `quiz_started` to the `session_<UUID>` room.
- **End-Session (T+timeLimit)**: Broadcasts `session_ended` and gracefully disconnects all sockets in the room.

### 3.3 The Answer Ingestion Pipeline (The "Double Lock" Pattern)
When a student clicks an answer, the following pipeline executes:

1. **Emit**: Frontend emits `submitAnswer` with the real UUID.
2. **Queue (BullMQ)**: The Gateway instantly pushes the payload to the `answer-ingestion` queue and sends a success acknowledgment to the client in <10ms.
   - **Idempotency Lock 1**: The job is pushed with a custom ID: `answer-{sessionId}-{questionId}-{userId}`. BullMQ instantly drops duplicate jobs, completely neutralizing spamming.
3. **Process**: The `AnswerIngestionProcessor` picks up the job.
   - **Evaluate**: It fetches the quiz metadata from Redis (O(1) time complexity) to check if the answer is correct.
   - **Persist (DB)**: It saves the `QuestionResponse` to PostgreSQL.
   - **Cache (Redis)**: It uses `HSET` to cache the answer.
     - **Idempotency Lock 2**: Redis `HSET` overwrites existing keys (`{userId}:{questionId}`). If a duplicate bypassed BullMQ, Redis absorbs it without duplicating the score.
4. **Broadcast**: The Processor emits `live_answer_submitted` to the room. The frontend Recharts dashboard updates instantly.

---

## 4. Frontend Architecture & State Management

### 4.1 Hybrid Rendering (Next.js App Router)
- **Server Components**: Used for static pages, SEO-heavy landing pages, and initial data fetching.
- **Client Components**: The live quiz interface, teacher dashboards, and session schedulers are heavily interactive and utilize `"use client"`.

### 4.2 API Interceptors & Auth State
- **Axios Interceptor**: A global Axios instance intercepts `401 Unauthorized` responses. It automatically pauses the request queue, hits the `/auth/refresh` endpoint to exchange the `HttpOnly` refresh token for a new access token, and seamlessly replays the failed requests.
- **Context API**: `AuthContext` provides global access to the current `user` object and a `loading` state to prevent rendering protected routes before authentication completes.

### 4.3 Live Dashboard UI
- **Optimistic Deduplication**: The `TeacherLiveStats` component maintains an array of `answers`. When a new `live_answer_submitted` event arrives, it filters out any existing answer for that user/question pair before appending the new one.
- **Recharts**: Data is mapped in real-time from the `answers` array into aggregated format (`{ name: 'Option A', count: 5 }`) to dynamically animate the pie charts without requiring page reloads.

---

## 5. Security Paradigms

> [!CAUTION]
> Hardening the backend against malicious input and unauthorized access is critical for educational tools to prevent cheating and data leaks.

1. **Guards & Roles**: NestJS `jwtAuthGuard` protects all internal routes. A custom `RoleGuard` explicitly blocks students from accessing teacher-only endpoints (`@Roles(UserRole.TEACHER)`).
2. **WebSocket Authentication**: Sockets cannot connect anonymously. A custom `WsJwtGuard` extracts the JWT from the socket handshake headers/auth payload, parses it, and rejects unauthorized connections.
3. **Data Masking**: When the backend broadcasts `quiz_started`, the `correctAnswer` is deliberately stripped from the payload. The client NEVER knows the correct answer until the session concludes, making it impossible to cheat by inspecting browser network traffic.
4. **Insecure Direct Object Reference (IDOR) Prevention**: Endpoints like `getSessionStats` explicitly verify that `session.createdBy.uid === user.uid` before returning data.

---

## 6. Drawbacks, Limitations & Trade-offs

1. **Redis Dependency**: The system's performance is incredibly tightly coupled to Redis. 
   - *Risk*: If Redis crashes or evicts keys prematurely, the `AnswerIngestionProcessor` falls back to querying PostgreSQL. Under heavy load (e.g., 10,000 students), this fallback could easily overwhelm the database and cause a cascade failure. 
   - *Mitigation*: Ensure Redis is configured with sufficient memory, persistence (`AOF`), and proper eviction policies (`volatile-lru`).

2. **Eventual Consistency in Analytics**: 
   - *Risk*: Because answers are processed asynchronously in BullMQ, there is a theoretical delay (usually <50ms) between a student clicking submit and the database reflecting the score. If a teacher queries a REST endpoint for final grades at the exact microsecond the quiz ends, a few answers might still be in the BullMQ queue.
   - *Mitigation*: The frontend should rely on the cached Redis state or wait for a `session_fully_processed` event before downloading final CSV reports.

3. **Complex Error Handling (Silent Failures)**:
   - *Risk*: If a background BullMQ job throws an error (e.g., PostgreSQL connection timeout), the job fails silently in the background. The student's UI already received a "Success" acknowledgment from the Gateway, creating a disjointed experience where the student thinks they answered, but the database says otherwise.
   - *Mitigation*: Implement a robust Dead Letter Queue (DLQ) and WebSocket error events to proactively notify clients if their background job failed.
