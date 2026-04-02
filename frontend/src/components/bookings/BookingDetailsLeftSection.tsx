import {
  Avatar,
  Box,
  Button,
  Divider,
  Link,
  Stack,
  Typography,
  alpha,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { ExternalLink, User, Video } from "lucide-react";
import type { Booking } from "@/types";
import { getBookingMeetingJoinUrl } from "./BookingDetailsPanel";

function SectionLabel({ label }: { label: string }) {
  return (
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        mb: 1.5,
        textTransform: "uppercase",
        fontWeight: 700,
        letterSpacing: "0.05em",
      }}
    >
      {label}
    </Typography>
  );
}

interface BookingDetailsLeftSectionProps {
  booking: Booking;
}

export function BookingDetailsLeftSection({
  booking,
}: BookingDetailsLeftSectionProps) {
  const theme = useTheme();
  const startTime = new Date(booking.startTime);
  const meetingJoinUrl = getBookingMeetingJoinUrl(booking);

  return (
    <Stack spacing={3}>
      <Box>
        <SectionLabel label="Invitee" />
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            sx={{
              width: 44,
              height: 44,
              fontSize: "1rem",
              bgcolor: alpha(theme.palette.secondary.main, 0.08),
              color: theme.palette.secondary.main,
              fontWeight: 700,
            }}
          >
            {booking.studentName
              .split(" ")
              .map((name) => name[0])
              .join("")
              .toUpperCase()}
          </Avatar>
          <Box>
            <Typography
              variant="body1"
              sx={{ fontWeight: 600, color: theme.palette.text.primary }}
            >
              {booking.studentName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {booking.studentEmail}
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Divider
        flexItem
        sx={{ borderColor: alpha(theme.palette.secondary.main, 0.08) }}
      />

      <Box>
        <SectionLabel label="Location" />
        {meetingJoinUrl ? (
          <Box
            sx={{
              p: 1.5,
              borderRadius: 1.5,
              bgcolor: alpha(theme.palette.primary.main, 0.04),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            }}
          >
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="flex-start"
              sx={{ mb: 1.5 }}
            >
              <Box
                sx={{
                  p: 0.75,
                  borderRadius: 1,
                  bgcolor: "primary.main",
                  color: "white",
                  display: "flex",
                }}
              >
                <Video size={16} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700, color: "text.primary", mb: 0.25 }}
                >
                  Zoom ISV Meeting Room
                </Typography>
                <Link
                  href={meetingJoinUrl}
                  target="_blank"
                  rel="noreferrer"
                  variant="caption"
                  sx={{
                    fontWeight: 500,
                    color: "primary.main",
                    wordBreak: "break-all",
                    textDecoration: "none",
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  {meetingJoinUrl}
                </Link>
              </Box>
            </Stack>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1.5 }}>
              <Button
                component="a"
                href={meetingJoinUrl}
                target="_blank"
                rel="noreferrer"
                size="small"
                variant="contained"
                sx={{
                  px: 2.5,
                  py: 0.5,
                  borderRadius: 100,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                }}
                startIcon={<ExternalLink size={12} />}
              >
                Join session
              </Button>
            </Box>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {booking.event?.locationType === "VIRTUAL"
              ? "Virtual"
              : "In-person"}
            : {booking.event?.locationValue || "Pending setup"}
          </Typography>
        )}
      </Box>

      <Divider
        flexItem
        sx={{ borderColor: alpha(theme.palette.secondary.main, 0.08) }}
      />

      <Box>
        <SectionLabel label="Invitee Time Zone" />
        <Typography
          variant="body2"
          sx={{ fontWeight: 500, color: theme.palette.text.primary }}
        >
          {new Intl.DateTimeFormat("en-US", { dateStyle: "full" }).format(
            startTime,
          )}
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          {new Intl.DateTimeFormat("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }).format(startTime)}
          {booking.event?.durationSeconds &&
            ` (${booking.event.durationSeconds / 60} mins)`}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {booking.timezone.replace(/_/g, " ")}
        </Typography>
      </Box>

      <Divider
        flexItem
        sx={{ borderColor: alpha(theme.palette.secondary.main, 0.08) }}
      />

      <Box>
        <SectionLabel label="Meeting Host" />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Host will attend this meeting
        </Typography>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar
            src={booking.host?.avatarUrl ?? undefined}
            sx={{
              width: 36,
              height: 36,
              fontSize: "0.875rem",
              bgcolor: alpha(theme.palette.secondary.main, 0.05),
              color: theme.palette.secondary.main,
              fontWeight: 600,
            }}
          >
            {booking.host ? (
              `${booking.host.firstName[0]}${booking.host.lastName[0]}`
            ) : (
              <User size={18} />
            )}
          </Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {booking.host
                ? `${booking.host.firstName} ${booking.host.lastName}`
                : "N/A"}
            </Typography>
            {booking.host?.email && (
              <Typography variant="caption" color="text.secondary">
                {booking.host.email}
              </Typography>
            )}
          </Box>
        </Stack>
      </Box>
    </Stack>
  );
}
