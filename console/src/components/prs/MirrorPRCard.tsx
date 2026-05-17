import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Link,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import VisibilityIcon from "@mui/icons-material/Visibility";
import PublishIcon from "@mui/icons-material/Publish";
import { useResolveConflicts, type ResolveMode } from "../../api";
import type { MirrorPullRequest } from "../../api/models";
import { hasAnthropicKey } from "../../credentials";
import MirrorPRStatusChip from "./MirrorPRStatusChip";

const ownerRepo = (full: string): { owner: string; repo: string } => {
  const [owner, repo] = full.split("/");
  return { owner: owner ?? "", repo: repo ?? "" };
};

export default function MirrorPRCard({ pr }: { pr: MirrorPullRequest }) {
  const { owner, repo } = ownerRepo(pr.repo_full_name);
  const url = `https://github.com/${pr.repo_full_name}/pull/${pr.pr_number}`;
  const isOpen = pr.state === "open" && !pr.merged_at;
  const anthropicReady = hasAnthropicKey();
  const [mode, setMode] = useState<ResolveMode>("auto");
  const resolve = useResolveConflicts(owner, repo, pr.pr_number);
  const linked = pr.linked_issues[0];

  const handleRun = () => resolve.mutate(mode);

  return (
    <Card>
      <CardContent sx={{ "&:last-child": { pb: 2 } }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "baseline" }}
          spacing={1}
        >
          <Link
            href={url}
            target="_blank"
            rel="noreferrer"
            underline="hover"
            sx={{
              color: "text.primary",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              minWidth: 0,
            }}
          >
            <Typography component="span" sx={{ color: "text.tertiary" }}>
              {pr.repo_full_name}#{pr.pr_number}
            </Typography>
            <Typography component="span">— {pr.title}</Typography>
            <OpenInNewIcon sx={{ fontSize: 14, color: "text.tertiary" }} />
          </Link>
          <MirrorPRStatusChip pr={pr} />
        </Stack>

        <Stack
          direction="row"
          spacing={1.5}
          flexWrap="wrap"
          sx={{ mt: 1.5, color: "text.tertiary", fontSize: "0.75rem" }}
        >
          {pr.head_ref && pr.base_ref && (
            <span>
              <code>{pr.head_ref}</code> → <code>{pr.base_ref}</code>
            </span>
          )}
          <span>· {pr.commits_count} commits</span>
          <span style={{ color: "var(--mui-palette-status-success, #4ade80)" }}>
            +{pr.additions}
          </span>
          <span style={{ color: "var(--mui-palette-status-closed, #ff7b72)" }}>
            -{pr.deletions}
          </span>
          {pr.merged_at ? (
            <span>· merged {fmt(pr.merged_at)}</span>
          ) : pr.closed_at ? (
            <span>· closed {fmt(pr.closed_at)}</span>
          ) : (
            <span>· created {fmt(pr.created_at)}</span>
          )}
        </Stack>

        {pr.labels.length > 0 && (
          <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ mt: 1.25 }}>
            {pr.labels.map((l) => (
              <Chip key={l.name} variant="info" label={l.name} sx={{ mb: 0.5 }} />
            ))}
          </Stack>
        )}

        {linked && (
          <Typography sx={{ mt: 1.5, color: "text.tertiary", fontSize: "0.78rem" }}>
            closes{" "}
            <Link
              href={`https://github.com/${pr.repo_full_name}/issues/${linked.number}`}
              target="_blank"
              rel="noreferrer"
              sx={{ color: "status.info" }}
            >
              #{linked.number}
            </Link>{" "}
            — {linked.title}
          </Typography>
        )}

        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: "border.light" }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            alignItems={{ xs: "stretch", sm: "center" }}
          >
            <ToggleButtonGroup
              value={mode}
              exclusive
              size="small"
              onChange={(_, v) => v && setMode(v as ResolveMode)}
              disabled={!isOpen}
              sx={{
                "& .MuiToggleButton-root": {
                  px: 1.5,
                  borderColor: "border.medium",
                  color: "text.tertiary",
                  textTransform: "none",
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: "0.75rem",
                },
                "& .MuiToggleButton-root.Mui-selected": {
                  color: "text.primary",
                  backgroundColor: "surface.light",
                },
              }}
            >
              <ToggleButton value="auto">
                <PublishIcon sx={{ fontSize: 14, mr: 0.5 }} /> auto-push
              </ToggleButton>
              <ToggleButton value="manual">
                <VisibilityIcon sx={{ fontSize: 14, mr: 0.5 }} /> manual review
              </ToggleButton>
            </ToggleButtonGroup>

            <Tooltip
              title={
                !isOpen
                  ? `PR is already ${pr.merged_at ? "merged" : "closed"} — nothing to resolve`
                  : !anthropicReady
                  ? "Set an Anthropic API key in Settings to enable conflict resolution"
                  : mode === "auto"
                  ? "Resolve conflicts with Claude and push if confidence ≥ threshold"
                  : "Resolve conflicts with Claude and show the proposed diff without pushing"
              }
            >
              <span>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AutoFixHighIcon />}
                  onClick={handleRun}
                  disabled={resolve.isPending || !anthropicReady || !isOpen}
                  sx={{
                    borderColor: isOpen ? "status.warningOrange" : "border.medium",
                    color: isOpen ? "status.warningOrange" : "text.tertiary",
                  }}
                >
                  {resolve.isPending
                    ? mode === "auto"
                      ? "Resolving & pushing…"
                      : "Resolving…"
                    : "Fix conflicts"}
                </Button>
              </span>
            </Tooltip>

            {isOpen && !anthropicReady && (
              <Typography
                variant="statLabel"
                sx={{ color: "text.tertiary", display: "block" }}
              >
                add Anthropic key in settings →
              </Typography>
            )}
          </Stack>

          {resolve.error && (
            <Alert
              severity="error"
              variant="outlined"
              sx={{ mt: 1.5, color: "status.error" }}
            >
              {resolve.error.message}
            </Alert>
          )}
          {resolve.data && <ResolveResult data={resolve.data} mode={mode} />}
        </Box>
      </CardContent>
    </Card>
  );
}

