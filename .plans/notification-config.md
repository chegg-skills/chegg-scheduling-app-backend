# Team Notification Configuration

## Context

All notification behavior is currently hardcoded: who receives what, when reminders fire, and whether admin/coach alerts are sent. There is no way to change this from the UI. The goal is a per-team configuration panel that lets SUPER_ADMIN and TEAM_ADMIN control:
- **Which session reminders to send** (24h before, 1h before, both, or none)
- **Whether team admins receive booking confirmations** (noisy for high-volume teams)
- **Whether coaches receive booking assignment emails**
- **Whether team leads receive availability exception alerts**

---

## Strategic decision: build it vs leave it hardcoded

**Leave hardcoded** if the team has one configuration and will never need to change it. The current system is correct and complete.

**Build configurability** because: reminder timing is the #1 request from high-volume teams; admin booking notification spam is a real UX problem; team-level control is the natural next administrative feature after team management is complete. The architecture (RabbitMQ, notification DB, scheduler) is already mature enough to support it cleanly.

**Scope boundary for V1:** Team-level settings only. No per-user opt-outs, no custom templates, no SMS/Push, no workflow builder. Settings are checked at publish time in the backend (before RabbitMQ), not in the notification service.

---

## Architecture

### New DB model — `backend/prisma/schema.prisma`

```prisma
model TeamNotificationConfig {
  id                       String   @id @default(uuid())
  teamId                   String   @unique
  team                     Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  reminderOffsets          Int[]    @default([1440, 60])   // minutes before session
  notifyAdminOnBooking     Boolean  @default(true)
  notifyCoachOnBooking     Boolean  @default(true)
  notifyLeadOnAvailability Boolean  @default(true)
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt
}
```

Add back-relation to `Team`:
```prisma
notificationConfig  TeamNotificationConfig?
```

**V1 reminder offset constraint:** The UI only exposes the two existing offsets — `1440` (24h) and `60` (1h) — as checkboxes. The DB column is `Int[]` so future offsets (48h, 30min, etc.) can be added once the notification service has corresponding templates. No schema change needed to expand.

Migration: `npx prisma migrate dev --name add_team_notification_config` — single `CREATE TABLE`, safe on live data (no `ALTER TABLE` on existing tables).

---

## Implementation Steps

### 1. Shared config loader — `backend/src/shared/notifications/notificationConfig.ts` (new file)

```typescript
import { prisma } from "../db/prisma";

export type ResolvedNotificationConfig = {
  reminderOffsets: number[];
  notifyAdminOnBooking: boolean;
  notifyCoachOnBooking: boolean;
  notifyLeadOnAvailability: boolean;
};

const DEFAULT_CONFIG: ResolvedNotificationConfig = {
  reminderOffsets: [1440, 60],
  notifyAdminOnBooking: true,
  notifyCoachOnBooking: true,
  notifyLeadOnAvailability: true,
};

export async function getTeamNotificationConfig(teamId: string): Promise<ResolvedNotificationConfig> {
  const row = await prisma.teamNotificationConfig.findUnique({
    where: { teamId },
    select: {
      reminderOffsets: true,
      notifyAdminOnBooking: true,
      notifyCoachOnBooking: true,
      notifyLeadOnAvailability: true,
    },
  });
  return row ?? DEFAULT_CONFIG;
}
```

Returns `DEFAULT_CONFIG` when no row exists — callers never branch on null.

---

### 2. Update `backend/src/domain/bookings/booking.notification.ts`

**`queueStudentReminder`** — generalize from hardcoded `hoursBefore: 24 | 1` to offset-driven:

