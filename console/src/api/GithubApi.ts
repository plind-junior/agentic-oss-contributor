import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { useCredentials } from "../hooks/useCredentials";

export interface GithubUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
}

// TODO(remove-after-design-review): dev bypass — when no OAuth token is set,
// resolve identity to this public account so the dashboard renders.
const DEV_BYPASS_LOGIN = "plind-junior";

export async function fetchGithubUser(token: string): Promise<GithubUser> {
  const { data } = await axios.get<GithubUser>(
    "https://api.github.com/user",
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );
  return data;
}

export async function fetchPublicGithubUser(
  login: string,
): Promise<GithubUser> {
  const { data } = await axios.get<GithubUser>(
    `https://api.github.com/users/${encodeURIComponent(login)}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );
  return data;
}

export const useGithubMe = () => {
  const creds = useCredentials();
  const token = creds?.githubToken;
  return useQuery({
    queryKey: ["github-me", token ?? `dev:${DEV_BYPASS_LOGIN}`],
    queryFn: () =>
      token ? fetchGithubUser(token) : fetchPublicGithubUser(DEV_BYPASS_LOGIN),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
};
