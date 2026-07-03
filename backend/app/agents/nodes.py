import logging
from typing import List, Dict, Any, Optional
from openai import OpenAI

from app.core.config import settings
from app.agents.state import (
    SupervisorResponse,
    QAResponse,
    ExplainerResponse,
    ContributionResponse,
    CitationResponse,
    SummaryResponse,
    VerificationResponse
)
from app.prompts.agent_prompts import (
    SUPERVISOR_PROMPT,
    QA_PROMPT,
    EXPLAINER_PROMPT,
    CONTRIBUTION_PROMPT,
    CITATION_PROMPT,
    SUMMARY_PROMPT,
    VERIFICATION_PROMPT
)

logger = logging.getLogger("app.agents.nodes")

class AgentNodeRunner:
    """
    Executes specialized LLM agents using OpenAI's Structured Outputs or Groq polyfills.
    Automatically detects the provider keys and routes requests accordingly.
    """
    def __init__(self, api_key: str):
        self.api_key = api_key
        self._client = None
        self.is_groq = api_key.startswith("gsk_") if api_key else False
        
        if self.is_groq:
            logger.info("Auto-detect: Groq API Key prefix found.")
            self.model_name = "llama-3.3-70b-versatile" # Fast, high-capacity model on Groq
        else:
            self.model_name = "gpt-4o-mini" # OpenAI Structured Outputs model

    @property
    def client(self) -> OpenAI:
        if self._client is None:
            if not self.api_key:
                raise ValueError("OpenAI/Groq API Key is missing. Please configure it in your environment.")
            
            if self.is_groq:
                logger.info("Initializing OpenAI Client configured for Groq endpoints...")
                self._client = OpenAI(
                    api_key=self.api_key,
                    base_url="https://api.groq.com/openai/v1"
                )
            else:
                self._client = OpenAI(api_key=self.api_key)
        return self._client

    def _run_completion(
        self, 
        messages: List[Dict[str, str]], 
        response_format: Any, 
        temperature: float = 0.0
    ) -> Any:
        """
        Abstracted completion helper. Uses OpenAI beta.parse Structured Outputs
        or falls back to standard JSON mode + Pydantic validation for Groq.
        """
        if self.is_groq:
            # Groq JSON mode validation
            schema_json = response_format.model_json_schema()
            payload_messages = [msg.copy() for msg in messages]
            # Inject JSON schema formatting instructions
            payload_messages[0]["content"] += (
                f"\n\nYou MUST return a JSON object conforming exactly to this JSON schema:\n{schema_json}"
            )
            
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=payload_messages,
                response_format={"type": "json_object"},
                temperature=temperature
            )
            content = response.choices[0].message.content
            logger.debug("Groq JSON response parsed: %s", content)
            return response_format.model_validate_json(content)
        else:
            # Standard OpenAI Structured Outputs
            response = self.client.beta.chat.completions.parse(
                model=self.model_name,
                messages=messages,
                response_format=response_format,
                temperature=temperature
            )
            return response.choices[0].message.parsed

    def run_supervisor(
        self, 
        paper_title: str, 
        paper_authors: List[str], 
        paper_year: Optional[int], 
        chat_history: List[Dict[str, str]], 
        user_query: str
    ) -> SupervisorResponse:
        """
        Runs the Supervisor Agent to parse routing decisions and vector DB queries.
        """
        logger.info("Executing Supervisor Agent...")
        sys_prompt = SUPERVISOR_PROMPT.format(
            paper_title=paper_title,
            paper_authors=", ".join(paper_authors),
            paper_year=paper_year or "N/A"
        )
        
        messages = [{"role": "system", "content": sys_prompt}]
        for msg in chat_history:
            messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": user_query})

        try:
            parsed = self._run_completion(messages, SupervisorResponse, temperature=0.0)
            logger.info("Supervisor decided: Route to %s | Search: %s", parsed.selected_agent, parsed.needs_search)
            return parsed
        except Exception as e:
            logger.exception("Supervisor execution failed.")
            raise RuntimeError(f"Supervisor agent failure: {str(e)}")

    def run_qa_agent(
        self, 
        paper_title: str, 
        paper_authors: List[str], 
        retrieved_context: str, 
        user_query: str, 
        chat_history: List[Dict[str, str]]
    ) -> QAResponse:
        """
        Runs the QA Agent to answer queries using context chunks.
        """
        logger.info("Executing QA Agent...")
        sys_prompt = QA_PROMPT.format(
            paper_title=paper_title,
            paper_authors=", ".join(paper_authors),
            retrieved_context=retrieved_context
        )
        
        messages = [{"role": "system", "content": sys_prompt}]
        for msg in chat_history:
            messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": user_query})

        try:
            return self._run_completion(messages, QAResponse, temperature=0.0)
        except Exception as e:
            logger.exception("QA Agent execution failed.")
            raise RuntimeError(f"QA agent failure: {str(e)}")

    def run_explainer_agent(
        self, 
        paper_title: str, 
        paper_authors: List[str], 
        retrieved_context: str, 
        user_query: str, 
        chat_history: List[Dict[str, str]]
    ) -> ExplainerResponse:
        """
        Runs the Explainer Agent to breakdown terminology or math notations.
        """
        logger.info("Executing Explainer Agent...")
        sys_prompt = EXPLAINER_PROMPT.format(
            paper_title=paper_title,
            paper_authors=", ".join(paper_authors),
            retrieved_context=retrieved_context
        )
        
        messages = [{"role": "system", "content": sys_prompt}]
        for msg in chat_history:
            messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": user_query})

        try:
            return self._run_completion(messages, ExplainerResponse, temperature=0.0)
        except Exception as e:
            logger.exception("Explainer Agent execution failed.")
            raise RuntimeError(f"Explainer agent failure: {str(e)}")

    def run_contribution_agent(
        self, 
        paper_title: str, 
        paper_authors: List[str], 
        retrieved_context: str, 
        user_query: str, 
        chat_history: List[Dict[str, str]]
    ) -> ContributionResponse:
        """
        Runs the Contribution Agent to compile paper advantages, weaknesses, and next-steps.
        """
        logger.info("Executing Contribution Agent...")
        sys_prompt = CONTRIBUTION_PROMPT.format(
            paper_title=paper_title,
            paper_authors=", ".join(paper_authors),
            retrieved_context=retrieved_context
        )
        
        messages = [{"role": "system", "content": sys_prompt}]
        for msg in chat_history:
            messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": user_query})

        try:
            return self._run_completion(messages, ContributionResponse, temperature=0.0)
        except Exception as e:
            logger.exception("Contribution Agent execution failed.")
            raise RuntimeError(f"Contribution agent failure: {str(e)}")

    def run_citation_agent(
        self, 
        paper_title: str, 
        paper_authors: List[str], 
        retrieved_context: str, 
        user_query: str, 
        chat_history: List[Dict[str, str]]
    ) -> CitationResponse:
        """
        Runs the Citation Agent to resolve inline quotes and bibliography venules.
        """
        logger.info("Executing Citation Agent...")
        sys_prompt = CITATION_PROMPT.format(
            paper_title=paper_title,
            paper_authors=", ".join(paper_authors),
            retrieved_context=retrieved_context
        )
        
        messages = [{"role": "system", "content": sys_prompt}]
        for msg in chat_history:
            messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": user_query})

        try:
            return self._run_completion(messages, CitationResponse, temperature=0.0)
        except Exception as e:
            logger.exception("Citation Agent execution failed.")
            raise RuntimeError(f"Citation agent failure: {str(e)}")

    def run_summary_agent(
        self, 
        paper_title: str, 
        paper_authors: List[str], 
        retrieved_context: str, 
        user_query: str, 
        chat_history: List[Dict[str, str]]
    ) -> SummaryResponse:
        """
        Runs the Summary Agent to compile outline and finding dashboards.
        """
        logger.info("Executing Summary Agent...")
        sys_prompt = SUMMARY_PROMPT.format(
            paper_title=paper_title,
            paper_authors=", ".join(paper_authors),
            retrieved_context=retrieved_context
        )
        
        messages = [{"role": "system", "content": sys_prompt}]
        for msg in chat_history:
            messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": user_query})

        try:
            return self._run_completion(messages, SummaryResponse, temperature=0.0)
        except Exception as e:
            logger.exception("Summary Agent execution failed.")
            raise RuntimeError(f"Summary agent failure: {str(e)}")

    def run_verification_agent(
        self,
        retrieved_context: str,
        user_query: str,
        drafted_answer: str
    ) -> VerificationResponse:
        """
        Runs the Verification Agent to audit/refine specialist drafted answers against context.
        """
        logger.info("Executing Verification and Refinement Agent...")
        sys_prompt = VERIFICATION_PROMPT.format(
            retrieved_context=retrieved_context,
            user_query=user_query,
            drafted_answer=drafted_answer
        )
        
        messages = [{"role": "system", "content": sys_prompt}]
        try:
            return self._run_completion(messages, VerificationResponse, temperature=0.0)
        except Exception as e:
            logger.exception("Verification Agent execution failed.")
            raise RuntimeError(f"Verification agent failure: {str(e)}")
