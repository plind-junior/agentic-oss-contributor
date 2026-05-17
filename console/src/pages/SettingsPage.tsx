import { useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  MenuItem,
  Slider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import SaveIcon from "@mui/icons-material/Save";
import LogoutIcon from "@mui/icons-material/Logout";
import ScienceIcon from "@mui/icons-material/Science";
import { useQueryClient } from "@tanstack/react-query";
import axios, { type AxiosError } from "axios";
import {
  credentialsToHeaders,
  getCredentials,
  setCredentials,
} from "../credentials";
import { useGithubMe } from "../api/GithubApi";

const MODEL_OPTIONS = [
  { value: "", label: "(server default)" },
  { value: "claude-opus-4-7", label: "claude-opus-4-7" },
  { value: "claude-sonnet-4-6", label: "claude-sonnet-4-6" },
  { value: "claude-haiku-4-5-20251001", label: "claude-haiku-4-5" },
];

type TestState =
  | { status: "idle" }
  | { status: "testing" }
  | { status: "ok"; login: string; model: string; threshold: number }
  | { status: "error"; message: string };

export default function SettingsPage() {
  const existing = getCredentials();
  const meQ = useGithubMe();
  const [anthropicKey, setAnthropicKey] = useState(existing?.anthropicKey ?? "");
  const [claudeModel, setClaudeModel] = useState(existing?.claudeModel ?? "");
  const [threshold, setThreshold] = useState<number>(
    existing?.confidenceThreshold ?? 0.85,
  );
  const [overrideThreshold, setOverrideThreshold] = useState<boolean>(
    typeof existing?.confidenceThreshold === "number",
  );
  const [showAk, setShowAk] = useState(false);
  const [test, setTest] = useState<TestState>({ status: "idle" });
  const [saved, setSaved] = useState(false);

  const qc = useQueryClient();

  const onSave = () => {
    const current = getCredentials();
    if (!current) return;
    setCredentials({
      githubToken: current.githubToken,
      anthropicKey: anthropicKey.trim() || undefined,
      claudeModel: claudeModel || undefined,
      confidenceThreshold: overrideThreshold ? threshold : undefined,
    });
    setSaved(true);
    qc.invalidateQueries();
    setTimeout(() => setSaved(false), 2500);
  };

  const onSignOut = () => {
    setCredentials(null);
    qc.clear();
    window.location.assign("/");
  };

  const onTest = async () => {
    const current = getCredentials();
    if (!current) {
      setTest({
        status: "error",
        message: "No GitHub session — sign in first.",
      });
      return;
    }
    const candidate = {
      ...current,
      anthropicKey: anthropicKey.trim() || undefined,
      claudeModel: claudeModel || undefined,
      confidenceThreshold: overrideThreshold ? threshold : undefined,
    };
    setTest({ status: "testing" });
    try {
      if (candidate.anthropicKey) {
        const { data } = await axios.get("/api/me", {
          headers: credentialsToHeaders(candidate),
        });
        setTest({
          status: "ok",
          login: data.login,
          model: data.model,
          threshold: data.confidence_threshold,
        });
      } else {
        const { data } = await axios.get("https://api.github.com/user", {
          headers: {
            Authorization: `Bearer ${candidate.githubToken}`,
            Accept: "application/vnd.github+json",
          },
        });
        setTest({
          status: "ok",
          login: data.login,
          model: "(no Anthropic key — AI features disabled)",
          threshold: 0,
        });
      }
    } catch (err) {
      const ax = err as AxiosError<{ detail?: string; message?: string }>;
      const msg =
        ax.response?.data?.detail ||
        ax.response?.data?.message ||
        ax.response?.statusText ||
        ax.message ||
        "Unknown error";
      setTest({
        status: "error",
        message: `${ax.response?.status ?? ""} ${msg}`.trim(),
      });
    }
  };

  return (
    <Box
      sx={{
        py: { xs: 2, md: 4 },
        px: { xs: 1, md: 2 },
        maxWidth: 760,
        mx: "auto",
        width: "100%",
      }}
    >
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
        Settings
      </Typography>
      <Typography variant="statLabel" sx={{ display: "block", mb: 3 }}>
        Anthropic key &amp; model live in this browser only
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={2}
            justifyContent="space-between"
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar
                src={meQ.data?.avatar_url}
                alt={meQ.data?.login ?? "?"}
                sx={{ width: 48, height: 48 }}
              />
              <Box>
                <Typography variant="statLabel">github account</Typography>
                <Typography variant="mono" sx={{ display: "block", mt: 0.25 }}>
                  {meQ.data ? `@${meQ.data.login}` : "(loading…)"}
                </Typography>
                {meQ.data && (
                  <Typography
                    variant="statLabel"
                    sx={{ display: "block", color: "text.tertiary" }}
                  >
                    id {meQ.data.id} · authorized via OAuth
                  </Typography>
                )}
              </Box>
            </Stack>
            <Button
              variant="outlined"
              startIcon={<LogoutIcon />}
              onClick={onSignOut}
              sx={{ borderColor: "status.closed", color: "status.closed" }}
            >
              Sign out
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={2.5}>
            <Typography variant="sectionTitle">AI features</Typography>
            <Typography variant="statLabel" sx={{ display: "block" }}>
              the Anthropic key powers comment summaries &amp; conflict
              resolution
            </Typography>

            <TextField
              label="Anthropic API key (optional)"
              helperText="Sent as X-Anthropic-Key. Leave blank to disable AI features."
              fullWidth
              type={showAk ? "text" : "password"}
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              placeholder="sk-ant-…"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowAk((v) => !v)}
                      edge="end"
                      aria-label={showAk ? "hide key" : "show key"}
                    >
                      {showAk ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              select
              label="Claude model (optional)"
              value={claudeModel}
              onChange={(e) => setClaudeModel(e.target.value)}
              helperText="Leave on default to use what the backend has configured."
            >
              {MODEL_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>

            <Box>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <Typography variant="mono">
                  Confidence threshold override
                </Typography>
                <Button
                  size="small"
                  onClick={() => setOverrideThreshold((v) => !v)}
                  sx={{ color: "text.tertiary" }}
                >
                  {overrideThreshold ? "use server default" : "override"}
                </Button>
              </Stack>
              {overrideThreshold && (
                <Stack
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  sx={{ mt: 1 }}
                >
                  <Slider
                    value={threshold}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(_, v) => setThreshold(v as number)}
                    sx={{ color: "primary.main" }}
                  />
                  <Typography
                    variant="mono"
                    sx={{ width: 56, textAlign: "right" }}
                  >
                    {threshold.toFixed(2)}
                  </Typography>
                </Stack>
              )}
              <Typography
                variant="statLabel"
                sx={{ display: "block", mt: 0.5 }}
              >
                auto-push when Claude&apos;s average confidence is ≥ this value
              </Typography>
            </Box>

            <Stack direction="row" spacing={1.5} sx={{ pt: 1 }}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={onSave}
              >
                Save
              </Button>
              <Button
                variant="outlined"
                startIcon={<ScienceIcon />}
                onClick={onTest}
                disabled={test.status === "testing"}
                sx={{ borderColor: "border.medium", color: "text.primary" }}
              >
                {test.status === "testing" ? "Testing…" : "Test connection"}
              </Button>
            </Stack>

            {saved && (
              <Alert severity="success" variant="outlined">
                Saved. Dashboard queries will refetch.
              </Alert>
            )}
            {test.status === "ok" && (
              <Alert severity="success" variant="outlined">
                Connected as <strong>@{test.login}</strong> · model{" "}
                <code>{test.model}</code> · threshold {test.threshold.toFixed(2)}
              </Alert>
            )}
            {test.status === "error" && (
              <Alert severity="error" variant="outlined">
                {test.message}
              </Alert>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
