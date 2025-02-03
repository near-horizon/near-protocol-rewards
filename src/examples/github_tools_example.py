"""Example usage of GitHub toolkit integration."""

import sys
import os
from pathlib import Path

# Add src to Python path
src_path = str(Path(__file__).parent.parent)
sys.path.append(src_path)

from tools.github_tools import GitHubToolManager
from config.settings import settings

def main():
    """Run example GitHub toolkit operations."""
    try:
        # Validate settings
        settings.validate()
        
        # Initialize GitHub tool manager
        github_tools = GitHubToolManager()
        
        # Example 1: Analyze a commit
        print("\n=== Analyzing Latest Commit ===")
        # Note: You would need to provide an actual commit SHA
        commit_analysis = github_tools.analyze_commit("main")
        print(commit_analysis)
        
        # Example 2: Generate documentation
        print("\n=== Generating Documentation ===")
        docs_result = github_tools.generate_docs(
            "README.md",
            "# My Project\nThis is a sample project."
        )
        print(docs_result)
        
        # Example 3: Create changelog
        print("\n=== Generating Changelog ===")
        changelog = github_tools.create_changelog("v1.0.0", "v1.1.0")
        print(changelog)
        
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main() 