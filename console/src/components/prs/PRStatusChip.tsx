import { Chip, useTheme } from "@mui/material";

type StatusKey =
  | "merged"
  | "open"
  | "closed"
  | "neutral"
  | "warning"
  | "warningOrange"
  | "success"
  | "error"
  | "info";

const STATE_COLOR_KEYS: Record<string, StatusKey> = {
  clean: "merged",
  mergeable: "merged",
  unstable: "warning",
  blocked: "warningOrange",
  dirty: "closed",
  draft: "neutral",
  behind: "warning",
  unknown: "neutral",
};

export default function PRStatusChip({ state }: { state: string }) {
  const theme = useTheme();
  const key: StatusKey = STATE_COLOR_KEYS[state] ?? "neutral";
  const color = theme.palette.status[key];
  return <Chip variant="status" label={state} sx={{ color, borderColor: color }} />;
}