```typescript
const OFFSET_TO_TYPE: Record<number, Extract<NotificationType, "SESSION_REMINDER_24H" | "SESSION_REMINDER_1H">> = {
  1440: "SESSION_REMINDER_24H",
  60: "SESSION_REMINDER_1H",
};

const queueStudentReminderByOffset = async (booking: SafeBooking, offsetMinutes: number): Promise<boolean> => {
  const type = OFFSET_TO_TYPE[offsetMinutes];
  if (!type) return false; // unknown offset — no template exists yet
  const sendAt = buildReminderSendAt(new Date(booking.startTime), offsetMinutes / 60);
  if (!sendAt) return false;
  return publishNotificationSafely({
    type,
    recipients: booking.studentEmail,
    userId: booking.coachUserId,
    variables: await getBookingNotificationVariables(booking, booking.timezone),
    sendAt,
    notificationKey: `booking:${booking.id}:${type}`,
    entityType: "BOOKING",
    entityId: booking.id,
    recipientRole: "STUDENT",
    metadata: { bookingId: booking.id, reminderOffsetMinutes: offsetMinutes },
  });
};
```

**`queueBookingReminderNotifications`** — accept config, iterate offsets:

```typescript
const queueBookingReminderNotifications = async (booking: SafeBooking, config: ResolvedNotificationConfig): Promise<void> => {
  if (config.reminderOffsets.length === 0) return;
  try {
    await Promise.all(config.reminderOffsets.map((offset) => queueStudentReminderByOffset(booking, offset)));
  } catch (error) {
    logger.error("Failed to queue booking reminders.", { bookingId: booking.id, error });
  }
};
```

**`queueBookingCreatedNotifications`** — fetch config at top, gate coach + admin + reminders:

```typescript
const config = await getTeamNotificationConfig(booking.teamId);

// Coach notification — guarded
if (booking.coach?.email && config.notifyCoachOnBooking) {
  publishTasks.push(publishNotificationSafely({ type: "COACH_BOOKING_ASSIGNED", ... }));
}

// Admin fan-out — guarded
if (config.notifyAdminOnBooking) {
  const teamAdmins = await getTeamAdminRecipients(booking.teamId);
  for (const admin of teamAdmins) {
    publishTasks.push(publishNotificationSafely({ type: "TEAM_BOOKING_CONFIRMED", ... }));
  }
}

await queueBookingReminderNotifications(booking, config);
```

**`queueBookingStatusNotifications`** — fetch config at top, gate admin fan-out for CANCELLED and NO_SHOW:

```typescript
const config = await getTeamNotificationConfig(booking.teamId);
// Gate the "for (const admin of teamAdmins)" blocks inside the CANCELLED and NO_SHOW branches
if (config.notifyAdminOnBooking) { ... }
```

**`queueBookingRescheduledNotifications`** — fetch config, pass to `queueBookingReminderNotifications`:

```typescript
const config = await getTeamNotificationConfig(booking.teamId);
await cancelScheduledBookingReminders(booking);
await queueBookingReminderNotifications(booking, config);
```

---

### 3. Update `backend/src/domain/availability/availability.notification.ts`

The current implementation batches all team lead emails into one `publishNotificationSafely` call. To apply per-team config, switch to a per-team loop:

```typescript
// Replace the current single-batch lead notification:
const teams = await prisma.team.findMany({
  where: { members: { some: { userId: input.userId, isActive: true } }, isActive: true },
  select: { id: true, teamLead: { select: { email: true, id: true } } },
});

for (const team of teams) {
  const config = await getTeamNotificationConfig(team.id);
  if (!config.notifyLeadOnAvailability) continue;
  if (!team.teamLead?.email) continue;
  await publishNotificationSafely({
    type: "AVAILABILITY_EXCEPTION_CREATED",
    recipients: team.teamLead.email,
    userId: input.userId,
    variables: { userName, date: dateStr, timeRange: timeStr, frontendUrl, isSelfNotification: false },
  });
}
```

---

### 4. Backend API — extend `backend/src/domain/teams/`

Add three new files alongside the existing team domain files:

