from github import Auth, Github


def _gh(token: str) -> Github:
    return Github(auth=Auth.Token(token), per_page=50)


def current_login(token: str) -> str:
    return _gh(token).get_user().login


def list_my_open_prs(token: str) -> list[dict]:
    client = _gh(token)
    login = client.get_user().login
    query = f"is:pr is:open author:{login} archived:false"
    issues = client.search_issues(query=query, sort="updated", order="desc")
    results: list[dict] = []
    for issue in issues[:50]:
        pr = issue.as_pull_request()
        repo_full = pr.base.repo.full_name
        owner, repo = repo_full.split("/", 1)
        results.append(
            {
                "owner": owner,
                "repo": repo,
                "number": pr.number,
                "title": pr.title,
                "state": pr.state,
                "html_url": pr.html_url,
                "head_ref": pr.head.ref,
                "base_ref": pr.base.ref,
                "head_sha": pr.head.sha,
                "mergeable": pr.mergeable,
                "mergeable_state": pr.mergeable_state or "unknown",
                "updated_at": pr.updated_at.isoformat() if pr.updated_at else "",
                "comments": pr.comments,
                "review_comments": pr.review_comments,
                "additions": pr.additions,
                "deletions": pr.deletions,
                "changed_files": pr.changed_files,
            }
        )
    return results


def fetch_pr(token: str, owner: str, repo: str, number: int):
    return _gh(token).get_repo(f"{owner}/{repo}").get_pull(number)


def fetch_all_comments(token: str, owner: str, repo: str, number: int) -> list[dict]:
    pr = fetch_pr(token, owner, repo, number)
    out: list[dict] = []
    for c in pr.get_issue_comments():
        out.append(
            {
                "type": "issue",
                "author": c.user.login if c.user else "unknown",
                "created_at": c.created_at.isoformat() if c.created_at else "",
                "body": c.body or "",
            }
        )
    for c in pr.get_review_comments():
        out.append(
            {
                "type": "review",
                "author": c.user.login if c.user else "unknown",
                "created_at": c.created_at.isoformat() if c.created_at else "",
                "path": c.path,
                "body": c.body or "",
            }
        )
    for r in pr.get_reviews():
        if r.body:
            out.append(
                {
                    "type": f"review-{r.state.lower()}",
                    "author": r.user.login if r.user else "unknown",
                    "created_at": r.submitted_at.isoformat() if r.submitted_at else "",
                    "body": r.body,
                }
            )
    out.sort(key=lambda c: c.get("created_at", ""))
    return out


def post_pr_comment(token: str, owner: str, repo: str, number: int, body: str) -> str:
    pr = fetch_pr(token, owner, repo, number)
    return pr.create_issue_comment(body).html_url
