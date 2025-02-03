"""GitHub toolkit integration using LangChain."""

from typing import List, Optional
from github import Github
from langchain_community.tools.github import GitHubToolkit
from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_react_agent
from ..config.settings import settings

class GitHubToolManager:
    """Manages GitHub toolkit and provides access to various GitHub tools."""
    
    def __init__(self):
        # Initialize GitHub client
        self.github = Github(settings.GITHUB_TOKEN)
        
        # Initialize LLM
        self.llm = ChatOpenAI(
            model="gpt-4",
            temperature=0,
            api_key=settings.OPENAI_API_KEY
        )
        
        # Initialize GitHub toolkit with all tools
        self.toolkit = GitHubToolkit.from_github_api_wrapper(
            github=self.github,
            include_release_tools=True
        )
        
        # Get all available tools
        self.tools = self.toolkit.get_tools()
        
    def get_commit_tools(self) -> List:
        """Get tools for commit analysis."""
        return [
            tool for tool in self.tools
            if tool.name in [
                "Get Issues",
                "Get Issue",
                "Comment on Issue",
                "Create Pull Request"
            ]
        ]
    
    def get_docs_tools(self) -> List:
        """Get tools for documentation tasks."""
        return [
            tool for tool in self.tools
            if tool.name in [
                "Create File",
                "Read File",
                "Update File",
                "Delete File"
            ]
        ]
    
    def get_release_tools(self) -> List:
        """Get tools for release management."""
        return [
            tool for tool in self.tools
            if tool.name in [
                "Get Latest Release",
                "Get Releases",
                "Get Release"
            ]
        ]
    
    def create_agent(self, tools: Optional[List] = None) -> AgentExecutor:
        """Create an agent with specified tools."""
        if tools is None:
            tools = self.tools
            
        # Create React agent
        agent = create_react_agent(self.llm, tools)
        
        # Create agent executor
        return AgentExecutor.from_agent_and_tools(
            agent=agent,
            tools=tools,
            verbose=True
        )
    
    def analyze_commit(self, commit_sha: str) -> dict:
        """Analyze a specific commit using commit analysis tools."""
        agent = self.create_agent(self.get_commit_tools())
        query = f"Analyze commit {commit_sha} and provide a detailed summary of changes"
        return agent.invoke({"input": query})
    
    def generate_docs(self, file_path: str, content: str) -> dict:
        """Generate or update documentation."""
        agent = self.create_agent(self.get_docs_tools())
        query = f"Generate documentation for file {file_path} with content: {content}"
        return agent.invoke({"input": query})
    
    def create_changelog(self, from_tag: str, to_tag: str) -> dict:
        """Generate changelog between two tags."""
        agent = self.create_agent(self.get_release_tools())
        query = f"Generate changelog between tags {from_tag} and {to_tag}"
        return agent.invoke({"input": query}) 