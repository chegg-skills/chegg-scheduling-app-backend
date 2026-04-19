export const INTERACTION_TYPE_CAPS = {
  ONE_TO_ONE:  { multipleCoaches: false, multipleParticipants: false, derivesLeadershipFromAssignment: false },
  ONE_TO_MANY: { multipleCoaches: false, multipleParticipants: true,  derivesLeadershipFromAssignment: false },
  MANY_TO_ONE: { multipleCoaches: true,  multipleParticipants: false, derivesLeadershipFromAssignment: true  },
  MANY_TO_MANY:{ multipleCoaches: true,  multipleParticipants: true,  derivesLeadershipFromAssignment: true  },
} as const;

export type InteractionType = keyof typeof INTERACTION_TYPE_CAPS;
export type InteractionTypeCaps = (typeof INTERACTION_TYPE_CAPS)[InteractionType];

export const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
  ONE_TO_ONE: "1 coach · 1 student per session",
  ONE_TO_MANY: "1 coach · multiple students per session",
  MANY_TO_ONE: "Coach pool · 1 student per session",
  MANY_TO_MANY: "Coach pool · multiple students per session",
};

export const INTERACTION_TYPE_KEYS = Object.keys(INTERACTION_TYPE_CAPS) as InteractionType[];




