import shutil
from pathlib import Path
from urllib.parse import quote

from git import Repo, GitCommandError

from .config import settings
from .deps import Credentials
from .claude_client import resolve_conflict
from . import github_client


class ConflictResolverError(Exception):
    pass


def _auth_url(token: str, owner: str, repo: str) -> str:
    return f"https://x-access-token:{quote(token, safe='')}@github.com/{owner}/{repo}.git"


def _workdir(owner: str, repo: str) -> Path:
    return settings.workspace_dir / f"{owner}__{repo}"


def _ensure_clone(token: str, owner: str, repo: str) -> Repo:
    path = _workdir(owner, repo)
    if path.exists() and (path / ".git").exists():
        try:
            r = Repo(path)
            with r.config_writer() as cw:
                cw.set_value("user", "name", settings.git_user_name)
                cw.set_value("user", "email", settings.git_user_email)
            r.git.remote("set-url", "origin", _auth_url(token, owner, repo))
            r.git.fetch("origin", "--prune")
            return r
        except GitCommandError:
            shutil.rmtree(path, ignore_errors=True)

    path.parent.mkdir(parents=True, exist_ok=True)
    r = Repo.clone_from(_auth_url(token, owner, repo), path)
    with r.config_writer() as cw:
        cw.set_value("user", "name", settings.git_user_name)
        cw.set_value("user", "email", settings.git_user_email)
    return r


def _reset_working_tree(r: Repo, head_ref: str) -> None:
    for cmd in (("merge", "--abort"), ("rebase", "--abort")):
        try:
            r.git.execute(["git", *cmd])
        except GitCommandError:
            pass
    r.git.reset("--hard")
    r.git.clean("-fdx")
    r.git.checkout("-B", head_ref, f"origin/{head_ref}")


def resolve_pr_conflicts(creds: Credentials, owner: str, repo: str, number: int) -> dict:
    token = creds.github_token
    pr = github_client.fetch_pr(token, owner, repo, number)
    head_ref = pr.head.ref
    base_ref = pr.base.ref
    head_repo_full = pr.head.repo.full_name if pr.head.repo else None
    base_repo_full = pr.base.repo.full_name

    if head_repo_full and head_repo_full != base_repo_full:
        raise ConflictResolverError(
            "PR is from a fork; cross-repo resolution is not supported in this build."
        )

    r = _ensure_clone(token, owner, repo)
    _reset_working_tree(r, head_ref)

    try:
        r.git.merge(
            f"origin/{base_ref}", "--no-ff", "--no-commit",
            "-m", f"Merge {base_ref} into {head_ref}",
        )
        had_conflicts = False
    except GitCommandError as e:
        combined = f"{e} {e.stdout or ''} {e.stderr or ''}"
        had_conflicts = "conflict" in combined.lower()
        if not had_conflicts:
            try:
                r.git.merge("--abort")
            except GitCommandError:
                pass
            raise ConflictResolverError(f"git merge failed: {e}") from e

    if not had_conflicts:
        try:
            r.git.commit("-m", f"Merge {base_ref} into {head_ref}")
            r.git.push("origin", head_ref)
            pushed = True
        except GitCommandError:
            pushed = False
        return {
            "pr": f"{owner}/{repo}#{number}",
            "had_conflicts": False,
            "files": [],
            "average_confidence": 1.0,
            "pushed": pushed,
        }

    status = r.git.status("--porcelain").splitlines()
    conflicted = [
        line[3:] for line in status
        if line.startswith(("UU ", "AA ", "DU ", "UD ", "AU ", "UA "))
    ]

    if not conflicted:
        try:
            r.git.merge("--abort")
        except GitCommandError:
            pass
        raise ConflictResolverError("Merge reported conflicts but no conflicted files found.")

    workdir = _workdir(owner, repo)
    file_results: list[dict] = []
    confidences: list[float] = []

    for path in conflicted:
        abs_path = workdir / path
        try:
            content = abs_path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, FileNotFoundError) as e:
            file_results.append({"path": path, "confidence": 0.0,
                                 "reasoning": f"unreadable: {e}", "pushed": False})
            confidences.append(0.0)
            continue

        try:
            result = resolve_conflict(creds, path, content)
            resolved = result.get("resolved_content", "")
            confidence = float(result.get("confidence", 0.0))
            reasoning = str(result.get("reasoning", ""))
        except Exception as e:
            file_results.append({"path": path, "confidence": 0.0,
                                 "reasoning": f"claude error: {e}", "pushed": False})
            confidences.append(0.0)
            continue

        if "<<<<<<<" in resolved or ">>>>>>>" in resolved:
            confidence = min(confidence, 0.2)
            reasoning = f"markers remained; forcing low confidence. {reasoning}"

        abs_path.write_text(resolved, encoding="utf-8")
        file_results.append({"path": path, "confidence": confidence,
                             "reasoning": reasoning, "pushed": False})
        confidences.append(confidence)

    avg = sum(confidences) / len(confidences) if confidences else 0.0

    if avg >= creds.confidence_threshold:
        try:
            r.git.add("-A")
            r.git.commit(
                "-m",
                f"Auto-merge {base_ref} into {head_ref} (Claude, avg confidence {avg:.2f})",
            )
            r.git.push("origin", head_ref)
            for fr in file_results:
                fr["pushed"] = True
            return {
                "pr": f"{owner}/{repo}#{number}",
                "had_conflicts": True,
                "files": file_results,
                "average_confidence": avg,
                "pushed": True,
            }
        except GitCommandError as e:
            try:
                r.git.merge("--abort")
            except GitCommandError:
                pass
            return {
                "pr": f"{owner}/{repo}#{number}",
                "had_conflicts": True,
                "files": file_results,
                "average_confidence": avg,
                "pushed": False,
                "error": f"push failed: {e}",
            }

    try:
        diff = r.git.diff("HEAD")
    except GitCommandError as e:
        diff = f"(could not compute diff: {e})"
    finally:
        try:
            r.git.merge("--abort")
        except GitCommandError:
            pass

    body = _format_resolution_comment(avg, creds.confidence_threshold, file_results, diff)
    try:
        comment_url = github_client.post_pr_comment(token, owner, repo, number, body)
    except Exception as e:
        return {
            "pr": f"{owner}/{repo}#{number}",
            "had_conflicts": True,
            "files": file_results,
            "average_confidence": avg,
            "pushed": False,
            "proposed_diff": diff,
            "comment_url": None,
            "error": f"comment post failed: {e}",
        }

    return {
        "pr": f"{owner}/{repo}#{number}",
        "had_conflicts": True,
        "files": file_results,
        "average_confidence": avg,
        "pushed": False,
        "proposed_diff": diff,
        "comment_url": comment_url,
    }


def _format_resolution_comment(
    avg: float, threshold: float, files: list[dict], diff: str
) -> str:
    lines = [
        "## Proposed conflict resolution (Claude)",
        "",
        f"Average confidence **{avg:.2f}** is below the auto-push threshold of "
        f"**{threshold:.2f}**, so the resolution is proposed for review.",
        "",
        "| File | Confidence | Reasoning |",
        "| --- | --- | --- |",
    ]
    for f in files:
        reason = (f["reasoning"] or "").replace("|", "\\|").replace("\n", " ")
        lines.append(f"| `{f['path']}` | {f['confidence']:.2f} | {reason} |")
    lines += ["", "<details><summary>Proposed diff</summary>", "", "```diff",
              diff[:60000], "```", "", "</details>"]
    return "\n".join(lines)
