"""GitHub webhook event handler."""

from typing import Dict, Any
from datetime import datetime

class WebhookHandler:
    """Handles GitHub webhook events and prepares them for processing."""
    
    def process_pr_merge(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Process a merged pull request event."""
        pr_data = payload["pull_request"]
        
        # Extract relevant information
        event_data = {
            "event_type": "pr_merge",
            "timestamp": datetime.utcnow().isoformat(),
            "repository": {
                "name": payload["repository"]["full_name"],
                "url": payload["repository"]["html_url"]
            },
            "pull_request": {
                "number": pr_data["number"],
                "title": pr_data["title"],
                "description": pr_data["body"],
                "base_branch": pr_data["base"]["ref"],
                "head_branch": pr_data["head"]["ref"],
                "merged_by": pr_data["merged_by"]["login"],
                "merged_at": pr_data["merged_at"],
                "commits_url": pr_data["commits_url"],
                "diff_url": pr_data["diff_url"]
            },
            "changes": {
                "added_files": [],
                "modified_files": [],
                "removed_files": [],
                "commit_messages": []
            },
            "status": "pending",
            "tasks": [
                "analyze_changes",
                "generate_docs",
                "create_tutorial",
                "update_changelog"
            ]
        }
        
        return event_data
    
    def extract_file_changes(self, files_data: list) -> Dict[str, list]:
        """Extract file changes from PR data."""
        changes = {
            "added_files": [],
            "modified_files": [],
            "removed_files": []
        }
        
        for file_data in files_data:
            status = file_data["status"]
            filename = file_data["filename"]
            
            if status == "added":
                changes["added_files"].append(filename)
            elif status == "modified":
                changes["modified_files"].append(filename)
            elif status == "removed":
                changes["removed_files"].append(filename)
        
        return changes