**`team.notificationConfig.schema.ts`:**
```typescript
export const GetNotificationConfigSchema = {
  params: z.object({ teamId: z.string().uuid() }),
};

export const UpsertNotificationConfigSchema = {
  params: z.object({ teamId: z.string().uuid() }),
  body: z.object({
    reminderOffsets: z.array(z.number().int().nonnegative().max(10080))
      .refine((arr) => new Set(arr).size === arr.length, "Duplicate offsets not allowed"),
    notifyAdminOnBooking: z.boolean(),
    notifyCoachOnBooking: z.boolean(),
    notifyLeadOnAvailability: z.boolean(),
  }),
};
```

**`team.notificationConfig.service.ts`:**
```typescript
// getNotificationConfig(teamId, caller) — uses getManagedTeam for TEAM_ADMIN access check
// upsertNotificationConfig(teamId, data, caller) — prisma.teamNotificationConfig.upsert
```

Use the existing `getManagedTeam` (or equivalent) for ownership enforcement — same pattern as `updateTeam`.

**`team.notificationConfig.controller.ts`:**
```typescript
export const getNotificationConfig = async (req, res, next) => { ... }
export const upsertNotificationConfig = async (req, res, next) => { ... }
```

**Add routes to `backend/src/domain/teams/team.router.ts`** (no separate file needed — stays in the same team router):

```typescript
router
  .route("/:teamId/notification-config")
  .get(authenticate, authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN), validate(GetNotificationConfigSchema), teamNotifConfigController.getNotificationConfig)
  .put(authenticate, authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN), validate(UpsertNotificationConfigSchema), teamNotifConfigController.upsertNotificationConfig)
  .all(methodNotAllowed);
```

**API contract:**

`GET /teams/:teamId/notification-config` → returns current config or defaults if not yet saved.

`PUT /teams/:teamId/notification-config` → full replace via upsert. Response shape same as GET.

---

### 5. Frontend types — `frontend/src/types/index.ts`

```typescript
export interface TeamNotificationConfig {
  teamId: string
  reminderOffsets: number[]
  notifyAdminOnBooking: boolean
  notifyCoachOnBooking: boolean
  notifyLeadOnAvailability: boolean
}
```

---

### 6. Frontend API — `frontend/src/api/teams.ts`

Add to `teamsApi`:

```typescript
getNotificationConfig: (teamId: string, signal?: AbortSignal) =>
  apiClient.get<ApiResponse<TeamNotificationConfig>>(`/teams/${teamId}/notification-config`, { signal }),

upsertNotificationConfig: (teamId: string, data: Omit<TeamNotificationConfig, 'teamId'>) =>
  apiClient.put<ApiResponse<TeamNotificationConfig>>(`/teams/${teamId}/notification-config`, data),
```

---

### 7. Frontend hooks — `frontend/src/hooks/queries/useTeams.ts`

Add:

```typescript
export const teamNotifKeys = {
  config: (teamId: string) => [...teamKeys.all, 'notification-config', teamId] as const,
}

export function useTeamNotificationConfig(teamId: string) {
  return useQuery({
    queryKey: teamNotifKeys.config(teamId),
    queryFn: ({ signal }) => teamsApi.getNotificationConfig(teamId, signal).then((r) => r.data.data!),
    enabled: !!teamId,
  })
}

export function useUpsertTeamNotificationConfig(teamId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<TeamNotificationConfig, 'teamId'>) =>
      teamsApi.upsertNotificationConfig(teamId, data),
    onSuccess: () => invalidateQueryKeys(qc, [teamNotifKeys.config(teamId)]),
  })
}
```

---

### 8. Frontend component — `frontend/src/components/teams/tabs/TeamNotificationsTab.tsx` (new file)

```typescript
interface TeamNotificationsTabProps {
  teamId: string
  canEdit: boolean
}
```

- Fetches its own data via `useTeamNotificationConfig(teamId)` (same pattern as `TeamEventsTab`)
- `useUpsertTeamNotificationConfig` for saving
- Form managed with `useState` (not react-hook-form — config is simple enough)

**Reminder section:** Two `Checkbox` + `FormControlLabel` items (24h and 1h only for V1 — other offsets require new notification service templates before they can be exposed):

