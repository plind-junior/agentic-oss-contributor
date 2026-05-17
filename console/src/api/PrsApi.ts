import { apiPost, useApiMutation, useApiQuery } from "./ApiUtils";
import { useCredentials } from "../hooks/useCredentials";
import type { CommentSummary, ConflictResolution, Me, PullRequest } from "./models";

export const useMe = () => {
  const creds = useCredentials();
  return useApiQuery<Me>("useMe", "/api/me", { enabled: !!creds });
};

export const useOpenPrs = () => {
  const creds = useCredentials();
  return useApiQuery<PullRequest[]>("useOpenPrs", "/api/prs", { enabled: !!creds });
};

export const useSummarizeComments = (owner: string, repo: string, number: number) =>
  useApiMutation<CommentSummary>(() =>
    apiPost<CommentSummary>(`/api/prs/${owner}/${repo}/${number}/summary`),
  );

export type ResolveMode = "auto" | "manual";

export const useResolveConflicts = (
  owner: string,
  repo: string,
  number: number,
) =>
  useApiMutation<ConflictResolution, ResolveMode>((mode) =>
    apiPost<ConflictResolution>(
      `/api/prs/${owner}/${repo}/${number}/resolve`,
      { push: mode === "auto" },
    ),
  );