function ResolveResult({
  data,
  mode,
}: {
  data: import("../../api/models").ConflictResolution;
  mode: ResolveMode;
}) {
  if (!data.had_conflicts) {
    return (
      <Alert severity="success" variant="outlined" sx={{ mt: 1.5 }}>
        No merge conflicts detected — branch is clean.
      </Alert>
    );
  }
  return (
    <Box
      sx={{
        mt: 1.5,
        p: 2,
        backgroundColor: "surface.subtle",
        border: 1,
        borderColor: "border.light",
        borderRadius: 1.5,
      }}
    >
      <Typography variant="sectionTitle">
        Conflict resolution · avg confidence{" "}
        <Box
          component="span"
          sx={{
            color:
              data.average_confidence >= 0.85
                ? "status.merged"
                : "status.warning",
          }}
        >
          {data.average_confidence.toFixed(2)}
        </Box>{" "}
        ·{" "}
        {data.pushed
          ? "pushed ✓"
          : mode === "manual"
          ? "not pushed (manual review)"
          : "not pushed"}
      </Typography>

      {data.error && (
        <Typography sx={{ mt: 1, color: "status.error", fontSize: 13 }}>
          {data.error}
        </Typography>
      )}

      {data.files.length > 0 && (
        <Stack spacing={0.5} sx={{ mt: 1 }}>
          {data.files.map((f) => (
            <Typography
              key={f.path}
              variant="mono"
              sx={{ fontSize: "0.78rem", color: "text.tertiary" }}
            >
              <code>{f.path}</code> · conf {f.confidence.toFixed(2)} — {f.reasoning}
            </Typography>
          ))}
        </Stack>
      )}

      {mode === "manual" && data.proposed_diff && (
        <Box
          sx={{
            mt: 1.5,
            p: 1.5,
            backgroundColor: "surface.elevated",
            borderRadius: 1,
            maxHeight: 320,
            overflow: "auto",
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: "0.72rem",
            whiteSpace: "pre",
            color: "text.tertiary",
          }}
        >
          {data.proposed_diff}
        </Box>
      )}

      {data.comment_url && (
        <Typography sx={{ mt: 1, fontSize: 13 }}>
          Proposed diff posted as PR comment:{" "}
          <Link
            href={data.comment_url}
            target="_blank"
            rel="noreferrer"
            sx={{ color: "status.info" }}
          >
            view
          </Link>
        </Typography>
      )}
    </Box>
  );
}

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString();
}