```
☑ 24 hours before  (value: 1440)
☑ 1 hour before    (value: 60)
```

**Three `Switch` + `FormControlLabel` toggles:**
1. "Notify team admins on new bookings" — `notifyAdminOnBooking`
2. "Notify assigned coach on new bookings" — `notifyCoachOnBooking`
3. "Notify team lead on availability exceptions" — `notifyLeadOnAvailability`

**Initial state:** pre-populated from `useTeamNotificationConfig` so users see the current effective behavior (defaults match hardcoded behavior — no config row = same as all-on + both reminders).

**Save button:** disabled while pending. Show `Alert severity="success"` inline on save success (MUI Alert, consistent with existing patterns).

---

### 9. Update `frontend/src/pages/TeamDetailPage.tsx`

1. Import `Bell` from `lucide-react`
2. Import `TeamNotificationsTab`
3. Introduce `canEditTeam = user?.role === 'SUPER_ADMIN'` for destructive actions (edit/delete/toggle); update `canManageTeam` to `user?.role === 'SUPER_ADMIN' || user?.role === 'TEAM_ADMIN'` for tab visibility
4. Add third `<Tab>` with Bell icon ("Notifications")
5. Add `<TabPanel value={tabValue} index={2} prefix="team">` containing `<TeamNotificationsTab>`
6. Hide the "New event / Add member" button when `tabValue === 2`

---

## Critical Files

| File | Change |
|---|---|
| `backend/prisma/schema.prisma` | Add `TeamNotificationConfig` model + back-relation on `Team` |
| `backend/src/shared/notifications/notificationConfig.ts` | New: `getTeamNotificationConfig` loader |
| `backend/src/domain/bookings/booking.notification.ts` | Generalize reminders; gate coach/admin notifications with config |
| `backend/src/domain/availability/availability.notification.ts` | Per-team config loop for lead alerts |
| `backend/src/domain/teams/team.router.ts` | Add `/:teamId/notification-config` GET + PUT |
| `backend/src/domain/teams/team.notificationConfig.service.ts` | New: get + upsert service |
| `backend/src/domain/teams/team.notificationConfig.controller.ts` | New: thin controller |
| `backend/src/domain/teams/team.notificationConfig.schema.ts` | New: Zod schemas |
| `frontend/src/types/index.ts` | Add `TeamNotificationConfig` |
| `frontend/src/api/teams.ts` | Add `getNotificationConfig` + `upsertNotificationConfig` |
| `frontend/src/hooks/queries/useTeams.ts` | Add `useTeamNotificationConfig` + `useUpsertTeamNotificationConfig` |
| `frontend/src/components/teams/tabs/TeamNotificationsTab.tsx` | New: form component |
| `frontend/src/pages/TeamDetailPage.tsx` | Add Notifications tab; split `canManageTeam` / `canEditTeam` |

---

## Verification

```bash
# 1. Migration
cd backend && npx prisma migrate dev --name add_team_notification_config

# 2. Backend build + tests
npm run build
npm run test

# Manual smoke tests:
# A. Default behavior preserved — create a team, create a booking, verify
#    24h + 1h reminders queued, coach email sent, admin email sent (no config row yet)
# B. Disable admin notifications — open team → Notifications tab, uncheck admin toggle,
#    save, create a new booking → no TEAM_BOOKING_CONFIRMED in notification logs
# C. Disable all reminders — uncheck both reminder boxes, save, create booking →
#    no SCHEDULED notifications in notification-service DB
# D. 1h-only reminders — uncheck 24h, keep 1h, create booking →
#    only SESSION_REMINDER_1H in notification-service DB
# E. Availability alerts off — uncheck availability toggle, set an availability exception →
#    no team lead email queued (user self-notification still fires)
# F. TEAM_ADMIN access — log in as TEAM_ADMIN, open team → Notifications tab visible,
#    config saves successfully
```
