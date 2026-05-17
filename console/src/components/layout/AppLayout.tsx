import { useRef, useState } from "react";
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  Toolbar,
  Typography,
  useMediaQuery,
  alpha,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { Outlet, useLocation } from "react-router-dom";
import theme, { scrollbarSx } from "../../theme";
import Sidebar from "./Sidebar";
import ErrorBoundary from "../ErrorBoundary";
import ConnectGitHub from "../ConnectGitHub";
import { useCredentials } from "../../hooks/useCredentials";
import { AUTH_CALLBACK_PATH } from "../../routes";

const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 72;
const MOBILE_APP_BAR_HEIGHT = 56;

export default function AppLayout() {
  const mainRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isCompactDesktop = useMediaQuery(theme.breakpoints.down("lg"));
  const isDesktopCollapsed = !isMobile && isCompactDesktop;
  const [mobileOpen, setMobileOpen] = useState(false);
  const creds = useCredentials();

  // TODO(remove-after-design-review): bypass the OAuth gate so the dashboard
  // renders against plind-junior's public mirror data without a sign-in.
  const DEV_BYPASS_AUTH = true;

  // The OAuth callback page must render without the gate so it can read the
  // token from the URL fragment and store it before redirecting.
  if (!DEV_BYPASS_AUTH && !creds && location.pathname !== AUTH_CALLBACK_PATH) {
    return <ConnectGitHub />;
  }

  return (
    <Box
      sx={{
        display: "flex",
        width: "100%",
        minHeight: "100dvh",
        height: "100dvh",
        overflow: "hidden",
        justifyContent: "center",
      }}
    >
      {isMobile && (
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            backgroundColor: "background.default",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Toolbar sx={{ minHeight: `${MOBILE_APP_BAR_HEIGHT}px !important` }}>
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setMobileOpen((v) => !v)}
              sx={{ mr: 2 }}
              aria-label="open drawer"
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="sectionTitle">oss-contributor</Typography>
          </Toolbar>
        </AppBar>
      )}

      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: { xs: "100%", sm: 320 },
              backgroundColor: "background.default",
              backgroundImage: `linear-gradient(${alpha(theme.palette.common.white, 0.05)}, ${alpha(theme.palette.common.white, 0.05)})`,
              borderRight: `1px solid ${theme.palette.border.light}`,
            },
            "& .MuiBackdrop-root": {
              backgroundColor: alpha(theme.palette.common.black, 0.7),
            },
          }}
        >
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </Drawer>
      )}

      {!isMobile && (
        <Box
          sx={{
            flexShrink: 0,
            width: isDesktopCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
            minWidth: isDesktopCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
            borderRight: `1px solid ${theme.palette.border.light}`,
            overflow: "hidden",
            transition: "width 0.2s ease, min-width 0.2s ease",
          }}
        >
          <Sidebar collapsed={isDesktopCollapsed} />
        </Box>
      )}

      <Box
        ref={mainRef}
        component="main"
        sx={{
          flexGrow: 1,
          maxWidth: 1920,
          width: "100%",
          height: {
            xs: `calc(100dvh - ${MOBILE_APP_BAR_HEIGHT}px)`,
            sm: "100dvh",
          },
          mt: { xs: `${MOBILE_APP_BAR_HEIGHT}px`, sm: 0 },
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          px: { xs: 1, sm: 2, md: 3 },
          ...scrollbarSx,
          alignItems: "stretch",
          minHeight: 0,
        }}
      >
        <ErrorBoundary variant="inline">
          <Box
            sx={{
              width: "100%",
              maxWidth: "100%",
              flex: "1 1 auto",
              display: "flex",
              flexDirection: "column",
              key: location.pathname,
            }}
          >
            <Outlet />
          </Box>
        </ErrorBoundary>
      </Box>
    </Box>
  );
}
