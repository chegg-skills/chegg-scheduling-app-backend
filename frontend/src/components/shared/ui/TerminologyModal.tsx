import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Stack,
} from '@mui/material'
import { Search, X, BookOpen } from 'lucide-react'
import { Button } from './Button'
import { alpha, useTheme } from '@mui/material/styles'

interface TerminologyModalProps {
  open: boolean
  onClose: () => void
}

interface GlossaryItem {
  term: string
  definition: string
  category: 'Core Concept' | 'Role' | 'Scheduling Mode' | 'System Feature'
}

const GLOSSARY_ITEMS: GlossaryItem[] = [
  // ─── Core Concept ────────────────────────────────────────────
  {
    term: 'Booking Directory',
    definition:
      'A curated, publicly accessible landing page with a unique URL (e.g. /book/sessions/default). Admins configure which session types and teams appear on it so students can discover and book sessions without needing a direct event link.',
    category: 'Core Concept',
  },
  {
    term: 'Event',
    definition:
      'The primary bookable entity in the system. An event defines a specific coaching session — its name, duration, location, interaction type, booking mode, coach pool, availability rules, and all scheduling policies. Students book events.',
    category: 'Core Concept',
  },
  {
    term: 'Event Type',
    definition:
      'A label or category used to group related events (e.g. "Front-End Tutoring" or "Live Assessment"). Event types help admins organise events and can drive filtering in the UI. They are not scheduling entities themselves.',
    category: 'Core Concept',
  },
  {
    term: 'Session Type',
    definition:
      'A broad organisation-level category (e.g. "One-to-One Coaching" or "Cohort Reviews") used to group events across teams on a Booking Directory. Only Super Admins can create or manage session types.',
    category: 'Core Concept',
  },
  {
    term: 'Team',
    definition:
      'A group of coaches who share a set of events and availability. Each event belongs to exactly one team. Teams have their own notification settings, a public booking slug, and a designated Team Lead.',
    category: 'Core Concept',
  },
  {
    term: 'Team Member',
    definition:
      "A user who has been added to a team, making them eligible to be assigned as a coach on that team's events. Being a team member does not automatically assign the coach to any event — that requires explicit assignment to the event's coach pool.",
    category: 'Core Concept',
  },
  {
    term: 'Booking',
    definition:
      'A confirmed reservation made by a student for a specific event and time slot. A booking links a student to an event, an assigned coach, and a start time. Its lifecycle progresses through: Confirmed → Completed or Cancelled / No-Show.',
    category: 'Core Concept',
  },
  {
    term: 'Schedule Slot',
    definition:
      'A pre-created time slot on a Fixed Slots event. Admins create slots with a specific date, start time, end time, and optional participant capacity. Students can only book into existing slots — they cannot choose arbitrary times.',
    category: 'Core Concept',
  },
  {
    term: 'Coach Pool',
    definition:
      "The set of coaches assigned to a specific event. When a student books, the system selects a coach from this pool based on the event's assignment strategy (Direct or Round Robin). Pool size constraints (min/max coach count) are enforced per event.",
    category: 'Core Concept',
  },
  {
    term: 'Event Group',
    definition:
      'A visual grouping of related events displayed together in the schedule view. Event groups have a name, description, colour, and a public slug for direct booking links (e.g. /book/group/:slug).',
    category: 'Core Concept',
  },
  {
    term: 'Interaction Type',
    definition:
      'A hardcoded structural format that defines the coach-to-student ratio for an event. The four types are: ONE_TO_ONE, ONE_TO_MANY, MANY_TO_ONE, and MANY_TO_MANY. Interaction types are not admin-configurable — they are system constants.',
    category: 'Core Concept',
  },
  {
    term: 'Public Booking Slug',
    definition:
      'A unique, URL-friendly identifier assigned to a team, event, coach, or event group. It powers direct booking links (e.g. /book/event/front-end-tutoring). Slugs are auto-generated from the entity name and can be customised.',
    category: 'Core Concept',
  },
  {
    term: 'Student Roster',
    definition:
      'A central directory of all students who have booked at least one session. Student profiles are created automatically on first booking and include contact info, booking history, session notes, and communication logs.',
    category: 'Core Concept',
  },
  {
    term: 'Recurrence Series',
    definition:
      'A set of Fixed Slots schedule slots that share a recurrence pattern (e.g. every Monday at 3pm). Slots in a series are linked by a recurrence group ID and can be managed together in the schedule view.',
    category: 'Core Concept',
  },

  // ─── Role ─────────────────────────────────────────────────────
  {
    term: 'Super Admin',
    definition:
      'The highest-privilege role with system-wide access. Super Admins can manage all users, teams, events, session types, booking directories, and system configuration. Only one Super Admin account is created at bootstrap.',
    category: 'Role',
  },
  {
    term: 'Team Admin',
    definition:
      "A role with management access scoped to their assigned team(s). Team Admins can manage events, coach pools, schedule slots, bookings, and students within their team. They cannot access system-wide settings or other teams' data.",
    category: 'Role',
  },
  {
    term: 'Coach',
    definition:
      'A user who delivers coaching sessions. Coaches can view their own bookings, log session notes, and manage their weekly availability. They cannot create or edit events unless granted elevated access by a Team Admin.',
    category: 'Role',
  },
  {
    term: 'Student',
    definition:
      'A person who books coaching sessions through the public booking flow. Students are not system user accounts — they are identified by email address. A student profile is created automatically on their first booking.',
    category: 'Role',
  },
  {
    term: 'Lead Coach',
    definition:
      'The primary coach responsible for conducting a session. For multi-coach events (MANY_TO_ONE or MANY_TO_MANY), the lead coach is determined by the session leadership strategy (Fixed Lead or Rotating Lead). The lead coach logs session notes.',
    category: 'Role',
  },
  {
    term: 'Co-Coach',
    definition:
      'A supporting coach who joins the lead coach in a session. Applicable to MANY_TO_ONE and MANY_TO_MANY events. The number of co-coaches per session is controlled by the "Co-hosts per session" setting on the event.',
    category: 'Role',
  },

  // ─── Scheduling Mode ──────────────────────────────────────────
  {
    term: 'ONE_TO_ONE',
    definition:
      'An interaction type where one coach works with one student per session. The most common format for individual tutoring. Uses Coach Availability booking mode — students pick any available time slot.',
    category: 'Scheduling Mode',
  },
  {
    term: 'ONE_TO_MANY',
    definition:
      'An interaction type where one coach works with multiple students simultaneously. Used for group workshops or review sessions. Requires Fixed Slots booking mode. Students book into pre-created slots with a participant capacity.',
    category: 'Scheduling Mode',
  },
  {
    term: 'MANY_TO_ONE',
    definition:
      'An interaction type where multiple coaches work together with a single student. One coach is the lead; others join as co-coaches. Uses Coach Availability booking mode. Session leadership is auto-derived from the assignment strategy.',
    category: 'Scheduling Mode',
  },
  {
    term: 'MANY_TO_MANY',
    definition:
      'An interaction type where multiple coaches work with multiple students in the same session. Requires Fixed Slots booking mode. All participants in a slot share the same coaching team. Session leadership is auto-derived from the assignment strategy.',
    category: 'Scheduling Mode',
  },
  {
    term: 'Coach Availability Mode',
    definition:
      "A booking mode where students can book any time the assigned coach is available, within the event's configured availability windows. The system generates slots dynamically based on coach schedules. Used for ONE_TO_ONE and MANY_TO_ONE events.",
    category: 'Scheduling Mode',
  },
  {
    term: 'Fixed Slots Mode',
    definition:
      'A booking mode where admins pre-create specific schedule slots that students can book into. Students cannot choose arbitrary times — they select from the available pre-created slots. Required for all group session types (ONE_TO_MANY, MANY_TO_MANY).',
    category: 'Scheduling Mode',
  },
  {
    term: 'Round Robin Assignment',
    definition:
      'An assignment strategy that rotates coach selection fairly across the coach pool. Each new booking advances the cursor to the next coach in the pool by their assigned order, ensuring balanced workload distribution.',
    category: 'Scheduling Mode',
  },
  {
    term: 'Direct Assignment',
    definition:
      'An assignment strategy that always selects a specific designated coach. For Fixed Lead events, this means the same pinned coach leads every session. For non-fixed events, the first coach in the pool is always selected.',
    category: 'Scheduling Mode',
  },
  {
    term: 'Fixed Lead',
    definition:
      'A session leadership strategy where a designated coach (set via "Fixed Lead Coach") always leads the session regardless of booking order. Used for multi-coach events where a specific coach must always be the lead. Paired with Direct assignment.',
    category: 'Scheduling Mode',
  },
  {
    term: 'Rotating Lead',
    definition:
      'A session leadership strategy where the lead coach rotates through the pool on each booking, following the same Round Robin order. Used for multi-coach events with fair lead rotation. Auto-derived from Round Robin assignment strategy.',
    category: 'Scheduling Mode',
  },
  {
    term: '1:1 Session',
    definition:
      "A private booking reserved for a single student and one coach. Maps to the ONE_TO_ONE interaction type. The student books directly into the coach's available time via the public booking flow.",
    category: 'Scheduling Mode',
  },
  {
    term: 'Group Session',
    definition:
      'A session where multiple students book into the same time slot, all attending together. Maps to ONE_TO_MANY or MANY_TO_MANY interaction types. Requires Fixed Slots mode with a defined participant capacity per slot.',
    category: 'Scheduling Mode',
  },
  {
    term: 'Booking Window',
    definition:
      "The maximum number of days ahead a student can book a session (1–365 days, or unlimited if not set). Enforced on both the backend slot generation and the frontend date picker. Anchored to the student's local timezone.",
    category: 'Scheduling Mode',
  },
  {
    term: 'Minimum Notice',
    definition:
      'The minimum amount of lead time (in minutes) required before a session can be booked. For example, a 24-hour minimum notice (1440 minutes) prevents students from booking sessions starting within the next 24 hours.',
    category: 'Scheduling Mode',
  },
  {
    term: 'Buffer Time',
    definition:
      'An enforced gap after a session (in minutes) during which the coach is treated as unavailable. Prevents back-to-back bookings by blocking the time immediately following a completed session. Set per event.',
    category: 'Scheduling Mode',
  },

  // ─── System Feature ───────────────────────────────────────────
  {
    term: 'Session Logs & Notes',
    definition:
      'A post-session record created by the lead coach after a Fixed Slots session. Captures topics discussed, a session summary, private coach-only notes, and per-student attendance status. Accessible to Team Admins and Super Admins.',
    category: 'System Feature',
  },
  {
    term: 'Session Attendance',
    definition:
      "A per-student attendance record linked to a session log. Each booking in a completed slot is marked as attended or no-show when the coach logs the session. Attendance status updates the booking's status (Completed or No-Show).",
    category: 'System Feature',
  },
  {
    term: 'Deferred Coach Reveal',
    definition:
      "A feature for ONE_TO_MANY events where the assigned coach's identity is hidden from students at booking time. Students receive a confirmation email with no coach name or join URL. An admin manually triggers the reveal, which sends the coach details to all participants at once.",
    category: 'System Feature',
  },
  {
    term: 'Weekly Availability',
    definition:
      "A coach's recurring weekly schedule defining which days and hours they are available for bookings (e.g. Mon–Fri, 9am–5pm). Stored and evaluated in the coach's own timezone. Admins and coaches can configure this from the user profile.",
    category: 'System Feature',
  },
  {
    term: 'Availability Exception',
    definition:
      "A one-off override to a coach's weekly availability schedule. Can mark a specific date as fully unavailable, or define a narrower/wider time window for a single day. Takes precedence over the recurring weekly schedule.",
    category: 'System Feature',
  },
  {
    term: 'Booking Status',
    definition:
      'The lifecycle state of a booking. States: Confirmed (active reservation), Cancelled (student or admin cancelled), Completed (session occurred and was logged), No-Show (student did not attend). Pending is rarely used as most bookings confirm immediately.',
    category: 'System Feature',
  },
  {
    term: 'Notifications & Reminders',
    definition:
      'Automated emails sent to students and coaches on booking events (confirmation, cancellation, reschedule) and before sessions (reminders at configurable offsets, e.g. 24 hours and 1 hour before). Configured per team via Team Notification Settings.',
    category: 'System Feature',
  },
  {
    term: 'Communications',
    definition:
      'A log of all outbound emails sent to a student from the platform, including booking confirmations, reminders, admin-initiated emails, and retry attempts. Accessible from the student detail page. Shows sent, pending, and failed delivery statuses.',
    category: 'System Feature',
  },
  {
    term: 'Reports',
    definition:
      'A data export and analytics feature available to Super Admins and Team Admins. Provides downloadable CSV reports of booking activity, session outcomes, and student engagement across configurable date ranges.',
    category: 'System Feature',
  },
  {
    term: 'Booking Conflict Prevention',
    definition:
      'A backend mechanism using database-level pessimistic locking to prevent two students from booking the same coach at the same time. Applied on every booking creation and reschedule, with a 15-second transaction timeout to prevent deadlocks.',
    category: 'System Feature',
  },
  {
    term: 'SSO / Single Sign-On',
    definition:
      'An authentication method allowing invited users to sign in via Okta instead of a password. SSO users have no stored password in the system. SSO invites are marked separately and cannot be accepted via the standard password form.',
    category: 'System Feature',
  },
  {
    term: 'Timezone Support',
    definition:
      "All times in the system are stored in UTC. Coach availability is evaluated in the coach's stored timezone. Students see all slot times in their local browser timezone (auto-detected, and changeable during booking). Booking confirmation emails use each recipient's own timezone.",
    category: 'System Feature',
  },
]

