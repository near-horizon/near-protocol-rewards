"""Agent for generating tutorials based on code changes."""

from typing import Dict, Any, List
from .base import BaseAgent

class TutorialAgent(BaseAgent):
    """Agent for generating tutorials and examples."""
    
    def __init__(self):
        """Initialize the tutorial agent."""
        super().__init__()
        self.tutorial_template = """
        Generate a tutorial for the following code changes.
        
        Analysis:
        {analysis}
        
        File Contents:
        {file_contents}
        
        Requirements:
        1. Create a step-by-step tutorial
        2. Include code examples
        3. Explain key concepts
        4. Cover common use cases
        5. Include troubleshooting tips
        
        Generate a comprehensive tutorial that helps users understand and implement the changes.
        """
    
    async def create_tutorial(
        self,
        event_data: Dict[str, Any],
        analysis_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate tutorial based on code changes and analysis."""
        # Only generate tutorial if needed
        if "tutorial" not in analysis_result["doc_types"]:
            return None
        
        # Format the prompt
        prompt = self.tutorial_template.format(
            analysis=analysis_result["raw_analysis"],
            file_contents=await self._get_changed_files_content(event_data)
        )
        
        # Get tutorial from OpenAI
        messages = [
            {"role": "system", "content": "You are a technical tutorial writer creating comprehensive guides."},
            {"role": "user", "content": prompt}
        ]
        
        tutorial_content = await self.create_chat_completion(messages)
        
        # Get tutorial file path
        tutorial_file = self._get_tutorial_file(event_data)
        
        return {
            "content": tutorial_content,
            "file": tutorial_file
        }
    
    async def _get_changed_files_content(self, event_data: Dict[str, Any]) -> str:
        """Get content of changed files."""
        contents = []
        
        for file_path in (
            event_data["changes"]["added_files"] +
            event_data["changes"]["modified_files"]
        ):
            content = await self.get_file_content(file_path)
            if content:
                contents.append(f"File: {file_path}\n```\n{content}\n```\n")
        
        return "\n".join(contents)
    
    def _get_tutorial_file(self, event_data: Dict[str, Any]) -> str:
        """Determine tutorial file path."""
        repo_name = event_data["repository"]["name"]
        pr_number = event_data["pull_request"]["number"]
        return f"docs/tutorials/{repo_name}-{pr_number}.md"
    
    def format_markdown(self, content: Dict[str, Any]) -> str:
        """Format tutorial content as markdown."""
        if not content:
            return ""
        
        sections = [
            "# Tutorial\n",
            content["content"],
            "\n## Additional Resources\n",
            "- [API Documentation](../api/README.md)",
            "- [Usage Guide](../guides/README.md)",
            "- [Troubleshooting](../guides/troubleshooting.md)"
        ]
        
        return "\n".join(sections)
