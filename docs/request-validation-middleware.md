# Request Validation Middleware & `Object.defineProperty` Deep-Dive

This document explains the backend HTTP request validation architecture (`backend/src/shared/middleware/validate.ts`), focusing on Zod schema parsing, Express request object mutation using JavaScript's `Object.defineProperty`, and the multi-layered validation pattern.

---

## 1. Overview of the `validate` Middleware

Every incoming HTTP request with query parameters, body payloads, or URL parameters passes through the `validate` higher-order middleware before hitting the controller:

```typescript
// Example from event.router.ts
router.route("/teams/:teamId/events").post(
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
  validate(CreateEventSchema), // 👈 Validation Middleware
  eventController.createEvent
);
```

### Source Code (`backend/src/shared/middleware/validate.ts`)

```typescript
import { Request, Response, NextFunction } from "express";
import { ZodType } from "zod";

interface ValidationSchema {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

export const validate = (schema: ValidationSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schema.params) {
        const validatedParams = await schema.params.parseAsync(req.params);
        Object.defineProperty(req, "params", {
          value: validatedParams,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }
      if (schema.query) {
        const validatedQuery = await schema.query.parseAsync(req.query);
        Object.defineProperty(req, "query", {
          value: validatedQuery,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      return next();
    } catch (error) {
      return next(error);
    }
  };
};
```

---

## 2. Why `Object.defineProperty` is Used for `params` and `query`

### The Problem with Direct Assignment
In Express.js, `req.params` and `req.query` are defined as **read-only getters** on Express's internal `IncomingMessage` prototype. 

If you try to write a simple direct assignment:
```typescript
// ❌ WRONG — Node/Express throws TypeError in strict mode!
req.params = validatedParams;
```
Express will raise an exception: `TypeError: Cannot assign to read only property 'params' of object '#<IncomingMessage>'`.

### The Solution: Property Descriptor Overriding
To replace the raw string parameters with sanitized, type-coerced Zod outputs (e.g. converting string IDs to validated UUIDs), we must use `Object.defineProperty()` to redefine the property directly on the request instance `req`.

```typescript
Object.defineProperty(req, "params", {
  value: validatedParams,
  writable: true,
  enumerable: true,
  configurable: true,
});
```

### Breakdown of Descriptor Flags

| Flag | Value | Purpose |
|---|---|---|
| **`value`** | `validatedParams` | Sets the actual sanitized Zod output object to be stored under `req.params`. |
| **`writable`** | `true` | Allows downstream handlers/controllers to modify properties on `req.params` if needed. |
| **`enumerable`** | `true` | Ensures `req.params` shows up during object iteration (`Object.keys(req)` or `console.log(req)`). |
| **`configurable`** | `true` | Allows subsequent middleware or testing mocks to redefine or delete the property if required. |

---

## 3. Defense-in-Depth: Router vs. Service Layer Validation

Why is Zod validation executed at both the HTTP Router level AND inside the Domain Service layer (`resolveCreateEventContext`)?

```
[ HTTP Layer ]  --->  Router Middleware (validate.ts)  ---> Stops bad HTTP requests early (400 Bad Request)
                                 │
                                 ▼
[ Service Layer ] --->  Domain Service (.parse(payload))  ---> Guarantees domain rules & defaults when 
                                                               functions are called internally / via CLI
```

1. **Router Layer (`validate(CreateEventSchema)`)**: Acts as the HTTP boundary guard. Rejects malformed network requests immediately before invoking controller logic.
2. **Service Layer (`CreateEventSchema.body.parse(payload)`)**: Ensures that service methods stay 100% self-contained and type-safe even when called outside HTTP requests (e.g., background workers, internal seeds, or unit tests). It also narrows TypeScript types so optional fields are assigned their concrete default values.
