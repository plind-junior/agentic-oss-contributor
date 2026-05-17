export interface Me {
  login: string;
  model: string;
  confidence_threshold: number;
}

export interface PullRequest {
  owner: string;
  repo: string;
  number: number;
  title: string;
  state: string;
  html_url: string;
  head_ref: string;
  base_ref: string;
  head_sha: string;
  mergeable: boolean | null;
  mergeable_state: string;
  updated_at: string;
  comments: number;
  review_comments: number;
  additions: number;
  deletions: number;
  changed_files: number;
}

export interface CommentSummary {
  pr: string;
  comment_count: number;
  summary: string;
  action_items: string[];
  blocking_concerns: string[];
}

export interface ResolvedFile {
  path: string;
  confidence: number;
  reasoning: string;
  pushed: boolean;
}

export interface ConflictResolution {
  pr: string;
  had_conflicts: boolean;
  files: ResolvedFile[];
  average_confidence: number;
  pushed: boolean;
  proposed_diff?: string | null;
  comment_url?: string | null;
  error?: string | null;
}

// ---------- das-github-mirror response shapes ----------
// https://mirror.gittensor.io/api/v1/miners/:github_id/{pulls,issues}

export interface MirrorLabel {
  name: string;
  actor_github_id: string | null;
  actor_association: string | null;
}

export interface MirrorReviewSummary {
  maintainer_changes_requested_count: number;
  changes_requested_count: number;
  approved_count: number;
  commented_count: number;
}

export interface MirrorLinkedIssue {
  number: number;
  title: string;
  state: string;
  state_reason: string | null;
  author_github_id: string | null;
  created_at: string | null;
  closed_at: string | null;
  updated_at: string | null;
  solved_by_pr: number | null;
  labels: MirrorLabel[];
}

export interface MirrorPullRequest {
  repo_full_name: string;
  pr_number: number;
  title: string;
  body: string | null;
  state: string;
  author_github_id: string;
  author_login: string;
  created_at: string;
  closed_at: string | null;
  merged_at: string | null;
  base_ref: string | null;
  head_ref: string | null;
  head_repo_full_name: string | null;
  additions: number;
  deletions: number;
  commits_count: number;
  review_summary: MirrorReviewSummary;
  labels: MirrorLabel[];
  linked_issues: MirrorLinkedIssue[];
}

export interface MirrorSolvingPR {
  pr_number: number;
  author_github_id: string;
  state: string;
  merged_at: string | null;
}

export interface MirrorIssue {
  repo_full_name: string;
  issue_number: number;
  title: string;
  state: string;
  state_reason: string | null;
  author_github_id: string | null;
  author_login: string | null;
  created_at: string | null;
  closed_at: string | null;
  updated_at: string | null;
  solved_by_pr: number | null;
  labels: MirrorLabel[];
  solving_pr: MirrorSolvingPR | null;
}

export interface MirrorPullRequestsResponse {
  github_id: string;
  since: string | null;
  generated_at: string | null;
  pull_requests: MirrorPullRequest[];
}

export interface MirrorIssuesResponse {
  github_id: string;
  since: string | null;
  generated_at: string | null;
  issues: MirrorIssue[];
}
