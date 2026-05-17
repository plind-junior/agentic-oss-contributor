import {
  Box,
  Button,
  Card,
  CardContent,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import SummarizeIcon from "@mui/icons-material/Summarize";
import {
  useResolveConflicts,
  useSummarizeComments,
  type PullRequest,
} from "../../api";
import PRStatusChip from "./PRStatusChip";

export default function PRCard({ pr }: { pr: PullRequest }) {
  const summarize = useSummarizeComments(pr.owner, pr.repo, pr.number);
  const resolve = useResolveConflicts(pr.owner, pr.repo, pr.number);
  const conflicted = pr.mergeable === false || pr.mergeable_state === "dirty";

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
            href={pr.html_url}
            target="_blank"
            rel="noreferrer"
            underline="hover"
            sx={{
              color: "text.primary",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 0.75,
            }}
          >
            <Typography component="span" sx={{ color: "text.tertiary" }}>
              {pr.owner}/{pr.repo}#{pr.number}
            </Typography>
            <Typography component="span">— {pr.title}</Typography>
            <OpenInNewIcon sx={{ fontSize: 14, color: "text.tertiary" }} />
          </Link>
          <PRStatusChip state={pr.mergeable_state || "unknown"} />
        </Stack>

        <Stack
          direction="row"
          spacing={1.5}
          flexWrap="wrap"
          sx={{ mt: 1.5, color: "text.tertiary", fontSize: "0.75rem" }}
        >
          <span>
            <code>{pr.head_ref}</code> → <code>{pr.base_ref}</code>
          </span>
          <span>· {pr.changed_files} files</span>
          <span style={{ color: "var(--mui-palette-status-success, #4ade80)" }}>
            +{pr.additions}
          </span>
          <span style={{ color: "var(--mui-palette-status-closed, #ff7b72)" }}>
            -{pr.deletions}
          </span>
          <span>· {pr.comments + pr.review_comments} comments</span>
          <span>· updated {new Date(pr.updated_at).toLocaleString()}</span>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<SummarizeIcon />}
            onClick={() => summarize.mutate()}
            disabled={summarize.isPending}
            sx={{ borderColor: "border.medium", color: "text.primary" }}
          >
            {summarize.isPending ? "Summarizing…" : "Summarize comments"}
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AutoFixHighIcon />}
            onClick={() => resolve.mutate("auto")}
            disabled={resolve.isPending || !conflicted}
            sx={{
              borderColor: conflicted ? "status.warningOrange" : "border.medium",
              color: conflicted ? "status.warningOrange" : "text.tertiary",
            }}
          >
            {resolve.isPending ? "Resolving…" : "Resolve conflicts"}
          </Button>
        </Stack>

        {summarize.error && (
          <Typography sx={{ mt: 1, color: "status.error", fontSize: 13 }}>
            Summary error: {summarize.error.message}
          </Typography>
        )}
        {summarize.data && (
          <Box
            sx={{
              mt: 2,
              p: 2,
              backgroundColor: "surface.subtle",
              border: 1,
              borderColor: "border.light",
              borderRadius: 1.5,
            }}
          >
            <Typography variant="sectionTitle">
              Summary ({summarize.data.comment_count} comments)
            </Typography>
            <Typography sx={{ color: "text.tertiary", mt: 1 }}>
              {summarize.data.summary || "—"}
            </Typography>
            {summarize.data.blocking_concerns.length > 0 && (
              <>
                <Typography variant="statLabel" sx={{ mt: 2, display: "block" }}>
                  Blocking concerns
                </Typography>
                <ul style={{ margin: "4px 0 0 18px" }}>
                  {summarize.data.blocking_concerns.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </>
            )}
            {summarize.data.action_items.length > 0 && (
              <>
                <Typography variant="statLabel" sx={{ mt: 2, display: "block" }}>
                  Action items
                </Typography>
                <ul style={{ margin: "4px 0 0 18px" }}>
                  {summarize.data.action_items.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </>
            )}
          </Box>
        )}

        {resolve.error && (
          <Typography sx={{ mt: 1, color: "status.error", fontSize: 13 }}>
            Resolve error: {resolve.error.message}
          </Typography>
        )}
        {resolve.data && (
          <Box
            sx={{
              mt: 2,
              p: 2,
              backgroundColor: "surface.subtle",
              border: 1,
              borderColor: "border.light",
              borderRadius: 1.5,
            }}
          >
            <Typography variant="sectionTitle">
              {resolve.data.had_conflicts ? "Conflict resolution" : "Clean merge"}
              {" · avg confidence "}
              <Box
                component="span"
                sx={{
                  color:
                    resolve.data.average_confidence >= 0.85
                      ? "status.merged"
                      : "status.warning",
                }}
              >
                {resolve.data.average_confidence.toFixed(2)}
              </Box>
              {resolve.data.pushed ? " · pushed ✓" : " · not pushed"}
            </Typography>
            {resolve.data.error && (
              <Typography sx={{ mt: 1, color: "status.error" }}>
                {resolve.data.error}
              </Typography>
            )}
            {resolve.data.comment_url && (
              <Typography sx={{ mt: 1, fontSize: 13 }}>
                Posted proposed resolution as a PR comment:{" "}
                <Link href={resolve.data.comment_url} target="_blank" rel="noreferrer">
                  view
                </Link>
              </Typography>
            )}
            {resolve.data.files.length > 0 && (
              <Table size="small" sx={{ mt: 1 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: "text.secondary" }}>File</TableCell>
                    <TableCell sx={{ color: "text.secondary" }}>Confidence</TableCell>
                    <TableCell sx={{ color: "text.secondary" }}>Reasoning</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {resolve.data.files.map((f) => (
                    <TableRow key={f.path}>
                      <TableCell><code>{f.path}</code></TableCell>
                      <TableCell>{f.confidence.toFixed(2)}</TableCell>
                      <TableCell sx={{ color: "text.tertiary" }}>{f.reasoning}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
