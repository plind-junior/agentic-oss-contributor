from typing import Optional
from pydantic import BaseModel


class PullRequestSummary(BaseModel):
    owner: str
    repo: str
    number: int
    title: str
    state: str
    html_url: str
    head_ref: str
    base_ref: str
    head_sha: str
    mergeable: Optional[bool]
    mergeable_state: str
    updated_at: str
    comments: int
    review_comments: int
    additions: int
    deletions: int
    changed_files: int


class CommentSummary(BaseModel):
    pr: str
    comment_count: int
    summary: str
    action_items: list[str]
    blocking_concerns: list[str]


class ResolvedFile(BaseModel):
    path: str
    confidence: float
    reasoning: str
    pushed: bool


class ConflictResolution(BaseModel):
    pr: str
    had_conflicts: bool
    files: list[ResolvedFile]
    average_confidence: float
    pushed: bool
    proposed_diff: Optional[str] = None
    comment_url: Optional[str] = None
    error: Optional[str] = None
