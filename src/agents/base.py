"""Base agent class with common functionality."""

from typing import Dict, Any, Optional, List
from openai import AsyncOpenAI
from ..config.settings import settings
from ..services.github_service import GitHubService

class BaseAgent:
    """Base class for all agents with shared functionality."""
    
    def __init__(self):
        """Initialize base agent with common components."""
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.MODEL_NAME  # o3-mini-2025-01-31
        self.temperature = settings.TEMPERATURE
        self.github_service = GitHubService()
    
    async def create_chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None
    ) -> str:
        """Create a chat completion using OpenAI."""
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature or self.temperature,
                max_tokens=max_tokens,
                response_format={"type": "text"}
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            # Log the error and re-raise
            print(f"Error creating chat completion: {str(e)}")
            raise
    
    async def get_file_content(self, path: str, ref: Optional[str] = None) -> Optional[str]:
        """Get file content from GitHub repository."""
        return await self.github_service.read_file(path, ref)
    
    async def create_or_update_file(
        self,
        path: str,
        content: str,
        branch: str,
        message: str,
        create: bool = True
    ) -> bool:
        """Create or update a file in the repository."""
        if create:
            return await self.github_service.create_file(path, content, branch, message)
        return await self.github_service.update_file(path, content, branch, message)
    
    def format_markdown(self, content: Dict[str, Any]) -> str:
        """Format content as markdown."""
        raise NotImplementedError("Subclasses must implement format_markdown")
