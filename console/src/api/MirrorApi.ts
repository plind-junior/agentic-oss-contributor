import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import type {
  MirrorIssuesResponse,
  MirrorPullRequestsResponse,
} from "./models";

const MIRROR_BASE = "https://mirror.gittensor.io";

export const useMirrorPulls = (githubId: number | undefined, since?: string) =>
  useQuery<MirrorPullRequestsResponse>({
    queryKey: ["mirror-pulls", githubId, since],
    queryFn: async ({ signal }) => {
      const { data } = await axios.get<MirrorPullRequestsResponse>(
        `${MIRROR_BASE}/api/v1/miners/${githubId}/pulls`,
        { params: since ? { since } : undefined, signal },
      );
      return data;
    },
    enabled: githubId !== undefined,
    retry: false,
  });

export const useMirrorIssues = (githubId: number | undefined, since?: string) =>
  useQuery<MirrorIssuesResponse>({
    queryKey: ["mirror-issues", githubId, since],
    queryFn: async ({ signal }) => {
      const { data } = await axios.get<MirrorIssuesResponse>(
        `${MIRROR_BASE}/api/v1/miners/${githubId}/issues`,
        { params: since ? { since } : undefined, signal },
      );
      return data;
    },
    enabled: githubId !== undefined,
    retry: false,
  });
