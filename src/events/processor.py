"""Event processor for coordinating agent activities."""

import asyncio
import logging
from typing import Dict, Any, List, Optional
from ..agents.commit_agent import CommitAnalysisAgent, DocumentationNeed, ChangeType
from ..agents.docs_agent import DocumentationAgent
from ..agents.tutorial_agent import TutorialAgent
from ..agents.review_agent import ReviewAgent
from ..services.github_service import GitHubService
from .queue import EventQueue
from ..config.settings import settings

logger = logging.getLogger(__name__)

class EventProcessor:
    """Processes events from the queue and coordinates agent activities."""
    
    def __init__(self):
        """Initialize processor with required agents."""
        self.queue = EventQueue()
        self.commit_agent = CommitAnalysisAgent()
        self.docs_agent = DocumentationAgent()
        self.tutorial_agent = TutorialAgent()
        self.review_agent = ReviewAgent()
        self.github_service = GitHubService()
        self._running = False
        self._task: Optional[asyncio.Task] = None
    
    async def start(self):
        """Start processing events from the queue."""
        logger.info("Starting event processor")
        self._running = True
        self._task = asyncio.create_task(self._process_loop())
    
    async def stop(self):
        """Stop processing events."""
        logger.info("Stopping event processor")
        self._running = False
        if self._task:
            await self._task
            self._task = None
    
    async def _process_loop(self):
        """Main processing loop."""
        while self._running:
            try:
                # Get next event
                event = await self.queue.dequeue_event()
                if event:
                    await self.process_event(event)
                else:
                    # If no events and Redis is disabled, we can sleep longer
                    await asyncio.sleep(5 if settings.REDIS_ENABLED else 30)
            except Exception as e:
                logger.error(f"Error processing event: {str(e)}")
                # Wait before retrying
                await asyncio.sleep(5)
    
    async def process_event(self, event: Dict[str, Any]):
        """Process a single event through all required steps."""
        try:
            event_id = event["id"]
            event_data = event["data"]
            logger.info(f"Processing event {event_id}")
            
            # 1. Analyze changes
            analysis_result = await self.commit_agent.analyze_changes(event_data)
            logger.info(f"Change types: {[ct.value for ct in analysis_result['change_types']]}")
            logger.info(f"Documentation needs: {analysis_result['doc_needs'].value}")
            
            # Initialize results
            docs_result = None
            tutorial_result = None
            
            # 2. Process based on documentation needs
            if analysis_result["doc_needs"] != DocumentationNeed.NONE:
                # Determine which documentation to generate
                docs_to_generate = self._determine_docs_to_generate(
                    analysis_result["change_types"],
                    analysis_result["doc_needs"]
                )
                
                # Generate documentation if needed
                if "api" in docs_to_generate or "guide" in docs_to_generate:
                    docs_result = await self.docs_agent.generate_documentation(
                        event_data,
                        analysis_result
                    )
                
                # Create tutorial if needed
                if "tutorial" in docs_to_generate:
                    tutorial_result = await self.tutorial_agent.create_tutorial(
                        event_data,
                        analysis_result
                    )
                
                # 3. Review generated content
                if docs_result or tutorial_result:
                    review_result = await self.review_agent.review_content({
                        "documentation": docs_result,
                        "tutorial": tutorial_result
                    })
                    
                    # 4. Create documentation PR if approved
                    if review_result["approved"]:
                        await self.create_documentation_pr(event_data, {
                            "documentation": docs_result,
                            "tutorial": tutorial_result,
                            "review": review_result,
                            "analysis": analysis_result
                        })
            else:
                logger.info("No documentation updates needed for this change")
            
            # Mark event as completed
            await self.queue.complete_event(event_id, success=True)
            logger.info(f"Completed processing event {event_id}")
            
        except Exception as e:
            logger.error(f"Failed to process event {event['id']}: {str(e)}")
            await self.queue.complete_event(event["id"], success=False)
    
    def _determine_docs_to_generate(
        self,
        change_types: List[ChangeType],
        doc_need: DocumentationNeed
    ) -> List[str]:
        """Determine which types of documentation to generate."""
        docs_to_generate = []
        
        # For full documentation needs
        if doc_need == DocumentationNeed.FULL:
            if ChangeType.API in change_types:
                docs_to_generate.extend(["api", "guide", "tutorial"])
            elif ChangeType.UI in change_types:
                docs_to_generate.extend(["guide", "tutorial"])
            else:
                docs_to_generate.append("guide")
        
        # For partial documentation needs
        elif doc_need == DocumentationNeed.PARTIAL:
            if ChangeType.API in change_types:
                docs_to_generate.extend(["api", "guide"])
            elif ChangeType.UI in change_types:
                docs_to_generate.append("guide")
            elif any(ct in change_types for ct in [ChangeType.CONFIG, ChangeType.INFRA]):
                docs_to_generate.append("guide")
        
        # For minimal documentation needs
        elif doc_need == DocumentationNeed.MINIMAL:
            if ChangeType.API in change_types:
                docs_to_generate.append("api")
            elif any(ct in change_types for ct in [ChangeType.UI, ChangeType.CONFIG]):
                docs_to_generate.append("guide")
        
        return docs_to_generate
    
    async def create_documentation_pr(
        self,
        event_data: Dict[str, Any],
        results: Dict[str, Any]
    ):
        """Create a pull request with generated documentation."""
        try:
            # 1. Create new branch
            base_branch = event_data["pull_request"]["base_branch"]
            pr_number = event_data["pull_request"]["number"]
            new_branch = f"docs/pr-{pr_number}"
            
            success = await self.github_service.create_branch(base_branch, new_branch)
            if not success:
                raise Exception("Failed to create branch")
            
            # 2. Create/update documentation files
            if results.get("documentation"):
                for doc_type, data in results["documentation"].items():
                    for file_path in data["files"]:
                        await self.github_service.create_or_update_file(
                            path=file_path,
                            content=data["content"],
                            branch=new_branch,
                            message=f"Update {doc_type} documentation for PR #{pr_number}"
                        )
            
            # 3. Create/update tutorial if present
            if results.get("tutorial"):
                await self.github_service.create_or_update_file(
                    path=results["tutorial"]["file"],
                    content=results["tutorial"]["content"],
                    branch=new_branch,
                    message=f"Add tutorial for PR #{pr_number}"
                )
            
            # 4. Create pull request
            pr_title = f"Documentation updates for PR #{pr_number}"
            pr_body = self._format_pr_body(event_data, results)
            
            pr_result = await self.github_service.create_pull_request(
                title=pr_title,
                body=pr_body,
                head_branch=new_branch,
                base_branch=base_branch
            )
            
            if not pr_result:
                raise Exception("Failed to create documentation PR")
            
            logger.info(f"Created documentation PR: {pr_result.get('html_url')}")
            
        except Exception as e:
            logger.error(f"Failed to create documentation PR: {str(e)}")
            raise
    
    def _format_pr_body(self, event_data: Dict[str, Any], results: Dict[str, Any]) -> str:
        """Format the pull request body."""
        analysis = results["analysis"]
        sections = [
            f"# Documentation Updates for PR #{event_data['pull_request']['number']}\n",
            "This PR contains automatically generated documentation updates based on the changes in "
            f"PR #{event_data['pull_request']['number']}.\n",
            "## Change Analysis\n",
            f"- Change Types: {', '.join(ct.value for ct in analysis['change_types'])}",
            f"- Documentation Need: {analysis['doc_needs'].value}",
            f"- Significance: {analysis['significance']}",
            f"- Areas Affected: {', '.join(analysis['areas_affected'])}\n"
        ]
        
        # Add breaking changes section if any
        if analysis["breaking_changes"]:
            sections.extend([
                "### ⚠️ Breaking Changes",
                *[f"- {change}" for change in analysis["breaking_changes"]],
                ""
            ])
        
        # Add documentation changes
        if results.get("documentation"):
            sections.append("### Documentation Updates")
            for doc_type, data in results["documentation"].items():
                sections.append(f"- Updated {doc_type} documentation")
                for file_path in data["files"]:
                    sections.append(f"  - {file_path}")
        
        # Add tutorial changes
        if results.get("tutorial"):
            sections.append("\n### Tutorial Updates")
            sections.append(f"- Added tutorial: {results['tutorial']['file']}")
        
        # Add review summary
        if results.get("review"):
            sections.append("\n## Review Summary")
            sections.append(results["review"]["raw_review"])
        
        return "\n".join(sections)

async def run_processor():
    """Run the event processor."""
    processor = EventProcessor()
    await processor.start()
