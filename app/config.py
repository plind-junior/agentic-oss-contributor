from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Credentials are now optional — clients pass them per-request via
    # X-GitHub-Token / X-Anthropic-Key headers. The .env values, when set, act
    # as a fallback for headless usage (cron, scripts).
    github_token: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    claude_model: str = "claude-opus-4-7"
    confidence_threshold: float = 0.85
    workspace_dir: Path = Path("./.workspace")
    git_user_name: str = "agentic-oss-contributor"
    git_user_email: str = "bot@agentic-oss-contributor.local"

    # GitHub OAuth (web application flow). Required for the console's
    # "Sign in with GitHub" button. Register an OAuth App at
    # https://github.com/settings/applications/new and put the client
    # id / secret in .env. Callback URL on GitHub must match
    # {backend_url}/api/auth/github/callback.
    github_oauth_client_id: Optional[str] = None
    github_oauth_client_secret: Optional[str] = None
    github_oauth_scope: str = "repo read:user"
    frontend_url: str = "http://localhost:5173"
    backend_url: str = "http://localhost:8000"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
settings.workspace_dir.mkdir(parents=True, exist_ok=True)
