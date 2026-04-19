export const INTERACTION_TYPE_CAPS = {
  ONE_TO_ONE:  { multipleCoaches: false, multipleParticipants: false, derivesLeadershipFromAssignment: false },
  ONE_TO_MANY: { multipleCoaches: false, multipleParticipants: true,  derivesLeadershipFromAssignment: false },
  MANY_TO_ONE: { multipleCoaches: true,  multipleParticipants: false, derivesLeadershipFromAssignment: true  },
  MANY_TO_MANY:{ multipleCoaches: true,  multipleParticipants: true,  derivesLeadershipFromAssignment: true  },
} as const

export type InteractionType = keyof typeof INTERACTION_TYPE_CAPS

export const INTERACTION_TYPE_OPTIONS: Array<{
  key: InteractionType
  label: string
  description: string
}> = [
    {
      key: 'ONE_TO_ONE',
      label: 'One-to-One',
      description: '1 coach · 1 student per session',
    },
    {
      key: 'ONE_TO_MANY',
      label: 'One-to-Many',
      description: '1 coach · multiple students per session',
    },
    {
      key: 'MANY_TO_ONE',
      label: 'Many-to-One',
      description: 'Coach pool · 1 student per session',
    },
    {
      key: 'MANY_TO_MANY',
      label: 'Many-to-Many',
      description: 'Coach pool · multiple students per session',
    },
  ]
