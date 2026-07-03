from typing import List, Dict, Any, TypedDict, Optional

class AgentState(TypedDict):
    """
    State definition for the LangGraph multi-agent coordination workflow.
    Tracks query parameters, routing selections, retrieved vector context,
    accumulated thoughts, and the final compiled response.
    """
    # Inputs
    user_query: str
    paper_id: str
    chat_history: List[Dict[str, str]]
    
    # Paper Metadata (loaded during graph execution)
    paper_title: str
    paper_authors: List[str]
    paper_year: Optional[int]
    
    # Intermediate State Values
    selected_agent: str
    needs_search: bool
    search_query: str
    retrieved_context: str
    agent_thoughts: str
    
    # Outputs
    final_answer: str
    citation_sources: List[str]
    metadata: Dict[str, Any]
