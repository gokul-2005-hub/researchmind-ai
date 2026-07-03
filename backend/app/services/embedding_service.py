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
    Cloud-based embedding generation using OpenAI's API.
    """
    def __init__(self, api_key: str, model_name: str):
        self.api_key = api_key
        self.model_name = model_name
        self._client = None

    @property
    def client(self):
        if self._client is None:
            if not self.api_key:
                raise ValueError("OpenAI API key is required but missing from environment configurations.")
            try:
                from openai import OpenAI
                self._client = OpenAI(api_key=self.api_key)
            except Exception as e:
                logger.exception("Failed to initialize OpenAI client.")
                raise RuntimeError(f"OpenAI init failed: {str(e)}")
        return self._client

    def embed_query(self, text: str) -> List[float]:
        # Replace newlines as recommended by OpenAI documentation
        clean_text = text.replace("\n", " ")
        try:
            response = self.client.embeddings.create(
                input=[clean_text],
                model=self.model_name
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error("Error calling OpenAI embedding API: %s", str(e))
            raise

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        clean_texts = [t.replace("\n", " ") for t in texts]
        try:
            response = self.client.embeddings.create(
                input=clean_texts,
                model=self.model_name
            )
            return [data.embedding for data in response.data]
        except Exception as e:
            logger.error("Error calling OpenAI batch embedding API: %s", str(e))
            raise

    def get_dimensions(self) -> int:
        # text-embedding-3-small defaults to 1536
        if "text-embedding-3-small" in self.model_name:
            return 1536
        elif "text-embedding-3-large" in self.model_name:
            return 3072
        return 1536 # Fallback standard size


# Factory Function
def get_embedding_service() -> BaseEmbeddingService:
    """
    Constructs and returns the concrete embedding service implementation 
    specified in environmental configurations.
    """
    engine_choice = settings.EMBEDDING_ENGINE.lower().strip()
    if engine_choice == "openai":
        logger.debug("Factory selected OpenAI embedding service.")
        return OpenAIEmbeddingService(
            api_key=settings.OPENAI_API_KEY,
            model_name=settings.OPENAI_EMBEDDING_MODEL
        )
    else:
        logger.debug("Factory selected local SentenceTransformer embedding service.")
        return LocalEmbeddingService(
            model_name=settings.LOCAL_EMBEDDING_MODEL
        )
