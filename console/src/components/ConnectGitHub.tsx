import {
  Box,
  Button,
  Card,
  CardContent,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import GitHubIcon from "@mui/icons-material/GitHub";

const OAUTH_LOGIN_URL = "/api/auth/github/login";

export default function ConnectGitHub() {
  return (
    <Box
      sx={{
        minHeight: "100dvh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        backgroundColor: "background.default",
      }}
    >
      <Card sx={{ maxWidth: 460, width: "100%" }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack alignItems="center" spacing={2} sx={{ mb: 3 }}>
            <GitHubIcon sx={{ fontSize: 48, color: "text.primary" }} />
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Sign in with GitHub
            </Typography>
            <Typography
              variant="statLabel"
              sx={{ textAlign: "center", maxWidth: 360 }}
            >
              authorize the app to view your pull requests &amp; issues
            </Typography>
          </Stack>

          <Button
            variant="contained"
            startIcon={<GitHubIcon />}
            fullWidth
            size="large"
            onClick={() => {
              window.location.href = OAUTH_LOGIN_URL;
            }}
            sx={{
              backgroundColor: "#24292f",
              color: "#ffffff",
              "&:hover": { backgroundColor: "#1f242a" },
              py: 1.25,
            }}
          >
            Continue with GitHub
          </Button>

          <Typography
            variant="statLabel"
            sx={{
              textAlign: "center",
              color: "text.tertiary",
              mt: 3,
              display: "block",
            }}
          >
            redirects to github.com · grants <code>repo</code> &amp;{" "}
            <code>read:user</code> · token stays in this browser
          </Typography>
          <Typography
            variant="statLabel"
            sx={{
              textAlign: "center",
              color: "text.tertiary",
              mt: 1.5,
              display: "block",
            }}
          >
            first time?{" "}
            <Link
              href="https://github.com/settings/applications/new"
              target="_blank"
              rel="noreferrer"
              sx={{ color: "status.info" }}
            >
              register an OAuth app
            </Link>{" "}
            and set its client id/secret in the backend <code>.env</code>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
