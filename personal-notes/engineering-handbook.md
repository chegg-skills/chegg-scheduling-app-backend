# Engineering Handbook

This handbook serves as a central reference for our development practices, architectural decisions, and workflows.

---

## Table of Contents
1. [Git & GitHub Workflow](#1-git--github-workflow)
2. [Backend Architecture: Functional vs. Class-Based](#2-backend-architecture-functional-vs-class-based)
3. [Deep Dive: Scalability & Performance Review](#3-deep-dive-scalability--performance-review)
4. [Technical Q&A: Server & Express Details](#4-technical-qa-server--express-details)
5. [Playbook: Organization Repository Setup](#5-playbook-organization-repository-setup)

---

## 1. Git & GitHub Workflow

### **The Core Philosophy: Feature Branching**
In a professional environment, the `main` branch is the "Source of Truth" and should always be stable and deployable.
*   **Never work on `main`**: All new features, bug fixes, or experiments must be done on a separate branch.
*   **Isolate changes**: Each branch should have a single, clear purpose.

### **Branch Protection (The Safety Net)**
Branch Protection Rules are settings on GitHub that technically enforce your team's workflow.
*   **Require a pull request before merging**: This is the most critical rule. It blocks direct pushes to `main`.
*   **Require approvals**: You can specify that 1 or more people must "Approve" a PR before it can be merged. (Set to 0 for solo development if needed).
*   **Require conversation resolution**: Ensures all comments are addressed before merging.
*   **Do not allow bypassing settings**: Ensures administrators also follow the rules.

### **The Pull Request (PR) Lifecycle**
1.  **Create a branch**: `git checkout -b my-feature`
2.  **Code and Commit**: `git add .` and `git commit -m "description"`
3.  **Push the branch**: `git push origin my-feature`
4.  **Open the PR**: Navigate to the provided URL or the GitHub Dashboard.
5.  **Assign Roles**: Use **Assignees** for the author and **Reviewers** for the person checking the code.
6.  **Code Review**: Reviewer approves via the "Files changed" tab.
7.  **Merge**: Click the green "Merge pull request" button.

### **Linear History & Merge Strategies**
*   **Squash and Merge (Recommended)**: Combines all commits from a feature branch into **one single commit** on `main`. Great for readability.
*   **Standard Merge**: Creates a "Merge Commit," which can make the history web-like and harder to follow.

### **Post-Merge Cleanup**
Once merged on GitHub:
```bash
git checkout main
git pull origin main
git branch -d your-feature-branch  # Use -D if you squashed
```

---

## 2. Backend Architecture: Functional vs. Class-Based

### **Functional / Module-Based (Current Project Style)**
This is the standard for Express-based apps. It uses `import/export` to organize functions.
*   **Standard**: Encapsulation via module exports, Singletons via shared imports (like Prisma).
*   **Pros**: Simplicity, less boilerplate, excellent tree-shaking, and easier testing for pure functions.
*   **Cons**: Dependency injection can be less explicit without external tools.

### **Class-Based Implementation**
Standard for frameworks like **NestJS**.
*   **Standard**: Explicit Dependency Injection through constructors, clear lifecycle management.
*   **Pros**: Highly organized for massive teams, very clear DI patterns.
*   **Cons**: More boilerplate ("ceremony"), overhead of managing `this` context.

### **Senior Developer’s Perspective: "Production-Standard"**
"Production-Standard" isn't about using classes; it's about **Consistency**, **Separation of Concerns**, and **Maintainability**.
1.  **Layers**: Clearly separate Routes, Controllers, and Services.
2.  **Error Handling**: Throw meaningful errors in services; handle them in controllers.
3.  **Validation**: Validate all inputs before they reach the business logic.
4.  **Security**: Integrate permission checks directly into the service layer.

### **Recommendation for This Project**
**Stick with the Functional/Module-based approach.** 
It is lightweight, highly readable, and follows the current industry trend in modern TypeScript/Node.js development. Forcing a class-based structure on a Prisma+Express app often adds more complexity than it solves.

---

## 3. Deep Dive: Scalability & Performance Review

### **The "Million User" Challenge**
The application is built on a solid architectural foundation (Domain-Driven Design), but handling high traffic requires addressing key bottlenecks.

*   **Availability Algorithm**: Current slot calculation can lead to "N+1" style database queries (firing thousands of queries for a single range check).
    *   **Solution**: Fetch all necessary host data, exceptions, and bookings in **bulk** and perform intersection logic in-memory.
*   **Caching Layer**: Public discovery endpoints (booking slots) should be protected by a caching layer (like Redis) to reduce primary database load.
*   **Concurrency**: Prevent race conditions (double-booking the same slot) using database transactions with advisory locks or unique constraints on `(hostUserId, startTime)`.

---

## 4. Technical Q&A: Server & Express Details

### **Graceful Shutdown**
Handling signals like `SIGINT` (Ctrl+C) and `SIGTERM` (Docker/Cloud stops) is critical. It allows the server to stop accepting new requests while finishing in-flight ones, preventing data loss or dropped connections during deployment.

### **Express Parameters (`req`, `res`, `next`)**
*   **`req` (Request)**: Contains the incoming data (body, params, headers).
*   **`res` (Response)**: Used to send data back to the client (`res.json()`).
*   **`next` (NextFunction)**: Used to pass control to the next middleware or error handler.
*   **`Promise<void>`**: Route handlers often return `void` because they send data via side effects (`res.json`) rather than returning values to the Express caller.

### **Security: HTTP-Only Cookies**
JWT tokens should be stored in `httpOnly` cookies. This prevents frontend JavaScript from accessing the token, providing a strong defense against XSS (Cross-Site Scripting) attacks.

---

## 5. Playbook: Organization Repository Setup

### **Access & Governance**
*   **Teams**: Use organization teams (Admin, Maintainer, Contributor) rather than individual permissions.
*   **Branching**: Use trunk-based development with short-lived feature branches.
*   **CI/CD**: Enforce linting, typechecking, and automated tests (unit/integration) as "Required Checks" in your branch protection rules.

### **Database Hygiene (Prisma)**
*   **Migrations**: Use `prisma migrate deploy` in production pipelines to apply changes safely.
*   **Indexing**: Ensure foreign keys and commonly filtered columns (like `startTime`) are properly indexed to maintain performance at scale.
