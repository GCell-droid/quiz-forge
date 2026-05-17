# Quizzes Module Architecture & Documentation

This document outlines the architectural decisions, security measures, and API capabilities of the `Quizzes` module implemented in the Quiz Forge backend.

## 1. Architectural Highlights

### Bridge Table Architecture (Normalization)
To maintain a clean and scalable database structure, the `Question` entity was completely stripped of parent-specific metadata (such as `displayOrder`). We introduced two explicit bridge tables:
*   **`BundleQuestion`**: Links a `QuestionBundle` to a `Question` and holds the `displayOrder` specific to that bundle.
*   **`QuizQuestion`**: Links a `Quiz` to a `Question` and holds the `displayOrder` specific to that quiz.

This guarantees that the core `Question` entity remains "pure" and completely agnostic to where it is being used.

### Deep Cloning Strategy
When a new `Quiz` is instantiated from an existing `QuestionBundle`, the service performs a deep clone of the underlying `Question` entities. 
*   **Why?** If a teacher decides to edit a typo in a question specific to their ongoing Quiz, it must *not* mutate the original Question Bundle that other teachers might be relying on.

## 2. Security & Data Privacy

### Strict Ownership Authorization (RBAC)
Every single mutation route (`PATCH` and `DELETE` endpoints for quizzes, bundles, and their respective questions) enforces a strict ownership check.
*   The service validates that the `createdBy.uid` of the entity perfectly matches the authenticated `user.userId`.
*   If a malicious user attempts to hit an endpoint with a UUID they do not own, the service instantly blocks the transaction and throws a `ForbiddenException` (HTTP 403).

### Sensitive Data Stripping
Because `Quizzes` and `Bundles` join with the `User` table to fetch the creator's information, TypeORM would inherently leak sensitive data (like `passwordHash`).
*   To prevent this, complex reads are processed through the **TypeORM QueryBuilder**.
*   We explicitly use `.addSelect(['createdBy.uid', 'createdBy.name', 'createdBy.email'])` so that the database strictly extracts only safe, public-facing user profile information.

## 3. Search & Tagging Features

### Optimized Tag Searching
`QuestionBundles` support a mandatory string array of `tags` (validated to have at least 1 and at most 5 tags).
*   **Database Level**: This is implemented natively as a Postgres `text[]` array.
*   **Performance**: The query relies on the Postgres `= ANY()` function to parse arrays. *Note: We fall back to a BTREE index by default but it is built to support a GIN (Generalized Inverted Index) for millions of records via a manual migration.*
*   **Filtering**: The `GET /quizzes/bundles` endpoint allows searching for `PUBLIC` bundles by filtering through query parameters (e.g., `?public=true&tags=math,algebra`).

## 4. Full CRUD Implementation
The API features totally independent CRUD lifecycles for:
1.  **Bundles** (Create, read, update, delete)
2.  **Bundle Questions** (Append new questions, edit via bridge ID, remove)
3.  **Quizzes** (Create from scratch or from a bundle, read, update, delete)
4.  **Quiz Questions** (Append new questions, edit via bridge ID, remove)

*Note: All updates dynamically distinguish between updating the "base question" (like text or points) and updating the "bridge metadata" (like display order) via a single API call.*
