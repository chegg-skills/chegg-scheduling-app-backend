import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Link } from "react-router-dom";
import {
  Users,
  UsersRound,
  CalendarDays,
  Layers,
  GitMerge,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";

type QuickLink = {
  label: string;
  to: string;
  icon: React.ReactNode;
  roles: string[];
};

const QUICK_LINKS: QuickLink[] = [
  {
    label: "Users",
    to: "/users",
    icon: <Users size={24} />,
    roles: ["SUPER_ADMIN"],
  },
  {
    label: "Teams",
    to: "/teams",
    icon: <UsersRound size={24} />,
    roles: ["SUPER_ADMIN", "TEAM_ADMIN"],
  },
  {
    label: "Events",
    to: "/teams",
    icon: <CalendarDays size={24} />,
    roles: ["SUPER_ADMIN", "TEAM_ADMIN"],
  },
  {
    label: "Offerings",
    to: "/event-offerings",
    icon: <Layers size={24} />,
    roles: ["SUPER_ADMIN"],
  },
  {
    label: "Interaction Types",
    to: "/interaction-types",
    icon: <GitMerge size={24} />,
    roles: ["SUPER_ADMIN"],
  },
];

export function DashboardPage() {
  const { user } = useAuth();

  const visibleLinks = QUICK_LINKS.filter(
    (l) => user && l.roles.includes(user.role),
  );

  return (
    <Box>
      <PageHeader
        title={`Welcome back${user ? `, ${user.firstName}` : ""}!`}
        subtitle={
          user
            ? `Signed in as ${user.email} · ${user.role.replace("_", " ")}`
            : undefined
        }
      />

      {visibleLinks.length > 0 && (
        <Box
          sx={{
            mt: 4,
            display: "grid",
            gap: 2,
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              lg: "repeat(3, minmax(0, 1fr))",
            },
          }}
        >
          {visibleLinks.map((link) => (
            <Card key={link.to + link.label} variant="outlined">
              <CardActionArea component={Link} to={link.to} sx={{ p: 2.5 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      p: 1.25,
                      borderRadius: 2,
                      bgcolor: "primary.light",
                      color: "primary.dark",
                      display: "flex",
                    }}
                  >
                    {link.icon}
                  </Box>
                  <Typography variant="subtitle2">{link.label}</Typography>
                </Stack>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}
