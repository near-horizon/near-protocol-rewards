"""Base template system for documentation generation."""

from typing import Dict, Any, Optional
from pathlib import Path
import jinja2

class BaseTemplate:
    """Base class for all documentation templates."""
    
    def __init__(self, template_dir: Optional[str] = None):
        """Initialize template system."""
        if template_dir is None:
            template_dir = str(Path(__file__).parent / "files")
        
        self.env = jinja2.Environment(
            loader=jinja2.FileSystemLoader(template_dir),
            autoescape=True,
            trim_blocks=True,
            lstrip_blocks=True
        )
    
    def render(self, template_name: str, context: Dict[str, Any]) -> str:
        """Render a template with the given context."""
        template = self.env.get_template(template_name)
        return template.render(**context)
    
    def get_template_path(self, template_name: str) -> str:
        """Get the full path to a template file."""
        return str(Path(self.env.loader.searchpath[0]) / template_name) 