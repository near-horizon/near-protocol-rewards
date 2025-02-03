"""GitHub service using PyGithub."""

from typing import Dict, Any, List, Optional
from github import Github, GithubException
from base64 import b64encode
from ..config.settings import settings

class GitHubService:
    """Service for interacting with GitHub."""
    
    def __init__(self):
        """Initialize GitHub service."""
        self.github = Github(settings.GITHUB_TOKEN)
        self.repo = self.github.get_repo(settings.GITHUB_REPOSITORY)
    
    async def create_branch(self, base_branch: str, new_branch: str) -> bool:
        """Create a new branch from base branch."""
        try:
            base = self.repo.get_branch(base_branch)
            self.repo.create_git_ref(f"refs/heads/{new_branch}", base.commit.sha)
            return True
        except GithubException as e:
            print(f"Error creating branch: {str(e)}")
            return False
    
    async def create_file(self, path: str, content: str, branch: str, message: str) -> bool:
        """Create a new file in the repository."""
        try:
            content_bytes = content.encode('utf-8')
            self.repo.create_file(
                path=path,
                message=message,
                content=content_bytes,
                branch=branch
            )
            return True
        except GithubException as e:
            print(f"Error creating file: {str(e)}")
            return False
    
    async def update_file(self, path: str, content: str, branch: str, message: str) -> bool:
        """Update an existing file in the repository."""
        try:
            contents = self.repo.get_contents(path, ref=branch)
            content_bytes = content.encode('utf-8')
            self.repo.update_file(
                path=path,
                message=message,
                content=content_bytes,
                sha=contents.sha,
                branch=branch
            )
            return True
        except GithubException as e:
            print(f"Error updating file: {str(e)}")
            return False
    
    async def create_pull_request(
        self,
        title: str,
        body: str,
        head_branch: str,
        base_branch: str
    ) -> Optional[Dict[str, Any]]:
        """Create a pull request."""
        try:
            pr = self.repo.create_pull(
                title=title,
                body=body,
                head=head_branch,
                base=base_branch
            )
            return {
                "number": pr.number,
                "html_url": pr.html_url,
                "state": pr.state
            }
        except GithubException as e:
            print(f"Error creating PR: {str(e)}")
            return None
    
    async def read_file(self, path: str, ref: Optional[str] = None) -> Optional[str]:
        """Read file content from the repository."""
        try:
            contents = self.repo.get_contents(path, ref=ref)
            if isinstance(contents, list):
                return None  # Path is a directory
            return contents.decoded_content.decode('utf-8')
        except GithubException as e:
            print(f"Error reading file: {str(e)}")
            return None
            
    async def get_rate_limit(self) -> Dict[str, Any]:
        """Get GitHub API rate limit information."""
        try:
            limits = self.github.get_rate_limit()
            return {
                "core": {
                    "limit": limits.core.limit,
                    "remaining": limits.core.remaining,
                    "reset": limits.core.reset.isoformat()
                },
                "search": {
                    "limit": limits.search.limit,
                    "remaining": limits.search.remaining,
                    "reset": limits.search.reset.isoformat()
                }
            }
        except GithubException as e:
            print(f"Error getting rate limit: {str(e)}")
            return {
                "error": str(e)
            }