export function TerminologyModal({ open, onClose }: TerminologyModalProps) {
  const theme = useTheme()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const filteredItems = GLOSSARY_ITEMS.filter((item) => {
    const matchesSearch =
      item.term.toLowerCase().includes(search.toLowerCase()) ||
      item.definition.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = selectedCategory ? item.category === selectedCategory : true
    return matchesSearch && matchesCategory
  })

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Core Concept':
        return theme.palette.primary.main
      case 'Role':
        return theme.palette.secondary.main
      case 'Scheduling Mode':
        return theme.palette.success.main
      case 'System Feature':
        return theme.palette.info.main
      default:
        return theme.palette.text.secondary
    }
  }

  const categories = Array.from(new Set(GLOSSARY_ITEMS.map((item) => item.category)))

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2.5,
          boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
        },
      }}
    >
      <DialogTitle sx={{ p: 3, pb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              p: 1,
              borderRadius: '8px',
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: 'primary.main',
              display: 'flex',
            }}
          >
            <BookOpen size={20} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              System Terminology & Glossary
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Quick guide to scheduling terms and concepts used across the application
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 3, pt: 0, pb: 1 }} dividers>
        <Stack spacing={2.5} sx={{ py: 1.5 }}>
          {/* Search Box */}
          <TextField
            fullWidth
            size="small"
            placeholder="Search glossary terms or descriptions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} color={theme.palette.text.secondary} />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch('')} edge="end">
                    <X size={14} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
              },
            }}
          />

          {/* Category Filter Chips */}
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ gap: 1 }}>
            <Chip
              label="All Categories"
              size="small"
              onClick={() => setSelectedCategory(null)}
              variant={selectedCategory === null ? 'filled' : 'outlined'}
              color="primary"
              sx={{ fontWeight: 600, borderRadius: '6px' }}
            />
            {categories.map((category) => (
              <Chip
                key={category}
                label={category}
                size="small"
                onClick={() => setSelectedCategory(category)}
                variant={selectedCategory === category ? 'filled' : 'outlined'}
                sx={{
                  fontWeight: 600,
                  borderRadius: '6px',
                  borderColor: alpha(getCategoryColor(category), 0.3),
                  color: selectedCategory === category ? '#fff' : getCategoryColor(category),
                  bgcolor: selectedCategory === category ? getCategoryColor(category) : 'transparent',
                  '&:hover': {
                    bgcolor: selectedCategory === category ? getCategoryColor(category) : alpha(getCategoryColor(category), 0.05),
                  },
                }}
              />
            ))}
          </Stack>

          {/* Glossary list */}
          <Box sx={{ maxHeight: 380, overflowY: 'auto', pr: 0.5 }}>
            {filteredItems.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  No glossary items found matching "{search}"
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {filteredItems.map((item) => {
                  const catColor = getCategoryColor(item.category)
                  return (
                    <Box
                      key={item.term}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.default',
                        transition: 'all 0.15s ease-in-out',
                        '&:hover': {
                          borderColor: alpha(catColor, 0.3),
                          boxShadow: `0 2px 8px ${alpha(catColor, 0.04)}`,
                        },
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                        <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                          {item.term}
                        </Typography>
                        <Chip
                          label={item.category}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.675rem',
                            fontWeight: 700,
                            borderRadius: '4px',
                            bgcolor: alpha(catColor, 0.08),
                            color: catColor,
                            border: `1px solid ${alpha(catColor, 0.15)}`,
                          }}
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary" lineHeight={1.5}>
                        {item.definition}
                      </Typography>
                    </Box>
                  )
                })}
              </Stack>
            )}
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, pt: 1.5 }}>
        <Button onClick={onClose} size="md" variant="secondary">
          Close Guide
        </Button>
      </DialogActions>
    </Dialog>
  )
}
