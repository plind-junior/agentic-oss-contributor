import json
import re
from anthropic import Anthropic

from .deps import Credentials

SUMMARY_SYSTEM = """You triage GitHub pull-request feedback for the PR author.
Given the chronological list of issue comments, review comments, and review submissions,
produce a JSON object with these exact keys:
  - "summary": a 2-4 sentence overall summary written for the PR author
  - "action_items": array of concrete next steps the author should take (strings, imperative voice)
  - "blocking_concerns": array of concerns reviewers raised that block merge (strings)
Be specific. Quote reviewer phrasing only when it is technically load-bearing.
Output ONLY valid JSON, no markdown fence."""

CONFLICT_SYSTEM = """You resolve git merge conflicts.
You are given a file containing standard conflict markers (<<<<<<<, =======, >>>>>>>).
You must return a JSON object with EXACTLY these keys:
  - "resolved_content": the full file content with conflicts resolved and NO markers remaining
  - "confidence": float 0..1, your honest confidence that this resolution preserves intent of both sides
  - "reasoning": one-sentence rationale

Conservative rubric for confidence:
  - 0.95+ : trivial (whitespace, import ordering, non-overlapping additions)
  - 0.80-0.94 : clear semantic merge where both sides' intent is preserved
  - 0.50-0.79 : plausible but ambiguous; needs human review
  - <0.50 : you are guessing

Output ONLY valid JSON, no markdown fence, no commentary."""


def _client(api_key: str) -> Anthropic:
    return Anthropic(api_key=api_key)


def _strip_fence(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\n", "", text)
        text = re.sub(r"\n```$", "", text)
    return text.strip()


def _parse_json(text: str) -> dict:
    return json.loads(_strip_fence(text))


def summarize_comments(
    creds: Credentials, pr_title: str, pr_body: str, comments: list[dict]
) -> dict:
    if not comments:
        return {
            "summary": "No comments yet on this PR.",
            "action_items": [],
            "blocking_concerns": [],
        }

    payload = {
        "pr_title": pr_title,
        "pr_body": pr_body[:4000] if pr_body else "",
        "comments": comments,
    }
    msg = _client(creds.anthropic_api_key).messages.create(
        model=creds.claude_model,
        max_tokens=1500,
        system=[
            {"type": "text", "text": SUMMARY_SYSTEM, "cache_control": {"type": "ephemeral"}}
        ],
        messages=[{"role": "user", "content": json.dumps(payload, ensure_ascii=False)}],
    )
    text = "".join(b.text for b in msg.content if getattr(b, "type", "") == "text")
    return _parse_json(text)


def resolve_conflict(creds: Credentials, path: str, conflicted_content: str) -> dict:
    user_payload = {"path": path, "conflicted_file": conflicted_content}
    msg = _client(creds.anthropic_api_key).messages.create(
        model=creds.claude_model,
        max_tokens=8000,
        system=[
            {"type": "text", "text": CONFLICT_SYSTEM, "cache_control": {"type": "ephemeral"}}
        ],
        messages=[{"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)}],
    )
    text = "".join(b.text for b in msg.content if getattr(b, "type", "") == "text")
    return _parse_json(text)
