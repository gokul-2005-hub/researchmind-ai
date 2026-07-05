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
    Executes specialized LLM agents using OpenAI, Groq, Gemini, or OpenRouter.
    Includes a robust multi-provider fallback order and comma-separated master key rotation
    to make requests extremely resilient to rate limits (429) or token quotas.
    """
    def __init__(self, api_key: str):
        self.api_key = api_key

    @property
    def is_groq(self) -> bool:
        """
        Helper property for the workflow scheduler to optimize context size constraints.
        Returns True if Groq is a configured LLM provider.
        """
        if settings.ALL_GROQ_KEYS.strip():
            return True
        if self.api_key and self.api_key.startswith("gsk_"):
            return True
        return False

    def _run_gemini_attempt(
        self,
        key: str,
        messages: List[Dict[str, str]],
        response_format: Any,
        temperature: float
    ) -> Any:
        client = OpenAI(
            api_key=key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
        )
        schema_json = response_format.model_json_schema()
        payload_messages = [msg.copy() for msg in messages]
        payload_messages[0]["content"] += (
            f"\n\nYou MUST return a JSON object conforming exactly to this JSON schema:\n{schema_json}"
        )
        response = client.chat.completions.create(
            model=settings.GEMINI_MODEL,
            messages=payload_messages,
            response_format={"type": "json_object"},
            temperature=temperature
        )
        content = response.choices[0].message.content
        return response_format.model_validate_json(content)

    def _run_groq_attempt(
        self,
        key: str,
        messages: List[Dict[str, str]],
        response_format: Any,
        temperature: float
    ) -> Any:
        client = OpenAI(
            api_key=key,
            base_url="https://api.groq.com/openai/v1"
        )
        schema_json = response_format.model_json_schema()
        payload_messages = [msg.copy() for msg in messages]
        payload_messages[0]["content"] += (
            f"\n\nYou MUST return a JSON object conforming exactly to this JSON schema:\n{schema_json}"
        )
        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=payload_messages,
            response_format={"type": "json_object"},
            temperature=temperature
        )
        content = response.choices[0].message.content
        return response_format.model_validate_json(content)

    def _run_openrouter_attempt(
        self,
        key: str,
        messages: List[Dict[str, str]],
        response_format: Any,
        temperature: float
    ) -> Any:
        client = OpenAI(
            api_key=key,
            base_url="https://openrouter.ai/api/v1"
        )
        schema_json = response_format.model_json_schema()
        payload_messages = [msg.copy() for msg in messages]
        payload_messages[0]["content"] += (
            f"\n\nYou MUST return a JSON object conforming exactly to this JSON schema:\n{schema_json}"
        )
        response = client.chat.completions.create(
            model=settings.OPENROUTER_MODEL,
            messages=payload_messages,
            response_format={"type": "json_object"},
            temperature=temperature
        )
        content = response.choices[0].message.content
        return response_format.model_validate_json(content)

    def _run_openai_attempt(
        self,
        key: str,
        messages: List[Dict[str, str]],
        response_format: Any,
        temperature: float
    ) -> Any:
        client = OpenAI(api_key=key)
        response = client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=messages,
            response_format=response_format,
            temperature=temperature
        )
        return response.choices[0].message.parsed

    def _run_completion(
        self, 
        messages: List[Dict[str, str]], 
        response_format: Any, 
        temperature: float = 0.0
    ) -> Any:
        """
        Runs completions against LLM providers sequentially using fallback orders and rotated keys.
        """
        # Parse comma-separated key lists
        gemini_keys = [k.strip() for k in settings.ALL_GEMINI_KEYS.split(",") if k.strip()]
        groq_keys = [k.strip() for k in settings.ALL_GROQ_KEYS.split(",") if k.strip()]
        openrouter_keys = [k.strip() for k in settings.ALL_OPENROUTER_KEYS.split(",") if k.strip()]
        
        # Detect key types from default API key field if master lists are empty
        if not gemini_keys and self.api_key and self.api_key.startswith("AIzaSy"):
            gemini_keys = [self.api_key]
        if not groq_keys and self.api_key and self.api_key.startswith("gsk_"):
            groq_keys = [self.api_key]
        if not openrouter_keys and self.api_key and self.api_key.startswith("sk-or-"):
            openrouter_keys = [self.api_key]
            
        # Detect standard OpenAI API keys
        openai_keys = [self.api_key] if (self.api_key and not self.api_key.startswith("gsk_") and not self.api_key.startswith("AIzaSy") and not self.api_key.startswith("sk-or-")) else []
        
        # Get fallback order
        providers = [p.strip().lower() for p in settings.FALLBACK_ORDER.split(",") if p.strip()]
        
        # If standard OpenAI key is detected, prioritize it first in fallback routing
        if openai_keys:
            providers = ["openai"] + [p for p in providers if p != "openai"]
            
        provider_keys = {
            "gemini": gemini_keys,
            "groq": groq_keys,
            "openrouter": openrouter_keys,
            "openai": openai_keys
        }
        
        last_error = None
        for provider in providers:
            keys = provider_keys.get(provider, [])
            if not keys:
                continue
                
            logger.info("Executing completion using provider: %s (%d keys configured)", provider, len(keys))
            for i, key in enumerate(keys):
                try:
                    if provider == "gemini":
                        return self._run_gemini_attempt(key, messages, response_format, temperature)
                    elif provider == "groq":
                        return self._run_groq_attempt(key, messages, response_format, temperature)
                    elif provider == "openrouter":
                        return self._run_openrouter_attempt(key, messages, response_format, temperature)
                    elif provider == "openai":
                        return self._run_openai_attempt(key, messages, response_format, temperature)
                except Exception as e:
                    logger.warning("Completion failed for provider %s with key index %d: %s", provider, i, str(e))
                    last_error = e
                    continue
                    
        # If all fallback options fail, raise the last encountered error
        if last_error:
            raise last_error
        raise RuntimeError("No configured LLM keys or providers were available to complete the request.")

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
