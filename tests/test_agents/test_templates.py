"""Tests for template system."""

import pytest
from pathlib import Path
from src.templates.base import BaseTemplate

@pytest.fixture
def template_system():
    """Create a template system instance."""
    return BaseTemplate()

def test_render_api_template(template_system):
    """Test rendering API documentation template."""
    context = {
        "title": "User API",
        "description": "API for managing users",
        "classes": [{
            "name": "UserService",
            "description": "Service for user operations",
            "methods": [{
                "name": "create_user",
                "signature": "async def create_user(self, data: Dict[str, Any]) -> User",
                "description": "Create a new user",
                "params": [{
                    "name": "data",
                    "type": "Dict[str, Any]",
                    "description": "User data"
                }],
                "returns": "Created user object",
                "example": 'user = await service.create_user({"name": "Test"})'
            }]
        }]
    }
    
    result = template_system.render("api.md.j2", context)
    
    assert "# User API" in result
    assert "API for managing users" in result
    assert "UserService" in result
    assert "create_user" in result
    assert "async def create_user" in result

def test_render_config_template(template_system):
    """Test rendering configuration documentation template."""
    context = {
        "title": "Configuration Guide",
        "description": "System configuration options",
        "config_options": [{
            "name": "DATABASE_URL",
            "type": "string",
            "description": "Database connection URL",
            "default": "postgresql://localhost:5432/db",
            "required": True,
            "example": "postgresql://user:pass@host:5432/db"
        }]
    }
    
    result = template_system.render("config.md.j2", context)
    
    assert "# Configuration Guide" in result
    assert "System configuration options" in result
    assert "DATABASE_URL" in result
    assert "postgresql://localhost:5432/db" in result

def test_render_changelog_template(template_system):
    """Test rendering changelog template."""
    context = {
        "version": "1.0.0",
        "release_date": "2024-02-01",
        "breaking_changes": ["Changed API response format"],
        "added": ["New user endpoints"],
        "changed": ["Updated authentication flow"],
        "fixed": ["Fixed login issue"]
    }
    
    result = template_system.render("changelog.md.j2", context)
    
    assert "## [1.0.0]" in result
    assert "2024-02-01" in result
    assert "Changed API response format" in result
    assert "New user endpoints" in result
    assert "Updated authentication flow" in result
    assert "Fixed login issue" in result

def test_render_tutorial_template(template_system):
    """Test rendering tutorial template."""
    context = {
        "title": "Getting Started",
        "description": "Learn how to use the system",
        "prerequisites": ["Python 3.8+", "Docker"],
        "steps": [{
            "title": "Installation",
            "description": "Install the package",
            "code": "pip install package-name",
            "output": "Successfully installed package-name-1.0.0"
        }]
    }
    
    result = template_system.render("tutorial.md.j2", context)
    
    assert "# Getting Started" in result
    assert "Learn how to use the system" in result
    assert "Python 3.8+" in result
    assert "Docker" in result
    assert "pip install package-name" in result

def test_template_not_found(template_system):
    """Test handling of non-existent template."""
    with pytest.raises(FileNotFoundError):
        template_system.render("nonexistent.md.j2", {})

def test_invalid_template_syntax(template_system, tmp_path):
    """Test handling of invalid template syntax."""
    # Create a template with invalid syntax
    template_path = tmp_path / "invalid.md.j2"
    template_path.write_text("{{ invalid syntax }")
    
    with pytest.raises(Exception):
        template_system.render("invalid.md.j2", {}) 