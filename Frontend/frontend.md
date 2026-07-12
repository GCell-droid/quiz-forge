# Quiz Forge — Frontend Development Specification

> **Purpose:** This document is a complete, self-contained specification for building the Quiz Forge frontend. It is derived from a line-by-line audit of every backend file. Follow it exactly and you will have zero integration errors.

---

## Table of Contents

1. [Tech Stack & Constraints](#1-tech-stack--constraints)
2. [Backend Connection Details](#2-backend-connection-details)
3. [Authentication System](#3-authentication-system)
4. [Enums (Shared Constants)](#4-enums-shared-constants)
5. [TypeScript Interfaces (Copy These)](#5-typescript-interfaces-copy-these)
6. [Complete API Reference](#6-complete-api-reference)
7. [WebSocket Events Reference](#7-websocket-events-reference)
8. [Page-by-Page Implementation Guide](#8-page-by-page-implementation-guide)
9. [Coding Guidelines](#9-coding-guidelines)

---

## 1. Tech Stack & Constraints

| Layer         | Technology                        |
| ------------- | --------------------------------- |
| Framework     | Next.js 16 (App Router)           |
| Language      | TypeScript 5                      |
| Styling       | Tailwind CSS 4 + shadcn/ui 4      |
| HTTP Client   | Axios                             |
| WebSocket     | `socket.io-client` (install this) |
| Auth (tokens) | jose (JWT handling in middleware) |
| Charts        | Recharts                          |
| Theme         | next-themes                       |

> [!IMPORTANT]
> The backend uses **signed, httpOnly cookies** for authentication. The frontend **never** stores tokens in localStorage. All Axios requests must use `withCredentials: true`. The frontend only needs to read the JWT inside Next.js middleware (server-side) using `jose` to check if the user is logged in and what their role is.

---

## 2. Backend Connection Details

```
Base URL:  http://localhost:7777   (configurable via NEXT_PUBLIC_BACKEND_URL in .env)
CORS:      origin: http://localhost:3000, credentials: true
```

### Axios Instance Setup

Create a single Axios instance at `lib/api.ts`:

```typescript
import axios from "axios";

const api = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:7777",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export default api;
```

> [!CAUTION]
> Do NOT create duplicate Axios instances. Use this single `api` instance everywhere.

---

## 3. Authentication System

### 3.1 How It Works

The backend sets **two signed httpOnly cookies** on login/register:

| Cookie Name     | Contents      | Lifetime | Purpose       |
| --------------- | ------------- | -------- | ------------- |
| `jwt`           | Access Token  | 15 min   | Auth for API  |
| `refresh_token` | Refresh Token | 7 days   | Get new `jwt` |

The JWT payload (decoded) looks like this:

```json
{
  "email": "user@example.com",
  "sub": "uuid-of-user",
  "role": "teacher",
  "iat": 1717100000,
  "exp": 1717100900
}
```

After the JWT strategy validates the token, the backend attaches this object to `req.user`:

```typescript
// This is what @CurrentUser() returns in every controller
{
  userId: string; // the user's UUID (from payload.sub)
  email: string;
  role: string; // "student" | "teacher" | "admin"
}
```

### 3.2 Login Flow

```
POST /auth/login
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "StrongPass1!"
}
```

**Success Response (200):**

```json
{
  "message": "Login Sucess",
  "user": {
    "uid": "uuid",
    "name": "John",
    "email": "user@example.com",
    "role": "teacher",
    "oauthProvider": null,
    "oauthId": null,
    "isActive": true,
    "createdAt": "2026-05-20T10:00:00.000Z"
  }
}
```

**If already logged in (valid cookie exists):**

```json
{
  "message": "Already logged"
}
```

**Error Response (401):**

```json
{
  "statusCode": 401,
  "message": "Invalid Credentials"
}
```

> [!NOTE]
> The cookies (`jwt` and `refresh_token`) are automatically set by the backend via `Set-Cookie` headers. The frontend does NOT need to extract or store them manually. Axios `withCredentials: true` handles sending them back automatically.

### 3.3 Register Flow

```
POST /auth/register
```

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "StrongPass1!",
  "role": "teacher"
}
```

**Validation Rules (enforced by backend, show these in the UI too):**

- `email` — must be a valid email format
- `name` — required, must be a string
- `password` — required (unless OAuth), must pass `IsStrongPassword` (min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 symbol)
- `role` — must be exactly `"teacher"` or `"student"`

**Success Response (201):**

```json
{
  "user": {
    "uid": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "teacher",
    "oauthProvider": null,
    "oauthId": null,
    "isActive": true,
    "createdAt": "2026-05-20T10:00:00.000Z"
  },
  "needsRole": false,
  "messsage": "Registration Successfull"
}
```

> [!WARNING]
> Note the typo in the backend: `messsage` (3 s's). Your frontend must read `response.data.messsage` or just ignore this field and show your own success message.

**Error Response (409):**

```json
{
  "statusCode": 409,
  "message": "Registration failed"
}
```

### 3.4 Google OAuth Flow

1. Frontend redirects user to: `GET /auth/google`
2. Backend redirects to Google consent screen
3. Google redirects back to: `GET /auth/google/callback`
4. Backend sets cookies and redirects to:
   - `FRONTEND_URL/dashboard` (if user has a role)
   - `FRONTEND_URL/profile/edit` (if `needsRole` is true — new Google user without a role)

**Frontend implementation:**

```typescript
const handleGoogleLogin = () => {
  window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/google`;
};
```

### 3.5 Logout

```
POST /auth/logout
```

- **Auth Required:** Yes (JWT cookie)
- **Response:** `{ "message": "Logged out successfully" }`
- Clears both cookies server-side

### 3.6 Check Auth Status

```
GET /auth/me
```

- **Auth Required:** Yes (JWT cookie)
- **Response:** `{ "message": "You are logged In" }`
- If the cookie is invalid/expired, returns 401

### 3.7 Get User Profile

```
GET /user/profile
```

- **Auth Required:** Yes (JWT cookie)
- **Response:**

```json
{
  "uid": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "teacher",
  "oauthProvider": null,
  "oauthId": null,
  "isActive": true,
  "createdAt": "2026-05-20T10:00:00.000Z"
}
```

### 3.8 Next.js Middleware (Route Protection)

Your middleware should:

1. Read the `jwt` cookie from the request
2. Decode it using `jose` (just verify structure, not signature — the backend validates the signature)
3. Redirect unauthenticated users away from protected pages to `/login`
4. Redirect authenticated users away from `/login` and `/signup` to `/dashboard`
5. Optionally read `role` from the token to gate teacher-only pages

---

## 4. Enums (Shared Constants)

Create a file `lib/enums.ts` with these exact values:

```typescript
// User roles
export enum UserRole {
  STUDENT = "student",
  TEACHER = "teacher",
  ADMIN = "admin",
}

// Quiz status (for creating/updating quizzes)
export enum QuizStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  ARCHIVED = "ARCHIVED",
}

// Quiz visibility
export enum QuizVisibility {
  PUBLIC = "PUBLIC",
  PRIVATE = "PRIVATE",
}

// Bundle visibility (same values but different enum for bundles)
export enum BundleVisibility {
  PUBLIC = "PUBLIC",
  PRIVATE = "PRIVATE",
}

// Question types
export enum QuestionType {
  MULTIPLE_CHOICE = "MULTIPLE_CHOICE",
  TRUE_FALSE = "TRUE_FALSE",
  SHORT_ANSWER = "SHORT_ANSWER",
}

// Session status
export enum SessionStatus {
  SCHEDULED = "SCHEDULED",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
}

// Session access type
export enum AccessType {
  OPEN = "OPEN",
  CODE_ONLY = "CODE_ONLY",
  INVITE_ONLY = "INVITE_ONLY",
}

// Participant status
export enum ParticipantStatus {
  JOINED = "JOINED",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  LEFT = "LEFT",
}

// Invite status
export enum InviteStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
}

// AI quiz difficulty
export enum QuizDifficulty {
  EASY = "easy",
  MEDIUM = "medium",
  HARD = "hard",
}
```

---

## 5. TypeScript Interfaces (Copy These)

Create a file `lib/types.ts`:

```typescript
import {
  UserRole,
  QuizStatus,
  QuizVisibility,
  BundleVisibility,
  QuestionType,
  SessionStatus,
  AccessType,
  ParticipantStatus,
  QuizDifficulty,
} from "./enums";

// ─── USER ────────────────────────────────────────────────────

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  oauthProvider: string | null;
  oauthId: string | null;
  isActive: boolean;
  createdAt: string; // ISO date string
}

// ─── QUESTION ────────────────────────────────────────────────

export interface Question {
  questionId: string;
  title: string;
  type: QuestionType;
  options: any; // JSON — for MCQ: string[], for TRUE_FALSE: ["True","False"]
  correctAnswer: any; // JSON — varies by type
  points: number;
}

// ─── BUNDLE ──────────────────────────────────────────────────

export interface BundleQuestion {
  id: string; // bridge ID
  question: Question;
  displayOrder: number;
}

export interface QuestionBundle {
  bundleId: string;
  title: string;
  description: string | null;
  visibility: BundleVisibility;
  tags: string[];
  createdBy: {
    uid: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  questions: BundleQuestion[];
}

// ─── QUIZ ────────────────────────────────────────────────────

export interface QuizQuestion {
  id: string; // bridge ID
  question: Question;
  displayOrder: number;
}

export interface Quiz {
  quizId: string;
  title: string;
  description: string | null;
  status: QuizStatus;
  visibility: QuizVisibility;
  tags: string[];
  createdBy: {
    uid: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  quizQuestions: QuizQuestion[];
}

// ─── SESSION ─────────────────────────────────────────────────

export interface QuizSession {
  sessionId: string;
  quiz: Quiz;
  createdBy: User;
  joinCode: string;
  accessType: AccessType;
  status: SessionStatus;
  scheduledStart: string;
  actualStart: string | null;
  endTime: string | null;
  timeLimit: number; // in seconds (or minutes — check backend usage)
  createdAt: string;
}

// ─── AI GENERATED QUIZ ──────────────────────────────────────

export interface AiQuizQuestion {
  title: string;
  options: string[];
  correctAnswer: string;
  points: number;
  type: string; // always "MULTIPLE_CHOICE"
}

export interface GeneratedQuiz {
  title: string;
  description: string;
  questions: AiQuizQuestion[];
}

// ─── WEBSOCKET PAYLOADS ─────────────────────────────────────

// Client emits "joinSession" with:
export interface JoinSessionPayload {
  sessionId: string;
}

// Client emits "submitAnswer" with:
export interface SubmitAnswerPayload {
  sessionId: string;
  questionId: string;
  userId: string;
  response: string;
  timeTakenSecs: number;
}

// Server emits "quiz_started" with:
export interface QuizStartedPayload {
  sessionId: string;
  quizTitle: string;
  questions: {
    questionId: string;
    title: string;
    type: QuestionType;
    options: any;
    points: number;
  }[];
  timeLimit: number;
}
```

---

## 6. Complete API Reference

> [!IMPORTANT]
> All endpoints prefixed with 🔒 require the `jwt` cookie to be present (sent automatically by Axios with `withCredentials: true`). All endpoints prefixed with 👨‍🏫 additionally require the user to have `role: "teacher"`.

### 6.1 Auth Endpoints

| Method | URL                     | Auth    | Description                          |
| ------ | ----------------------- | ------- | ------------------------------------ |
| POST   | `/auth/login`           | ❌ None | Login with email & password          |
| POST   | `/auth/register`        | ❌ None | Register new user                    |
| GET    | `/auth/google`          | ❌ None | Redirect to Google OAuth             |
| GET    | `/auth/google/callback` | ❌ None | Google callback (handled by backend) |
| POST   | `/auth/logout`          | 🔒      | Logout (clears cookies)              |
| GET    | `/auth/me`              | 🔒      | Check if logged in                   |
| GET    | `/auth/test`            | 🔒👨‍🏫    | Test route (teacher only)            |

### 6.2 User Endpoints

| Method | URL             | Auth | Description      |
| ------ | --------------- | ---- | ---------------- |
| GET    | `/user/profile` | 🔒   | Get user profile |

### 6.3 Question Bundle Endpoints (Teacher-owned)

All bundle endpoints require 🔒 auth.

#### Create Bundle

```
POST /quizzes/bundles
```

**Request Body:**

```json
{
  "title": "JavaScript Basics",
  "description": "Fundamental JS questions",
  "visibility": "PUBLIC",
  "tags": ["javascript", "basics"],
  "questions": [
    {
      "title": "What is a closure?",
      "type": "MULTIPLE_CHOICE",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "points": 1,
      "displayOrder": 1
    }
  ]
}
```

**Validation Rules:**

- `title` — required, string
- `description` — optional, string
- `visibility` — optional, one of `"PUBLIC"` or `"PRIVATE"` (default: `"PRIVATE"`)
- `tags` — required, array of strings, non-empty, max 5 items
- `questions` — optional, array of question objects

**Response:** Returns the full `QuestionBundle` object (see interfaces above).

---

#### Get All Bundles

```
GET /quizzes/bundles
GET /quizzes/bundles?tags=javascript,react
GET /quizzes/bundles?public=true
GET /quizzes/bundles?public=true&tags=javascript
```

- Without `?public=true` → returns only the current user's bundles
- With `?public=true` → returns all bundles with `visibility: "PUBLIC"` (any user)
- `?tags=` → comma-separated tag filter (matches bundles that have AT LEAST ONE matching tag)

**Response:** Array of `QuestionBundle[]`

---

#### Get Single Bundle

```
GET /quizzes/bundles/:bundleId
```

**Response:** `QuestionBundle` object with all questions included.

---

#### Update Bundle

```
PATCH /quizzes/bundles/:bundleId
```

**Request Body (all fields optional):**

```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "visibility": "PUBLIC",
  "tags": ["updated", "tags"]
}
```

**Response:** Updated `QuestionBundle` object.

> [!WARNING]
> Only the owner can update. Returns 403 if another user tries.

---

#### Delete Bundle

```
DELETE /quizzes/bundles/:bundleId
```

**Response:** `{ "message": "Bundle deleted successfully" }`

---

#### Add Question to Bundle

```
POST /quizzes/bundles/:bundleId/questions
```

**Request Body:**

```json
{
  "title": "What is hoisting?",
  "type": "MULTIPLE_CHOICE",
  "options": ["A", "B", "C", "D"],
  "correctAnswer": "A",
  "points": 2,
  "displayOrder": 3
}
```

---

#### Update Bundle Question

```
PATCH /quizzes/bundles/questions/:questionId
```

> [!IMPORTANT]
> The `:questionId` here is the **bridge ID** (the `id` field of `BundleQuestion`), NOT the `questionId` of the `Question` entity.

**Request Body (all optional):**

```json
{
  "title": "Updated question text",
  "type": "TRUE_FALSE",
  "options": ["True", "False"],
  "correctAnswer": "True",
  "points": 1,
  "displayOrder": 2
}
```

---

#### Delete Bundle Question

```
DELETE /quizzes/bundles/questions/:questionId
```

Same note: `:questionId` is the bridge ID.

**Response:** `{ "message": "Question deleted from bundle successfully" }`

---

### 6.4 Quiz Endpoints

All quiz endpoints require 🔒 auth.

#### Create Quiz

```
POST /quizzes
```

There are **two ways** to create a quiz:

**Option A — Create from a Bundle (recommended for teachers):**

```json
{
  "title": "Midterm Quiz",
  "description": "Based on JS Basics bundle",
  "status": "DRAFT",
  "visibility": "PRIVATE",
  "tags": ["midterm"],
  "bundleId": "uuid-of-bundle"
}
```

**Option B — Create with inline questions:**

```json
{
  "title": "Pop Quiz",
  "description": "Quick check",
  "status": "PUBLISHED",
  "visibility": "PUBLIC",
  "tags": ["pop-quiz"],
  "questions": [
    {
      "title": "What is 2+2?",
      "type": "MULTIPLE_CHOICE",
      "options": ["3", "4", "5", "6"],
      "correctAnswer": "4",
      "points": 1,
      "displayOrder": 1
    }
  ]
}
```

**Validation Rules:**

- `title` — required
- `description` — optional
- `status` — optional, one of `"DRAFT"`, `"PUBLISHED"`, `"ARCHIVED"` (default: `"DRAFT"`)
- `visibility` — optional, one of `"PUBLIC"`, `"PRIVATE"` (default: `"PRIVATE"`)
- `tags` — optional, array of strings
- `bundleId` — optional, string (if provided, questions are copied from the bundle)
- `questions` — optional, array (ignored if `bundleId` is provided)
- **At least one of `bundleId` or `questions` must be provided**, otherwise returns 400.

**Response:** Full `Quiz` object including all `quizQuestions`.

---

#### Get Quiz

```
GET /quizzes/:quizId
```

**Response:** `Quiz` object with nested `quizQuestions` array (sorted by `displayOrder`).

---

#### Update Quiz

```
PATCH /quizzes/:quizId
```

**Request Body (all optional):**

```json
{
  "title": "Updated Quiz",
  "description": "Updated desc",
  "status": "PUBLISHED",
  "visibility": "PUBLIC",
  "tags": ["updated"]
}
```

> [!WARNING]
> Only the quiz owner can update. Returns 403 otherwise.

---

#### Delete Quiz

```
DELETE /quizzes/:quizId
```

**Response:** `{ "message": "Quiz deleted successfully" }`

---

#### Add Question to Quiz

```
POST /quizzes/:quizId/questions
```

**Request Body:**

```json
{
  "title": "New question",
  "type": "MULTIPLE_CHOICE",
  "options": ["A", "B", "C", "D"],
  "correctAnswer": "B",
  "points": 1,
  "displayOrder": 5
}
```

---

#### Update Quiz Question

```
PATCH /quizzes/questions/:bridgeId
```

> [!IMPORTANT]
> `:bridgeId` is the `id` field of the `QuizQuestion` bridge entity, NOT the `questionId`.

**Request Body (all optional):**

```json
{
  "title": "Updated text",
  "type": "SHORT_ANSWER",
  "options": null,
  "correctAnswer": "42",
  "points": 3,
  "displayOrder": 1
}
```

---

#### Delete Quiz Question

```
DELETE /quizzes/questions/:bridgeId
```

**Response:** `{ "message": "Question deleted from quiz successfully" }`

---

### 6.5 AI Quiz Generation (Gemini)

```
POST /gemini/generate-quiz
```

- **Auth:** 🔒👨‍🏫 (Teacher only + rate-limited)

**Request Body:**

```json
{
  "topic": "React Hooks and State Management",
  "numQuestions": 10,
  "difficulty": "medium"
}
```

**Validation Rules:**

- `topic` — required, string, max 2000 chars
- `numQuestions` — integer, 1–50 (default: 5)
- `difficulty` — one of `"easy"`, `"medium"`, `"hard"` (default: `"medium"`)

**Success Response (200):**

```json
{
  "title": "React Hooks Quiz",
  "description": "Test your knowledge of React Hooks",
  "questions": [
    {
      "title": "What hook is used for side effects?",
      "options": ["useState", "useEffect", "useRef", "useMemo"],
      "correctAnswer": "useEffect",
      "points": 1,
      "type": "MULTIPLE_CHOICE"
    }
  ]
}
```

### 6.6 Session Endpoints

#### Schedule a Session

```
POST /sessions/schedule
```

- **Auth:** 🔒

**Request Body:**

```json
{
  "quizId": "uuid-of-quiz",
  "scheduledStart": "2026-06-15T14:00:00.000Z",
  "timeLimit": 600
}
```

**Fields:**

- `quizId` — UUID of an existing quiz
- `scheduledStart` — ISO 8601 date string for when the quiz goes live
- `timeLimit` — integer, total time limit for the quiz (in seconds)

**Success Response:**

```json
{
  "sessionId": "uuid",
  "quiz": { ... },
  "createdBy": { ... },
  "joinCode": "A1B2C3",
  "accessType": "CODE_ONLY",
  "status": "SCHEDULED",
  "scheduledStart": "2026-06-15T14:00:00.000Z",
  "actualStart": null,
  "endTime": null,
  "timeLimit": 600,
  "createdAt": "2026-06-01T10:00:00.000Z"
}
```

> [!IMPORTANT]
> The `joinCode` is a 6-character uppercase alphanumeric code (e.g., `"A1B2C3"`). This is what students use to join the session. Display it prominently to the teacher after scheduling.

---

## 7. WebSocket Events Reference

### 7.1 Connection Setup

Install `socket.io-client`:

```bash
npm install socket.io-client
```

Connect to the WebSocket server:

```typescript
import { io, Socket } from "socket.io-client";

const socket: Socket = io(
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:7777",
  {
    withCredentials: true,
  },
);
```

> [!NOTE]
> The WebSocket gateway has `cors: { origin: '*' }` so it accepts connections from any origin. No special CORS setup needed on the client.

### 7.2 Events the Client SENDS

#### `joinSession`

Call this when a student enters a join code and navigates to the session waiting room.

```typescript
socket.emit(
  "joinSession",
  { sessionId: "uuid-of-session" },
  (response) => {
    // response = { event: "joined", data: { sessionId: "uuid" } }
    console.log("Joined session:", response);
  },
);
```

#### `submitAnswer`

Call this when a student selects an answer during a live quiz.

```typescript
socket.emit(
  "submitAnswer",
  {
    sessionId: "uuid-of-session",
    questionId: "uuid-of-question",
    userId: "uuid-of-current-user",
    response: "Option B", // the text of the selected answer
    timeTakenSecs: 12, // how many seconds the student took
  },
  (ack) => {
    // ack = { success: true, message: "Answer received" }
    console.log("Answer submitted:", ack);
  },
);
```

> [!IMPORTANT]
> The `response` field must be the **exact text** of the selected option (not the index). The backend compares it against `correctAnswer` using case-insensitive string matching.

### 7.3 Events the Client LISTENS TO

#### `quiz_started`

This fires when the scheduled quiz goes live. All students in the room receive it simultaneously.

```typescript
socket.on("quiz_started", (data: QuizStartedPayload) => {
  // data.sessionId    — UUID
  // data.quizTitle    — string
  // data.questions    — array of questions (WITHOUT correctAnswer!)
  // data.timeLimit    — number (seconds)
});
```

**Shape of `data.questions[i]`:**

```json
{
  "questionId": "uuid",
  "title": "What is a closure?",
  "type": "MULTIPLE_CHOICE",
  "options": ["A", "B", "C", "D"],
  "points": 1
}
```

> [!CAUTION]
> The `correctAnswer` is intentionally **NOT** sent to the client in the `quiz_started` event. This prevents cheating. The answer is only evaluated server-side.

---

## 8. Page-by-Page Implementation Guide

### 8.1 Landing Page (`/`)

**Purpose:** Public marketing page. No auth required.

**Content:**

- Hero section with app name "Quiz Forge" and tagline
- Feature highlights (AI quiz generation, real-time sessions, leaderboards)
- Call-to-action buttons: "Get Started" → `/signup`, "Login" → `/login`
- Brief "How it works" section

**No API calls needed.** This is a purely static page.

---

### 8.2 Login Page (`/login`)

**Purpose:** Email/password login + Google OAuth.

**API Calls:**

- `POST /auth/login` with `{ email, password }`
- Google button: `window.location.href = BACKEND_URL + "/auth/google"`

**On Success:**

- Save user data in a React context or state management
- Redirect to `/dashboard`

**Error Handling:**

- 401 → "Invalid email or password"
- 409 → "Account conflict"
- Show Axios error messages from `error.response.data.message`

---

### 8.3 Signup Page (`/signup`)

**Purpose:** Registration with name, email, role, password.

**Form Fields:**
| Field | Type | Validation |
| --------- | -------- | --------------------------------------------- |
| name | text | Required |
| email | email | Required, valid email format |
| role | select | Options: `"teacher"`, `"student"` — Required |
| password | password | Required, 8+ chars, 1 uppercase, 1 lowercase, 1 number, 1 symbol |

**API Call:** `POST /auth/register` with `{ name, email, password, role }`

**On Success:** Show success message, redirect to `/login` (backend does NOT auto-login on register — no cookies are set).

> [!WARNING]
> The backend's `register()` method generates tokens but does NOT call `setAuthCookies()`. So after registration, the user must log in separately. Do NOT redirect to dashboard directly after signup.

---

### 8.4 Dashboard Page (`/dashboard`)

**Purpose:** Main hub after login. Shows different content based on role.

**API Calls on mount:**

- `GET /user/profile` → get user info and role

**For Teachers — show:**

- "My Quizzes" section → use `GET /quizzes/bundles` (no `?public=true`) to list their bundles
- Quick actions: "Create Quiz", "Create Bundle", "Generate with AI", "Schedule Session"
- Recent sessions (not yet implemented in backend — show placeholder)

**For Students — show:**

- "Join Quiz" card with a join code input field
- Recent quiz results (not yet implemented — show placeholder)

---

### 8.5 Bundle Management Pages (Teacher)

#### Bundle List (`/bundles`)

**API Call:** `GET /quizzes/bundles` → returns user's bundles

**UI:** Card grid showing each bundle's title, description, tag badges, question count, visibility badge, created date.

**Actions per card:** View, Edit, Delete

---

#### Create Bundle (`/bundles/create`)

**Form Fields:**
| Field | Type | Required | Notes |
| ----------- | ------------ | -------- | ---------------------------- |
| title | text | ✅ | |
| description | textarea | ❌ | |
| visibility | select | ❌ | `"PUBLIC"` or `"PRIVATE"` |
| tags | tag input | ✅ | 1–5 string tags |
| questions | dynamic list | ❌ | Can add questions inline |

**Each question in the dynamic list:**
| Field | Type | Required |
| -------------- | ------ | -------- |
| title | text | ✅ |
| type | select | ✅ | `"MULTIPLE_CHOICE"`, `"TRUE_FALSE"`, `"SHORT_ANSWER"` |
| options | array | ❌ | Show 4 text inputs for MCQ, 2 for T/F, none for short answer |
| correctAnswer | varies | ❌ | For MCQ: select which option. For T/F: select True/False. For short answer: text input |
| points | number | ❌ | Default: 1 |

**API Call:** `POST /quizzes/bundles`

---

#### Bundle Detail / Edit (`/bundles/[bundleId]`)

**API Call:** `GET /quizzes/bundles/:bundleId`

**Display:** Bundle metadata + ordered list of questions.

**Actions:**

- Edit bundle metadata → `PATCH /quizzes/bundles/:bundleId`
- Add question → `POST /quizzes/bundles/:bundleId/questions`
- Edit question → `PATCH /quizzes/bundles/questions/:bridgeId` (use `bundleQuestion.id`)
- Delete question → `DELETE /quizzes/bundles/questions/:bridgeId`
- Delete entire bundle → `DELETE /quizzes/bundles/:bundleId`
- "Create Quiz from this Bundle" → navigates to quiz creation with `bundleId` pre-filled

---

### 8.6 Quiz Management Pages (Teacher)

#### Create Quiz (`/quiz/create`)

**Two creation modes — show tabs or toggle:**

**Mode 1: From Bundle**

- Show a dropdown/search to select from user's bundles
- Pre-fill title and auto-copy questions
- API Call: `POST /quizzes` with `{ title, bundleId, ... }`

**Mode 2: Manual / From AI**

- Show the same dynamic question form as bundles
- Or use the AI generate feature (see below) then review + submit
- API Call: `POST /quizzes` with `{ title, questions: [...], ... }`

---

#### Quiz Detail (`/quiz/[quizId]`)

**API Call:** `GET /quizzes/:quizId`

**Display:** Quiz metadata, status badge, list of questions with answers.

**Actions:**

- Edit quiz metadata → `PATCH /quizzes/:quizId`
- Add question → `POST /quizzes/:quizId/questions`
- Edit question → `PATCH /quizzes/questions/:bridgeId`
- Delete question → `DELETE /quizzes/questions/:bridgeId`
- Delete quiz → `DELETE /quizzes/:quizId`
- "Schedule Session" → navigate to session scheduling with `quizId` pre-filled

---

### 8.7 AI Quiz Generation (`/quiz/generate`)

**Purpose:** Teacher enters a topic, and AI generates quiz questions. Teacher reviews, edits, then saves as a real quiz.

**Step 1 — Generate**

- Form: topic (text), numQuestions (number slider 1-50), difficulty (select: easy/medium/hard)
- API Call: `POST /gemini/generate-quiz`
- Show loading state (can take 5-15 seconds)

**Step 2 — Review & Edit**

- Display generated questions in an editable list
- Teacher can edit question text, options, correct answer, points
- Teacher can remove or reorder questions

**Step 3 — Save as Quiz**

- Add `displayOrder` to the questions:

```typescript
const transformedQuestions = generatedQuiz.questions.map((q, i) => ({
  ...q,
  type: q.type as QuestionType,
  displayOrder: i + 1,
}));
```

- API Call: `POST /quizzes` with `{ title, description, questions: transformedQuestions }`

---

### 8.8 Session Scheduling (`/sessions/schedule`)

**Purpose:** Teacher schedules a quiz session for a future time.

**Form Fields:**
| Field | Type | Required | Notes |
| -------------- | -------------- | -------- | --------------------------------------- |
| quizId | select/search | ✅ | Pick from teacher's quizzes |
| scheduledStart | datetime-local | ✅ | Must be in the future |
| timeLimit | number | ✅ | Time limit in seconds (e.g. 600 = 10min)|

**API Call:** `POST /sessions/schedule` with `{ quizId, scheduledStart, timeLimit }`

**On Success:** Show the response which includes the `joinCode`. Display it prominently:

```
Session Scheduled!
Share this code with your students:
╔═══════════════╗
║   A1B2C3      ║
╚═══════════════╝
Quiz starts at: June 15, 2026 at 2:00 PM
```

---

### 8.9 Student Join Flow (`/quiz/join`)

**Purpose:** Student enters a 6-character join code to enter a session waiting room.

**Step 1 — Enter Code**

- Input field for 6-character alphanumeric code (uppercase)
- Validate format client-side (6 chars, A-Z0-9)

> [!NOTE]
> There is currently **no backend HTTP endpoint** to look up a session by join code. You will need to either:
>
> - (a) Add a `GET /sessions/join/:code` endpoint to the backend, OR
> - (b) Use the WebSocket `joinSession` event directly and pass the `sessionId` (which means the teacher must share the sessionId instead of the joinCode)
>
> **Recommendation:** Ask the backend developer to add a lookup endpoint like `GET /sessions/by-code/:joinCode` that returns the session details. For now, you can hardcode the sessionId for testing.

**Step 2 — Waiting Room**

- Connect to WebSocket: `socket.emit("joinSession", { sessionId })`
- Show "Waiting for quiz to start..." with a countdown timer to `scheduledStart`
- Listen for `quiz_started` event

**Step 3 — Quiz Started (handled by Live Quiz page)**

---

### 8.10 Live Quiz Session (`/quiz/live/[sessionId]`)

**Purpose:** The real-time quiz experience for students.

**Triggered by:** Receiving the `quiz_started` WebSocket event.

**UI Flow:**

1. Parse `quiz_started` payload → get `questions[]` and `timeLimit`
2. Show one question at a time (or all at once — your design choice)
3. Start a countdown timer from `timeLimit` seconds
4. For each question, show:
   - Question text (`title`)
   - Options (clickable cards/buttons)
   - Points badge
   - Question number / total
5. When student selects an answer:
   - Track `timeTakenSecs` (time since question was shown)
   - Emit `submitAnswer` via WebSocket
   - Show "Answer submitted" feedback
   - Move to next question
6. When all questions answered or timer expires:
   - Show "Quiz Complete!" screen
   - Disconnect from WebSocket

**Key Code:**

```typescript
// Track time per question
const [questionStartTime, setQuestionStartTime] = useState(Date.now());

const handleAnswer = (selectedOption: string) => {
  const timeTaken = Math.round(
    (Date.now() - questionStartTime) / 1000,
  );

  socket.emit(
    "submitAnswer",
    {
      sessionId,
      questionId: currentQuestion.questionId,
      userId: currentUser.uid, // get from user context
      response: selectedOption, // the exact option text
      timeTakenSecs: timeTaken,
    },
    (ack) => {
      if (ack.success) {
        moveToNextQuestion();
      }
    },
  );
};
```

---

### 8.11 Results / Leaderboard Page (`/sessions/[sessionId]/results`)

> [!NOTE]
> The backend currently has **no endpoint** to fetch session results or leaderboard data. The `ResponsesController` and `AnalyticsController` are empty stubs. However, the database entities exist:
>
> - `QuestionResponse` — stores each student's answer, correctness, and points
> - `LeaderboardSnapshot` — stores ranked scores per session
> - `ResponseAggregation` — stores per-question answer distribution
>
> **Recommendation:** Build the UI with placeholder data now. When the backend adds `GET /sessions/:sessionId/results` and `GET /sessions/:sessionId/leaderboard` endpoints, wire them up.

**Planned UI:**

- Session summary (quiz title, total participants, avg score)
- Per-question breakdown (bar chart showing answer distribution)
- Leaderboard table (rank, name, score, questions answered)

---

### 8.12 Browse Public Bundles (`/explore`)

**Purpose:** Students and teachers can browse publicly shared question bundles.

**API Call:** `GET /quizzes/bundles?public=true` or `GET /quizzes/bundles?public=true&tags=react,js`

**UI:** Searchable/filterable card grid of public bundles.

---

## 9. Coding Guidelines

> [!IMPORTANT]
> Follow these rules strictly. The code must be SIMPLE and easy to read.

### Naming Conventions

- Use **camelCase** for all variable names, function names, and object keys
- Use **PascalCase** for component names and TypeScript interfaces/types
- Use **UPPER_CASE** for enum values (matching the backend)

### Code Structure Rules

1. **Keep components small** — If a component exceeds ~150 lines, split it
2. **No complex abstractions** — Avoid HOCs, render props, or overly generic components. Simple, direct code is preferred
3. **One API call per function** — Don't chain multiple API calls in one function. Split them into separate async functions
4. **Use `try/catch` for every API call** — Always handle errors with user-friendly messages
5. **No `any` types** — Use the interfaces defined in `lib/types.ts` everywhere
6. **Avoid barrel exports** — Import directly from the file, not from index files

### Error Handling Pattern

```typescript
const handleCreateQuiz = async (data: CreateQuizData) => {
  try {
    setLoading(true);
    setError(null);
    const response = await api.post("/quizzes", data);
    // handle success
    return response.data;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const message =
        err.response?.data?.message || "Something went wrong";
      setError(message);
    }
  } finally {
    setLoading(false);
  }
};
```

### File Organization

```
app/
├── (auth)/
│   ├── login/page.tsx
│   └── signup/page.tsx
├── (protected)/                  ← route group, add layout with auth check
│   ├── dashboard/page.tsx
│   ├── bundles/
│   │   ├── page.tsx              ← list bundles
│   │   ├── create/page.tsx       ← create bundle form
│   │   └── [bundleId]/page.tsx   ← view/edit bundle
│   ├── quiz/
│   │   ├── create/page.tsx       ← create quiz
│   │   ├── generate/page.tsx     ← AI quiz generation
│   │   ├── [quizId]/page.tsx     ← view/edit quiz
│   │   ├── join/page.tsx         ← student join code entry
│   │   └── live/[sessionId]/page.tsx ← live quiz session
│   ├── sessions/
│   │   ├── schedule/page.tsx     ← schedule a session
│   │   └── [sessionId]/
│   │       └── results/page.tsx  ← session results
│   └── explore/page.tsx          ← browse public bundles
├── layout.tsx
├── page.tsx                      ← landing page
└── globals.css

components/
├── auth/                         ← login/signup form components
├── bundles/                      ← bundle list, form, question editor
├── quiz/                         ← quiz form, question editor, live quiz
├── sessions/                     ← schedule form, waiting room, results
├── dashboard/                    ← dashboard cards, stats
├── shared/                       ← navbar, footer, loading, error states
└── ui/                           ← shadcn primitives (button, card, etc.)

lib/
├── api.ts                        ← single Axios instance
├── enums.ts                      ← all enum definitions
├── types.ts                      ← all TypeScript interfaces
├── socket.ts                     ← socket.io client singleton
└── utils.ts                      ← cn() and other utilities

hooks/
├── useAuth.ts                    ← auth context hook
├── useSocket.ts                  ← WebSocket connection hook
└── useQuiz.ts                    ← quiz data fetching hook
```

### Socket.io Singleton

Create `lib/socket.ts`:

```typescript
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:7777",
      {
        withCredentials: true,
        autoConnect: false, // connect manually when needed
      },
    );
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
```

---

## Quick Reference: All Backend Routes at a Glance

| Method    | URL                                    | Auth | Purpose                  |
| --------- | -------------------------------------- | ---- | ------------------------ |
| POST      | `/auth/login`                          | ❌   | Login                    |
| POST      | `/auth/register`                       | ❌   | Register                 |
| GET       | `/auth/google`                         | ❌   | Google OAuth redirect    |
| POST      | `/auth/logout`                         | 🔒   | Logout                   |
| GET       | `/auth/me`                             | 🔒   | Auth check               |
| GET       | `/user/profile`                        | 🔒   | Get profile              |
| POST      | `/quizzes/bundles`                     | 🔒   | Create bundle            |
| GET       | `/quizzes/bundles`                     | 🔒   | List bundles             |
| GET       | `/quizzes/bundles/:bundleId`           | 🔒   | Get bundle               |
| PATCH     | `/quizzes/bundles/:bundleId`           | 🔒   | Update bundle            |
| DELETE    | `/quizzes/bundles/:bundleId`           | 🔒   | Delete bundle            |
| POST      | `/quizzes/bundles/:bundleId/questions` | 🔒   | Add question to bundle   |
| PATCH     | `/quizzes/bundles/questions/:bridgeId` | 🔒   | Update bundle question   |
| DELETE    | `/quizzes/bundles/questions/:bridgeId` | 🔒   | Delete bundle question   |
| POST      | `/quizzes`                             | 🔒   | Create quiz              |
| GET       | `/quizzes/:quizId`                     | 🔒   | Get quiz                 |
| PATCH     | `/quizzes/:quizId`                     | 🔒   | Update quiz              |
| DELETE    | `/quizzes/:quizId`                     | 🔒   | Delete quiz              |
| POST      | `/quizzes/:quizId/questions`           | 🔒   | Add question to quiz     |
| PATCH     | `/quizzes/questions/:bridgeId`         | 🔒   | Update quiz question     |
| DELETE    | `/quizzes/questions/:bridgeId`         | 🔒   | Delete quiz question     |
| POST      | `/gemini/generate-quiz`                | 🔒👨‍🏫 | AI generate quiz         |
| POST      | `/sessions/schedule`                   | 🔒   | Schedule session         |
| WebSocket | `joinSession`                          | ❌   | Join session room        |
| WebSocket | `submitAnswer`                         | ❌   | Submit answer            |
| WebSocket | `quiz_started` (server→client)         | —    | Quiz goes live broadcast |
