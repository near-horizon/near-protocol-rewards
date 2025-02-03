"""Agent for analyzing pull request changes."""

from typing import Dict, Any, List
from enum import Enum
from pathlib import Path
from .base import BaseAgent

class ChangeType(Enum):
    """Types of changes that can occur in a PR."""
    API = "api"  # API changes (new endpoints, modified functions, etc.)
    UI = "ui"    # Frontend/UI changes
    CONFIG = "config"  # Configuration changes
    DOCS = "docs"     # Documentation changes
    TESTS = "tests"   # Test changes
    INFRA = "infra"   # Infrastructure changes
    DEPS = "deps"     # Dependency changes
    FIX = "fix"       # Bug fixes
    PERF = "perf"     # Performance improvements
    OTHER = "other"   # Other changes

class DocumentationNeed(Enum):
    """Level of documentation needed for changes."""
    NONE = "none"        # No documentation needed
    MINIMAL = "minimal"  # Minor updates to existing docs
    PARTIAL = "partial"  # Some new documentation needed
    FULL = "full"       # Full documentation needed

class CommitAnalysisAgent(BaseAgent):
    """Agent for analyzing pull request changes and determining documentation needs."""
    
    def __init__(self):
        """Initialize the commit analysis agent."""
        super().__init__()
        self.analysis_template = """
        Analyze the following pull request changes and determine documentation needs.
        
        Pull Request:
        Title: {title}
        Description: {description}
        
        Changes:
        Added Files: {added_files}
        Modified Files: {modified_files}
        Removed Files: {removed_files}
        
        File Contents:
        {file_contents}
        
        Determine:
        1. Types of changes (API, UI, Config, Tests, Infrastructure, etc.)
        2. Impact level of changes (major/minor/patch)
        3. Documentation needs (none/minimal/partial/full)
        4. Breaking changes
        5. Areas affected (frontend, backend, infrastructure, etc.)
        6. Dependencies affected
        
        Format your response as a structured analysis.
        """
    
    async def analyze_changes(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze pull request changes and determine documentation needs."""
        # Get file contents for changed files
        file_contents = await self._get_changed_files_content(event_data)
        
        # Format the prompt
        prompt = self.analysis_template.format(
            title=event_data["pull_request"]["title"],
            description=event_data["pull_request"]["description"],
            added_files=event_data["changes"]["added_files"],
            modified_files=event_data["changes"]["modified_files"],
            removed_files=event_data["changes"]["removed_files"],
            file_contents=file_contents
        )
        
        # Get analysis from OpenAI
        messages = [
            {"role": "system", "content": "You are a technical documentation expert analyzing pull request changes."},
            {"role": "user", "content": prompt}
        ]
        
        result = await self.create_chat_completion(messages)
        
        # Parse and structure the analysis
        return self._parse_analysis(result)
    
    async def _get_changed_files_content(self, event_data: Dict[str, Any]) -> str:
        """Get content of changed files."""
        contents = []
        
        # Get content for added and modified files
        for file_path in (
            event_data["changes"]["added_files"] +
            event_data["changes"]["modified_files"]
        ):
            content = await self.get_file_content(file_path)
            if content:
                contents.append(f"File: {file_path}\n```\n{content}\n```\n")
        
        return "\n".join(contents)
    
    def _parse_analysis(self, analysis: str) -> Dict[str, Any]:
        """Parse the LLM analysis into a structured format."""
        return {
            "raw_analysis": analysis,
            "change_types": self._extract_change_types(analysis),
            "doc_needs": self._determine_doc_needs(analysis),
            "significance": self._extract_significance(analysis),
            "breaking_changes": self._extract_breaking_changes(analysis),
            "areas_affected": self._extract_areas_affected(analysis),
            "dependencies": self._extract_dependencies(analysis)
        }
    
    def _extract_change_types(self, analysis: str) -> List[ChangeType]:
        """Extract types of changes from analysis."""
        change_types = set()
        lower_analysis = analysis.lower()
        
        # Map keywords to change types
        type_keywords = {
            ChangeType.API: ["api", "endpoint", "function", "method", "interface"],
            ChangeType.UI: ["ui", "frontend", "css", "style", "component"],
            ChangeType.CONFIG: ["config", "setting", "environment", "env"],
            ChangeType.DOCS: ["doc", "documentation", "readme", "comment"],
            ChangeType.TESTS: ["test", "spec", "fixture", "mock"],
            ChangeType.INFRA: ["infra", "pipeline", "deploy", "docker", "k8s"],
            ChangeType.DEPS: ["dependency", "package", "requirement"],
            ChangeType.FIX: ["fix", "bug", "issue", "patch"],
            ChangeType.PERF: ["performance", "optimize", "improve", "speed"]
        }
        
        for change_type, keywords in type_keywords.items():
            if any(keyword in lower_analysis for keyword in keywords):
                change_types.add(change_type)
        
        if not change_types:
            change_types.add(ChangeType.OTHER)
        
        return list(change_types)
    
    def _determine_doc_needs(self, analysis: str) -> DocumentationNeed:
        """Determine documentation needs based on analysis."""
        lower_analysis = analysis.lower()
        
        # Check for indicators of documentation needs
        if any(x in lower_analysis for x in ["major change", "breaking change", "new feature"]):
            return DocumentationNeed.FULL
        elif any(x in lower_analysis for x in ["significant", "important", "notable"]):
            return DocumentationNeed.PARTIAL
        elif any(x in lower_analysis for x in ["minor", "small", "trivial"]):
            return DocumentationNeed.MINIMAL
        elif any(x in lower_analysis for x in ["no doc", "documentation not needed"]):
            return DocumentationNeed.NONE
            
        # Default to minimal for safety
        return DocumentationNeed.MINIMAL
    
    def _extract_significance(self, analysis: str) -> str:
        """Extract change significance level."""
        lower_analysis = analysis.lower()
        
        if any(x in lower_analysis for x in ["breaking change", "major update"]):
            return "major"
        elif any(x in lower_analysis for x in ["new feature", "significant"]):
            return "minor"
        return "patch"
    
    def _extract_breaking_changes(self, analysis: str) -> List[str]:
        """Extract breaking changes from analysis."""
        breaking_changes = []
        lines = analysis.split("\n")
        
        # Look for breaking change indicators
        in_breaking_section = False
        for line in lines:
            if "breaking" in line.lower():
                in_breaking_section = True
                continue
            if in_breaking_section and line.strip():
                if line.startswith(("-", "*", "•")):
                    breaking_changes.append(line.strip("-* "))
                elif len(breaking_changes) > 0:  # New section started
                    break
        
        return breaking_changes
    
    def _extract_areas_affected(self, analysis: str) -> List[str]:
        """Extract affected areas from analysis."""
        areas = set()
        lower_analysis = analysis.lower()
        
        # Map keywords to areas
        area_keywords = {
            "frontend": ["frontend", "ui", "interface", "component"],
            "backend": ["backend", "api", "server", "database"],
            "infrastructure": ["infrastructure", "pipeline", "deployment"],
            "documentation": ["documentation", "docs", "readme"],
            "testing": ["test", "spec", "coverage"],
            "configuration": ["config", "setting", "env"]
        }
        
        for area, keywords in area_keywords.items():
            if any(keyword in lower_analysis for keyword in keywords):
                areas.add(area)
        
        return list(areas)
    
    def _extract_dependencies(self, analysis: str) -> List[Dict[str, str]]:
        """Extract dependencies and their changes."""
        dependencies = []
        lines = analysis.split("\n")
        
        # Look for dependency-related information
        in_deps_section = False
        for line in lines:
            if "dependenc" in line.lower():
                in_deps_section = True
                continue
            if in_deps_section and line.strip():
                if line.startswith(("-", "*", "•")):
                    dep_line = line.strip("-* ")
                    # Try to extract dependency name and change type
                    if ":" in dep_line:
                        name, change = dep_line.split(":", 1)
                        dependencies.append({
                            "name": name.strip(),
                            "change": change.strip()
                        })
                    else:
                        dependencies.append({
                            "name": dep_line,
                            "change": "modified"
                        })
                elif len(dependencies) > 0:  # New section started
                    break
        
        return dependencies 