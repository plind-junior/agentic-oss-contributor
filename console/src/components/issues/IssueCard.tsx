import {
  Card,
  CardContent,
  Chip,
  Link,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import type { MirrorIssue } from "../../api/models";

export default function IssueCard({ issue }: { issue: MirrorIssue }) {
  const theme = useTheme();
  const url = `https://github.com/${issue.repo_full_name}/issues/${issue.issue_number}`;
  const isCompleted =
    issue.state === "closed" && issue.state_reason === "completed";
  const stateKey: "merged" | "open" | "closed" = isCompleted
    ? "merged"
    : issue.state === "closed"
    ? "closed"
    : "open";
  const stateColor = theme.palette.status[stateKey];
  const stateLabel = isCompleted ? "completed" : issue.state;

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
              {issue.repo_full_name}#{issue.issue_number}
            </Typography>
            <Typography component="span">— {issue.title}</Typography>
            <OpenInNewIcon sx={{ fontSize: 14, color: "text.tertiary" }} />
          </Link>
          <Chip
            variant="status"
            label={stateLabel}
            sx={{ color: stateColor, borderColor: stateColor }}
          />
        </Stack>

        <Stack
          direction="row"
          spacing={1.5}
          flexWrap="wrap"
          sx={{ mt: 1.5, color: "text.tertiary", fontSize: "0.75rem" }}
        >
          {issue.created_at && <span>created {fmt(issue.created_at)}</span>}
          {issue.closed_at && <span>· closed {fmt(issue.closed_at)}</span>}
          {issue.solved_by_pr && (
            <span>
              · resolved by{" "}
              <Link
                href={`https://github.com/${issue.repo_full_name}/pull/${issue.solved_by_pr}`}
                target="_blank"
                rel="noreferrer"
                sx={{ color: "status.info" }}
              >
                #{issue.solved_by_pr}
              </Link>
            </span>
          )}
        </Stack>

        {issue.labels.length > 0 && (
          <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ mt: 1.25 }}>
            {issue.labels.map((l) => (
              <Chip key={l.name} variant="info" label={l.name} sx={{ mb: 0.5 }} />
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString();
}
