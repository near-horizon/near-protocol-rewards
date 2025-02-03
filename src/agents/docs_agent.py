"""Agent for generating documentation based on code changes."""

from typing import Dict, Any, List
import os
from .base import BaseAgent

class DocumentationAgent(BaseAgent):
    """Agent for generating and updating documentation."""
    
    def __init__(self):
        """Initialize the documentation agent."""
        super().__init__()
        self.doc_template = """
        Generate documentation for the following code changes.
        
        Analysis:
        {analysis}
        
        File Contents:
        {file_contents}
        
        Existing Documentation:
        {existing_docs}
        
        Requirements:
        1. Follow {doc_type} documentation format
        2. Include all necessary sections (description, usage, examples)
        3. Document any breaking changes
        4. Include dependency information
        5. Use clear and concise language
        
        Generate comprehensive documentation that covers all changes.
        """
    
    async def generate_documentation(
        self,
        event_data: Dict[str, Any],
        analysis_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate documentation based on code changes and analysis."""
        results = {}
        
        for doc_type in analysis_result["doc_types"]:
            # Get existing documentation if available
            existing_docs = await self._get_existing_docs(
                event_data,
                analysis_result["files_to_update"]
            )
            
            # Format the prompt
            prompt = self.doc_template.format(
                analysis=analysis_result["raw_analysis"],
                file_contents=await self._get_changed_files_content(event_data),
                existing_docs=existing_docs,
                doc_type=doc_type
            )
            
            # Get documentation from OpenAI
            messages = [
                {"role": "system", "content": "You are a technical documentation expert generating comprehensive documentation."},
                {"role": "user", "content": prompt}
            ]
            
            doc_content = await self.create_chat_completion(messages)
            
            # Format and store results
            results[doc_type] = {
                "content": doc_content,
                "files": self._get_doc_files(doc_type, event_data)
            }
        
        return results
    
    async def _get_existing_docs(
        self,
        event_data: Dict[str, Any],
        files_to_update: List[str]
    ) -> str:
        """Get existing documentation content."""
        docs = []
        
        for file_path in files_to_update:
            content = await self.get_file_content(file_path)
            if content:
                docs.append(f"File: {file_path}\n{content}\n")
        
        return "\n".join(docs)
    
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
    
    def _get_doc_files(self, doc_type: str, event_data: Dict[str, Any]) -> List[str]:
        """Determine documentation file paths based on type."""
        repo_name = event_data["repository"]["name"]
        base_path = "docs"
        
        if doc_type == "api":
            return [f"{base_path}/api/{repo_name}.md"]
        elif doc_type == "usage_guide":
            return [f"{base_path}/guides/{repo_name}.md"]
        elif doc_type == "tutorial":
            return [f"{base_path}/tutorials/{repo_name}.md"]
        
        return []
    
    def format_markdown(self, content: Dict[str, Any]) -> str:
        """Format documentation content as markdown."""
        sections = []
        
        for doc_type, data in content.items():
            sections.append(f"# {doc_type.replace('_', ' ').title()} Documentation\n")
            sections.append(data["content"])
            sections.append("\n---\n")
        
        return "\n".join(sections) 