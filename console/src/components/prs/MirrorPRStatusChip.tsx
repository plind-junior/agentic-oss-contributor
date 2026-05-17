import { Chip, useTheme } from "@mui/material";
import type { MirrorPullRequest } from "../../api/models";

export default function MirrorPRStatusChip({ pr }: { pr: MirrorPullRequest }) {
  const theme = useTheme();
  const key: "merged" | "open" | "closed" = pr.merged_at
    ? "merged"
    : pr.state === "closed"
    ? "closed"
    : "open";
  const color = theme.palette.status[key];
  return <Chip variant="status" label={key} sx={{ color, borderColor: color }} />;
}
