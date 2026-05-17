import {
  useQuery,
  useMutation,
  type UseMutationOptions,
} from "@tanstack/react-query";
import axios, { type AxiosError } from "axios";
import { credentialsToHeaders, getCredentials } from "../credentials";

// Only attach local-backend credentials to local API calls. External URLs
// (api.github.com, mirror.gittensor.io) must not receive these headers.
axios.interceptors.request.use((config) => {
  const url = config.url ?? "";
  if (/^https?:\/\//.test(url)) return config;
  const creds = getCredentials();
  if (creds) {
    const headers = credentialsToHeaders(creds);
    for (const [k, v] of Object.entries(headers)) {
      config.headers.set(k, v);
    }
  }
  return config;
});

export const useApiQuery = <TResponse = unknown, TSelect = TResponse>(
  queryName: string,
  url: string,
  options?: {
    refetchInterval?: number;
    params?: Record<string, string | number | undefined>;
    enabled?: boolean;
    select?: (data: TResponse) => TSelect;
  },
) =>
  useQuery<TResponse, AxiosError, TSelect>({
    queryKey: [queryName, url, options?.params],
    queryFn: async ({ signal }) => {
      const { data } = await axios.get<TResponse>(url, {
        params: options?.params,
        signal,
      });
      return data;
    },
    retry: false,
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval,
    select: options?.select,
  });

export const useApiMutation = <TResponse = unknown, TVars = void>(
  fn: (vars: TVars) => Promise<TResponse>,
  options?: Omit<
    UseMutationOptions<TResponse, AxiosError, TVars>,
    "mutationFn"
  >,
) =>
  useMutation<TResponse, AxiosError, TVars>({
    mutationFn: fn,
    ...options,
  });

export const apiPost = async <TResponse = unknown>(
  url: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<TResponse> => {
  const { data } = await axios.post<TResponse>(url, undefined, { params });
  return data;
};
