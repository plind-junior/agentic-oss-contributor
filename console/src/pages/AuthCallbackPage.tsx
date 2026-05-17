import { useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { fetchGithubUser } from "../api/GithubApi";
import { getCredentials, setCredentials } from "../credentials";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errParam = search.get("error");
    if (errParam) {
      setError(errParam);
      return;
    }

    // Token is delivered in the URL fragment (#access_token=...) so it never
    // hits the server access log or referrer header.
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);
    const token = params.get("access_token");
    if (!token) {
      setError("No access token in callback URL.");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await fetchGithubUser(token);
        if (cancelled) return;
        const existing = getCredentials();
        setCredentials({
          githubToken: token,
          anthropicKey: existing?.anthropicKey,
          claudeModel: existing?.claudeModel,
          confidenceThreshold: existing?.confidenceThreshold,
        });
        qc.invalidateQueries();
        // Clear the fragment so the token is no longer in the address bar.
        window.history.replaceState(null, "", "/");
        navigate("/", { replace: true });
      } catch (e) {
        if (cancelled) return;
        setError(
          e instanceof Error
            ? `Token verification failed: ${e.message}`
            : "Token verification failed.",
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, qc, search]);

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 3,
      }}
    >
      {error ? (
        <Stack spacing={2} sx={{ maxWidth: 480, width: "100%" }}>
          <Alert severity="error" variant="outlined">
            {error}
          </Alert>
          <Button
            variant="outlined"
            onClick={() => navigate("/", { replace: true })}
            sx={{ borderColor: "border.medium", color: "text.primary", alignSelf: "flex-start" }}
          >
            Back to sign-in
          </Button>
        </Stack>
      ) : (
        <Stack direction="row" alignItems="center" spacing={2} sx={{ color: "text.tertiary" }}>
          <CircularProgress size={20} />
          <Typography>Completing GitHub sign-in…</Typography>
        </Stack>
      )}
    </Box>
  );
}
