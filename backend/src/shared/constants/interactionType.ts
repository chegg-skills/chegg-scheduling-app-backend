/**
 * Structural capability flags for each interaction type.
 *
 * These constants are derived from the Prisma enum — not stored in the database
 * and not admin-configurable. All behavior conditional on interaction type must
 * read from this map rather than branching on the type name string.
 *
 * - **`multipleCoaches`** — whether multiple coaches participate simultaneously
 *   in a single session. Does NOT restrict coach pool size; ONE_TO_ONE and
 *   ONE_TO_MANY events can still maintain a multi-coach pool for ROUND_ROBIN
 *   rotation across bookings.
 *
 * - **`multipleParticipants`** — whether more than one student may book into
 *   the same session slot. When `true`, `bookingMode` is hard-locked to
 *   `FIXED_SLOTS`.
 *
 * - **`derivesLeadershipFromAssignment`** — when `true`, `sessionLeadershipStrategy`
 *   is always auto-derived from `assignmentStrategy` (DIRECT → FIXED_LEAD,
 *   ROUND_ROBIN → ROTATING_LEAD) and cannot be set manually by the user.
 *   Currently applies to MANY_TO_ONE and MANY_TO_MANY.
 */
export const INTERACTION_TYPE_CAPS = {
  ONE_TO_ONE: {
    multipleCoaches: false,
    multipleParticipants: false,
    derivesLeadershipFromAssignment: false,
  },
  ONE_TO_MANY: {
    multipleCoaches: false,
    multipleParticipants: true,
    derivesLeadershipFromAssignment: false,
  },
  MANY_TO_ONE: {
    multipleCoaches: true,
    multipleParticipants: false,
    derivesLeadershipFromAssignment: true,
  },
  MANY_TO_MANY: {
    multipleCoaches: true,
    multipleParticipants: true,
    derivesLeadershipFromAssignment: true,
  },
} as const;

/** Union of all valid interaction type keys. */
export type InteractionType = keyof typeof INTERACTION_TYPE_CAPS;

/** Capability flags for a single interaction type, as defined in `INTERACTION_TYPE_CAPS`. */
export type InteractionTypeCaps = (typeof INTERACTION_TYPE_CAPS)[InteractionType];

/** Short human-readable label for each interaction type, used in admin UI listings. */
export const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
  ONE_TO_ONE: "1 coach · 1 student per session",
  ONE_TO_MANY: "1 coach · multiple students per session",
  MANY_TO_ONE: "Coach pool · 1 student per session",
  MANY_TO_MANY: "Coach pool · multiple students per session",
};

/** All interaction type keys in insertion order, derived from `INTERACTION_TYPE_CAPS`. */
export const INTERACTION_TYPE_KEYS = Object.keys(INTERACTION_TYPE_CAPS) as InteractionType[];
