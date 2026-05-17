from typing import Optional
from fastapi import Header, HTTPException
from pydantic import BaseModel

from .config import settings


class Credentials(BaseModel):
    github_token: str
    anthropic_api_key: str
    claude_model: str
    confidence_threshold: float


def get_credentials(
    x_github_token: Optional[str] = Header(default=None, alias="X-GitHub-Token"),
    x_anthropic_key: Optional[str] = Header(default=None, alias="X-Anthropic-Key"),
    x_claude_model: Optional[str] = Header(default=None, alias="X-Claude-Model"),
    x_confidence_threshold: Optional[float] = Header(
        default=None, alias="X-Confidence-Threshold"
    ),
) -> Credentials:
    gh = x_github_token or settings.github_token
    ak = x_anthropic_key or settings.anthropic_api_key
    if not gh or not ak:
        raise HTTPException(
            status_code=401,
            detail=(
                "Missing credentials. Provide X-GitHub-Token and X-Anthropic-Key "
                "request headers, or set GITHUB_TOKEN / ANTHROPIC_API_KEY in backend/.env."
            ),
        )
    threshold = (
        x_confidence_threshold
        if x_confidence_threshold is not None
        else settings.confidence_threshold
    )
    return Credentials(
        github_token=gh,
        anthropic_api_key=ak,
        claude_model=x_claude_model or settings.claude_model,
        confidence_threshold=threshold,
    )
