import logging
from abc import ABC, abstractmethod
from typing import List
from app.core.config import settings

logger = logging.getLogger("app.services.embeddings")

class BaseEmbeddingService(ABC):
    @abstractmethod
    def embed_query(self, text: str) -> List[float]:
        """Generates a single vector embedding for a query string."""
        pass

    @abstractmethod
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Generates multiple vector embeddings for a list of document strings."""
        pass

    @abstractmethod
    def get_dimensions(self) -> int:
        """Returns the output vector space dimensions size."""
        pass


class LocalEmbeddingService(BaseEmbeddingService):
    """
    Local embedding generation using Sentence Transformers. Runs entirely offline.
    """
    def __init__(self, model_name: str):
        self.model_name = model_name
        self._model = None

    @property
    def model(self):
        if self._model is None:
            logger.info("Initializing local SentenceTransformer model: %s", self.model_name)
            try:
                from sentence_transformers import SentenceTransformer
                self._model = SentenceTransformer(self.model_name)
                logger.info("SentenceTransformer model loaded successfully.")
            except Exception as e:
                logger.exception("Failed to load local SentenceTransformer model.")
                raise RuntimeError(f"Failed to load embedding model: {str(e)}")
        return self._model

    def embed_query(self, text: str) -> List[float]:
        try:
            embeddings = self.model.encode([text], convert_to_numpy=True)
            return embeddings[0].tolist()
        except Exception as e:
            logger.error("Error generating local query embedding: %s", str(e))
            raise

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        try:
            embeddings = self.model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
            return embeddings.tolist()
        except Exception as e:
            logger.error("Error generating local batch document embeddings: %s", str(e))
            raise

    def get_dimensions(self) -> int:
        # all-MiniLM-L6-v2 outputs 384 dimensions
        if "mini" in self.model_name.lower():
            return 384
        return 768 # Default size for standard base models


class OpenAIEmbeddingService(BaseEmbeddingService):
    """
    Cloud-based embedding generation using OpenAI's API (or Groq fallback).
    """
    def __init__(self, api_key: str, model_name: str):
        self.api_key = api_key
        self.model_name = model_name
        self._client = None
        self.is_groq = api_key.startswith("gsk_") if api_key else False

    @property
    def client(self):
        if self._client is None:
            if not self.api_key:
                raise ValueError("OpenAI/Groq API key is required but missing from environment configurations.")
            try:
                from openai import OpenAI
                if self.is_groq:
                    logger.info("Initializing OpenAI Client configured for Groq embeddings...")
                    self._client = OpenAI(
                        api_key=self.api_key,
                        base_url="https://api.groq.com/openai/v1"
                    )
                else:
                    self._client = OpenAI(api_key=self.api_key)
            except Exception as e:
                logger.exception("Failed to initialize OpenAI/Groq client.")
                raise RuntimeError(f"OpenAI/Groq init failed: {str(e)}")
        return self._client

    def embed_query(self, text: str) -> List[float]:
        # Replace newlines as recommended by OpenAI documentation
        clean_text = text.replace("\n", " ")
        model = "mixbread-ai/mxbai-embed-large" if self.is_groq else self.model_name
        try:
            response = self.client.embeddings.create(
                input=[clean_text],
                model=model
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error("Error calling embedding API: %s", str(e))
            raise

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        clean_texts = [t.replace("\n", " ") for t in texts]
        model = "mixbread-ai/mxbai-embed-large" if self.is_groq else self.model_name
        try:
            response = self.client.embeddings.create(
                input=clean_texts,
                model=model
            )
            return [data.embedding for data in response.data]
        except Exception as e:
            logger.error("Error calling batch embedding API: %s", str(e))
            raise

    def get_dimensions(self) -> int:
        if self.is_groq:
            return 1024 # mxbai-embed-large outputs 1024 dimensions
        # text-embedding-3-small defaults to 1536
        if "text-embedding-3-small" in self.model_name:
            return 1536
        elif "text-embedding-3-large" in self.model_name:
            return 3072
        return 1536 # Fallback standard size


class HuggingFaceEmbeddingService(BaseEmbeddingService):
    """
    Cloud-based embedding generation using Hugging Face's free Inference API.
    Runs entirely in the cloud, completely free, with no API key required for low-volume.
    """
    def __init__(self, api_key: str, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        self.api_key = api_key
        self.model_name = model_name

    def _call_hf(self, texts: List[str]) -> List[List[float]]:
        import requests
        import time
        api_url = f"https://api-inference.huggingface.co/models/{self.model_name}"
        headers = {}
        # Only use the key if it is a Hugging Face token (starts with hf_)
        if self.api_key and self.api_key.startswith("hf_"):
            headers["Authorization"] = f"Bearer {self.api_key}"

        for attempt in range(3):
            try:
                response = requests.post(api_url, headers=headers, json={"inputs": texts}, timeout=15)
                if response.status_code == 200:
                    res = response.json()
                    if isinstance(res, list):
                        return res
                    raise RuntimeError(f"Unexpected HF response format: {res}")
                elif response.status_code == 503:
                    logger.info("Hugging Face model is loading, waiting 5s (attempt %d/3)...", attempt + 1)
                    time.sleep(5)
                    continue
                else:
                    raise RuntimeError(f"HF Inference API returned code {response.status_code}: {response.text}")
            except Exception as e:
                if attempt == 2:
                    logger.error("Failed to query Hugging Face embedding API: %s", str(e))
                    raise
                time.sleep(2)
        raise RuntimeError("Hugging Face Inference API timed out or failed after retries.")

    def embed_query(self, text: str) -> List[float]:
        res = self._call_hf([text])
        return res[0]

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        return self._call_hf(texts)

    def get_dimensions(self) -> int:
        return 384


# Factory Function
def get_embedding_service() -> BaseEmbeddingService:
    """
    Constructs and returns the concrete embedding service implementation 
    specified in environmental configurations.
    """
    engine_choice = settings.EMBEDDING_ENGINE.lower().strip()
    if engine_choice == "openai":
        # Check if they are using a Groq key (which has no embedding support)
        if settings.OPENAI_API_KEY.startswith("gsk_"):
            logger.info("Groq API key detected for OpenAI embedding engine. Auto-routing to Hugging Face Cloud embeddings for compatibility.")
            return HuggingFaceEmbeddingService(api_key="")
        # Check if they are using a Hugging Face key
        if settings.OPENAI_API_KEY.startswith("hf_"):
            logger.info("Hugging Face API key detected. Using Hugging Face Cloud embeddings.")
            return HuggingFaceEmbeddingService(api_key=settings.OPENAI_API_KEY)
            
        logger.debug("Factory selected OpenAI embedding service.")
        return OpenAIEmbeddingService(
            api_key=settings.OPENAI_API_KEY,
            model_name=settings.OPENAI_EMBEDDING_MODEL
        )
    elif engine_choice == "huggingface":
        logger.debug("Factory selected Hugging Face embedding service.")
        return HuggingFaceEmbeddingService(api_key=settings.OPENAI_API_KEY)
    else:
        logger.debug("Factory selected local SentenceTransformer embedding service.")
        return LocalEmbeddingService(
            model_name=settings.LOCAL_EMBEDDING_MODEL
        )
