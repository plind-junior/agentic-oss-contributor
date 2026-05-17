const STORAGE_KEY = "aosc.credentials.v1";

export interface Credentials {
  githubToken: string;
  anthropicKey?: string;
  claudeModel?: string;
  confidenceThreshold?: number;
}

function readFromStorage(): Credentials | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Credentials>;
    if (!parsed.githubToken) return null;
    return {
      githubToken: parsed.githubToken,
      anthropicKey: parsed.anthropicKey || undefined,
      claudeModel: parsed.claudeModel || undefined,
      confidenceThreshold:
        typeof parsed.confidenceThreshold === "number"
          ? parsed.confidenceThreshold
          : undefined,
    };
  } catch {
    return null;
  }
}

let cache: Credentials | null = readFromStorage();
const listeners = new Set<() => void>();

export function getCredentials(): Credentials | null {
  return cache;
}

export function hasCredentials(): boolean {
  return cache !== null;
}

export function hasAnthropicKey(): boolean {
  return !!cache?.anthropicKey;
}

export function setCredentials(next: Credentials | null) {
  cache = next;
  if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  else localStorage.removeItem(STORAGE_KEY);
  listeners.forEach((l) => l());
}

export function subscribeToCredentials(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function credentialsToHeaders(c: Credentials): Record<string, string> {
  const headers: Record<string, string> = {
    "X-GitHub-Token": c.githubToken,
  };
  if (c.anthropicKey) headers["X-Anthropic-Key"] = c.anthropicKey;
  if (c.claudeModel) headers["X-Claude-Model"] = c.claudeModel;
  if (typeof c.confidenceThreshold === "number") {
    headers["X-Confidence-Threshold"] = String(c.confidenceThreshold);
  }
  return headers;
}
