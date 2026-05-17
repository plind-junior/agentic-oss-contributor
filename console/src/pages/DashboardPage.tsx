import { useMemo, useState, type ReactNode } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useGithubMe, useMirrorIssues, useMirrorPulls } from "../api";
import type { MirrorIssue, MirrorPullRequest } from "../api/models";
import MirrorPRCard from "../components/prs/MirrorPRCard";
import IssueCard from "../components/issues/IssueCard";

export default function DashboardPage() {
  const meQ = useGithubMe();
  const ghId = meQ.data?.id;
  const pullsQ = useMirrorPulls(ghId);
  const issuesQ = useMirrorIssues(ghId);
  const [tab, setTab] = useState<"prs" | "issues">("prs");

  const myPulls = useMemo<MirrorPullRequest[]>(() => {
    const list = pullsQ.data?.pull_requests ?? [];
    if (ghId === undefined) return list;
    return [...list]
      .filter((p) => p.author_github_id === String(ghId))
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  }, [pullsQ.data, ghId]);

  const myIssues = useMemo<MirrorIssue[]>(() => {
    const list = issuesQ.data?.issues ?? [];
    if (ghId === undefined) return list;
    return [...list]
      .filter((i) => i.author_github_id === String(ghId))
      .sort(
        (a, b) =>
          +new Date(b.updated_at ?? b.created_at ?? 0) -
          +new Date(a.updated_at ?? a.created_at ?? 0),
      );
  }, [issuesQ.data, ghId]);

  const refreshing = pullsQ.isFetching || issuesQ.isFetching;
  const onRefresh = () => {
    pullsQ.refetch();
    issuesQ.refetch();
  };

  if (meQ.isLoading) {
    return (
      <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  if (meQ.error || !meQ.data) {
    return (
      <Box sx={{ p: 3, maxWidth: 720, mx: "auto" }}>
        <Alert severity="error" variant="outlined">
          Could not verify your GitHub token
          {meQ.error ? `: ${meQ.error.message}` : ""}. Open Settings to update it.
        </Alert>
      </Box>
    );
  }

  const me = meQ.data;

  return (
    <Box
      sx={{
        py: { xs: 2, md: 4 },
        px: { xs: 1, md: 2 },
        maxWidth: 1100,
        mx: "auto",
        width: "100%",
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <Avatar
            src={me.avatar_url}
            alt={me.login}
            sx={{ width: 48, height: 48 }}
          />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              @{me.login}
            </Typography>
            <Typography variant="statLabel">
              das-github-mirror · github id {me.id}
            </Typography>
          </Box>
        </Stack>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={onRefresh}
          disabled={refreshing}
          sx={{ borderColor: "border.medium", color: "text.primary" }}
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </Stack>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <KpiCard
          label="pull requests"
          value={myPulls.length}
          loading={pullsQ.isLoading}
        />
        <KpiCard
          label="issues"
          value={myIssues.length}
          loading={issuesQ.isLoading}
        />
      </Stack>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          mb: 2,
          borderBottom: 1,
          borderColor: "border.light",
          "& .MuiTab-root": {
            textTransform: "none",
            fontFamily: '"JetBrains Mono", monospace',
            color: "text.tertiary",
          },
          "& .MuiTab-root.Mui-selected": { color: "text.primary" },
        }}
      >
        <Tab value="prs" label={`pull requests (${myPulls.length})`} />
        <Tab value="issues" label={`issues (${myIssues.length})`} />
      </Tabs>

      {tab === "prs" && (
        <ListSection
          isLoading={pullsQ.isLoading}
          error={pullsQ.error ? pullsQ.error.message : null}
          empty="No mirror-tracked PRs found for your account."
        >
          {myPulls.map((pr) => (
            <MirrorPRCard
              key={`${pr.repo_full_name}#${pr.pr_number}`}
              pr={pr}
            />
          ))}
        </ListSection>
      )}

      {tab === "issues" && (
        <ListSection
          isLoading={issuesQ.isLoading}
          error={issuesQ.error ? issuesQ.error.message : null}
          empty="No mirror-tracked issues found for your account."
        >
          {myIssues.map((i) => (
            <IssueCard
              key={`${i.repo_full_name}#${i.issue_number}`}
              issue={i}
            />
          ))}
        </ListSection>
      )}
    </Box>
  );
}

function KpiCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <Card sx={{ flex: 1 }}>
      <CardContent>
        <Typography variant="statLabel">{label}</Typography>
        <Typography
          variant="statValue"
          sx={{ fontSize: "1.8rem", display: "block", mt: 0.5 }}
        >
          {loading ? "—" : value}
        </Typography>
      </CardContent>
    </Card>
  );
}

function ListSection({
  isLoading,
  error,
  empty,
  children,
}: {
  isLoading: boolean;
  error: string | null;
  empty: string;
  children: ReactNode;
}) {
  if (isLoading) {
    return (
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ color: "text.tertiary", py: 2 }}
      >
        <CircularProgress size={18} />
        <Typography>Loading from das-github-mirror…</Typography>
      </Stack>
    );
  }
  if (error) {
    return (
      <Alert severity="error" variant="outlined" sx={{ color: "status.error" }}>
        {error}
      </Alert>
    );
  }
  const items = Array.isArray(children) ? children : [children];
  if (items.length === 0 || (items.length === 1 && !items[0])) {
    return <Typography sx={{ color: "text.tertiary" }}>{empty}</Typography>;
  }
  return <Stack spacing={2}>{children}</Stack>;
}
