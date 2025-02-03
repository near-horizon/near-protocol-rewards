"""Agent for reviewing generated documentation and tutorials."""

from typing import Dict, Any, List
from .base import BaseAgent

class ReviewAgent(BaseAgent):
    """Agent for reviewing and validating generated content."""
    
    def __init__(self):
        """Initialize the review agent."""
        super().__init__()
        self.review_template = """
        Review the following documentation and tutorials for quality and completeness.
        
        Documentation:
        {documentation}
        
        Tutorial:
        {tutorial}
        
        Review Criteria:
        1. Technical accuracy
        2. Completeness
        3. Clarity and readability
        4. Code example quality
        5. Proper formatting
        6. Links and references
        7. Breaking changes documentation
        
        Provide a detailed review with specific feedback and suggestions.
        Include an approval decision (approved/rejected) with justification.
        """
    
    async def review_content(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """Review generated documentation and tutorials."""
        # Format the prompt
        prompt = self.review_template.format(
            documentation=self._format_content_for_review(content.get("documentation")),
            tutorial=self._format_content_for_review(content.get("tutorial"))
        )
        
        # Get review from OpenAI
        messages = [
            {"role": "system", "content": "You are a technical documentation reviewer ensuring quality and completeness."},
            {"role": "user", "content": prompt}
        ]
        
        review_result = await self.create_chat_completion(messages)
        
        # Parse review result
        return self._parse_review(review_result)
    
    def _format_content_for_review(self, content: Dict[str, Any]) -> str:
        """Format content for review."""
        if not content:
            return "No content provided."
        
        formatted = []
        if isinstance(content, dict):
            for doc_type, data in content.items():
                formatted.append(f"## {doc_type.replace('_', ' ').title()}")
                formatted.append(data.get("content", ""))
        else:
            formatted.append(content)
        
        return "\n\n".join(formatted)
    
    def _parse_review(self, review: str) -> Dict[str, Any]:
        """Parse the review result."""
        # Extract approval decision
        approved = (
            "approved" in review.lower() and
            "rejected" not in review.lower() and
            "not approved" not in review.lower()
        )
        
        # Extract feedback sections
        sections = self._extract_feedback_sections(review)
        
        return {
            "approved": approved,
            "feedback": sections,
            "raw_review": review
        }
    
    def _extract_feedback_sections(self, review: str) -> Dict[str, List[str]]:
        """Extract feedback sections from review."""
        sections = {
            "technical_accuracy": [],
            "completeness": [],
            "clarity": [],
            "code_quality": [],
            "formatting": [],
            "links": [],
            "breaking_changes": []
        }
        
        current_section = None
        lines = review.split("\n")
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check for section headers
            lower_line = line.lower()
            if "technical" in lower_line or "accuracy" in lower_line:
                current_section = "technical_accuracy"
            elif "complete" in lower_line:
                current_section = "completeness"
            elif "clarity" in lower_line or "readability" in lower_line:
                current_section = "clarity"
            elif "code" in lower_line:
                current_section = "code_quality"
            elif "format" in lower_line:
                current_section = "formatting"
            elif "link" in lower_line or "reference" in lower_line:
                current_section = "links"
            elif "breaking" in lower_line:
                current_section = "breaking_changes"
            elif current_section and line.startswith(("-", "*", "•")):
                sections[current_section].append(line)
        
        return sections
    
    def format_markdown(self, content: Dict[str, Any]) -> str:
        """Format review content as markdown."""
        sections = [
            "# Documentation Review\n",
            f"**Status:** {'Approved' if content['approved'] else 'Rejected'}\n",
            "## Feedback\n"
        ]
        
        for section, items in content["feedback"].items():
            if items:
                sections.append(f"### {section.replace('_', ' ').title()}")
                sections.extend(items)
                sections.append("")
        
        return "\n".join(sections) 