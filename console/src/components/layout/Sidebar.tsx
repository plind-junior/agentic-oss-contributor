import { Avatar, Box, Button, Chip, Stack, Typography } from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import SettingsIcon from "@mui/icons-material/Settings";
import MergeTypeIcon from "@mui/icons-material/MergeType";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { useLocation, useNavigate } from "react-router-dom";
import { useGithubMe } from "../../api";
import { useCredentials } from "../../hooks/useCredentials";
import { hasAnthropicKey } from "../../credentials";

const NAV_LABEL_FONT = "0.95rem";

const navItems = [
  { label: "dashboard", path: "/", icon: <DashboardIcon /> },
  { label: "settings", path: "/settings", icon: <SettingsIcon /> },
];

interface SidebarProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

export default function Sidebar({ collapsed = false, onNavigate }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const creds = useCredentials();
  const meQ = useGithubMe();

  return (
    <Box
      sx={{
        width: "100%",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        px: collapsed ? 1.5 : 3,
        pb: 4,
        pt: collapsed ? 6 : 4,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 4 }}>
        <MergeTypeIcon sx={{ color: "primary.main", fontSize: 28 }} />
        {!collapsed && (
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="sectionTitle"
              sx={{ fontSize: "0.85rem", lineHeight: 1.2, display: "block" }}
            >
              agentic-oss-
            </Typography>
            <Typography
              variant="sectionTitle"
              sx={{ fontSize: "0.85rem", lineHeight: 1.2, display: "block" }}
            >
              contributor
            </Typography>
          </Box>
        )}
      </Stack>

      <Stack direction="column" spacing={1}>
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          const needsAttention = item.path === "/settings" && !hasAnthropicKey();
          return (
            <Button
              key={item.path}
              onClick={() => {
                navigate(item.path);
                onNavigate?.();
              }}
              sx={{
                justifyContent: collapsed ? "center" : "flex-start",
                py: 1.25,
                px: collapsed ? 1 : 2,
                color: "#ffffff",
                fontSize: NAV_LABEL_FONT,
                backgroundColor: active ? "rgba(255, 255, 255, 0.1)" : "transparent",
                borderLeft: collapsed
                  ? "none"
                  : active
                  ? "2px solid #ffffff"
                  : "2px solid transparent",
                borderRadius: collapsed ? 1.5 : 0,
                gap: collapsed ? 0 : 1.5,
                "& .MuiSvgIcon-root": { fontSize: "1.2rem" },
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  color: "primary.main",
                },
              }}
            >
              {item.icon}
              {!collapsed && (
                <>
                  <span>{item.label}</span>
                  {needsAttention && (
                    <WarningAmberIcon
                      sx={{ ml: "auto", color: "status.warning", fontSize: "1rem !important" }}
                    />
                  )}
                </>
              )}
            </Button>
          );
        })}
      </Stack>

      <Box sx={{ flexGrow: 1 }} />

      {!collapsed && (
        <Box sx={{ borderTop: 1, borderColor: "border.medium", pt: 2, mt: 2 }}>
          {creds && meQ.data ? (
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Avatar
                src={meQ.data.avatar_url}
                alt={meQ.data.login}
                sx={{ width: 36, height: 36 }}
              />
              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography variant="statLabel">signed in as</Typography>
                <Typography
                  variant="mono"
                  sx={{
                    display: "block",
                    mt: 0.25,
                    fontSize: "0.85rem",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={`@${meQ.data.login}`}
                >
                  @{meQ.data.login}
                </Typography>
              </Box>
            </Stack>
          ) : creds && meQ.error ? (
            <Chip
              variant="status"
              label="auth failed"
              sx={{ color: "status.closed", borderColor: "status.closed" }}
            />
          ) : (
            <Typography variant="statLabel">
              not configured · open settings
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}
