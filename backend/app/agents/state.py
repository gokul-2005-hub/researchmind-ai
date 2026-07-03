from pydantic import BaseModel, Field
from typing import List, Dict, Optional

class SupervisorResponse(BaseModel):
    selected_agent: str = Field(
        ...,
        description="The name of the next specialized agent to route to. Options: 'qa_agent', 'explainer_agent', 'contribution_agent', 'citation_agent', 'summary_agent', 'direct_response'."
    )
    reasoning: str = Field(
        ..., 
        description="Logical rationale explaining why this specific agent was chosen."
    )
    needs_search: bool = Field(
        ..., 
        description="True if the user query requires context from the paper vector store, False otherwise."
    )
    search_query: str = Field(
        ..., 
        description="If needs_search is True, formulate the optimized query to search the paper index. Leave empty if False."
    )


class QAResponse(BaseModel):
    answer: str = Field(
        ...,
        description="Clear, detailed, and direct answer to the user question, synthesizing retrieved context."
    )
    citation_sources: List[str] = Field(
        ...,
        description="List of text chunks, page coordinates, or section titles that directly support the answer."
    )
    agent_thoughts: str = Field(
        ...,
        description="Internal thinking log detailing how context was synthesized to formulate the response."
    )


class ExplainerResponse(BaseModel):
    concept: str = Field(
        ...,
        description="The technical concept, terminology, equation, or algorithm being explained."
    )
    explanation: str = Field(
        ...,
        description="Simple, clear, and comprehensive breakdown of the concept, using analogies if helpful."
    )
    equations_or_code: List[str] = Field(
        ...,
        description="Annotated breakdown of formulas, variables, code snippets, or mathematical logic associated with the concept."
    )
    agent_thoughts: str = Field(
        ...,
        description="Internal logical reasoning steps behind the explanation."
    )


class ContributionResponse(BaseModel):
    contributions: List[str] = Field(
        ...,
        description="List of explicit contributions or advantages claimed by the authors."
    )
    novelty: str = Field(
        ...,
        description="Summary of what makes this paper novel compared to previous state-of-the-art systems."
    )
    limitations: List[str] = Field(
        ...,
        description="Documented weaknesses, constraints, assumptions, or boundaries of the proposed research."
    )
    future_work: List[str] = Field(
        ...,
        description="Directions for future research, extensions, or improvements suggested by the paper."
    )
    agent_thoughts: str = Field(
        ...,
        description="Logical thinking log analyzing contributions and constraints."
    )


class CitationItem(BaseModel):
    citation_key: str = Field(
        ...,
        description="The citation identifier inside the text, e.g. [1] or (Vaswani et al., 2017)."
    )
    author_venue: Optional[str] = Field(
        None,
        description="Full author list and publication venue (journal, conference) parsed from references."
    )
    year: Optional[str] = Field(
        None,
        description="Publication year of the cited paper."
    )
    context_quote: Optional[str] = Field(
        None,
        description="Quote from the paper describing the context in which this citation was referenced."
    )
    doi: Optional[str] = Field(
        None,
        description="Digital Object Identifier (DOI) of the reference, if explicitly mentioned."
    )


class CitationResponse(BaseModel):
    extracted_citations: List[CitationItem] = Field(
        ...,
        description="List of references and citations extracted from the text."
    )
    agent_thoughts: str = Field(
        ...,
        description="Reasoning steps behind references matching and citation verification."
    )


class SummaryResponse(BaseModel):
    executive_summary: str = Field(
        ...,
        description="High-level 2-3 paragraph executive summary of the paper's core ideas and impact."
    )
    key_findings: List[str] = Field(
        ...,
        description="Core conclusions, experimental observations, or qualitative findings."
    )
    methodology_summary: str = Field(
        ...,
        description="Summary of the experimental setup, system architecture, dataset, or mathematical proofs."
    )
    section_summaries: Dict[str, str] = Field(
        ...,
        description="Dict mapping identified section headers (e.g. '1. Introduction') to their respective summaries."
    )
    agent_thoughts: str = Field(
        ...,
        description="Internal thinking log summarizing document structure."
    )


class VerificationResponse(BaseModel):
    is_fully_correct: bool = Field(
        ...,
        description="True if the specialist response is factually 100% correct according to the context."
    )
    corrections_made: Optional[str] = Field(
        None,
        description="Details of corrections made if any factual errors or partial inaccuracies were identified."
    )
    refined_answer: str = Field(
        ...,
        description="The finalized, corrected response in clean markdown."
    )
    verification_thoughts: str = Field(
        ...,
        description="Internal logical reasoning steps behind the verification."
    )
