import logging
from typing import List, Dict, Any, Optional
import chromadb
from app.core.config import settings
from app.services.embedding_service import BaseEmbeddingService

logger = logging.getLogger("app.vectorstore.chroma")

class ChromaRepository:
    """
    Handles ChromaDB vector operations, indexing semantic paper chunks 
    and performing metadata-filtered similarity queries.
    """
    def __init__(self, embedding_service: BaseEmbeddingService):
        self.embedding_service = embedding_service
        self.collection_name = "research_chunks"
        self._client = None
        self._collection = None

    @property
    def client(self) -> chromadb.PersistentClient:
        if self._client is None:
            persist_dir = str(settings.CHROMA_PATH.absolute())
            logger.info("Initializing persistent ChromaDB client at: %s", persist_dir)
            try:
                self._client = chromadb.PersistentClient(path=persist_dir)
            except Exception as e:
                logger.exception("Failed to connect to ChromaDB.")
                raise RuntimeError(f"ChromaDB initialization failed: {str(e)}")
        return self._client

    @property
    def collection(self):
        if self._collection is None:
            try:
                # We fetch or create collection. No embedding function is passed to Chroma
                # since we generate embeddings explicitly inside our service layer.
                self._collection = self.client.get_or_create_collection(
                    name=self.collection_name,
                    metadata={"hnsw:space": "cosine"} # Use cosine similarity
                )
                logger.info("ChromaDB collection '%s' is ready.", self.collection_name)
            except Exception as e:
                logger.exception("Failed to load collection '%s'", self.collection_name)
                raise RuntimeError(f"Failed to load vector collection: {str(e)}")
        return self._collection

    def upsert_chunks(self, paper_id: str, chunks: List[Dict[str, Any]]) -> None:
        """
        Embeds and upserts a list of semantic chunks for a given paper into ChromaDB.
        """
        if not chunks:
            return

        logger.info("Upserting %d chunks for paper %s into ChromaDB...", len(chunks), paper_id)
        
        # Prepare content arrays
        ids: List[str] = []
        documents: List[str] = []
        metadatas: List[Dict[str, Any]] = []
        
        for chunk in chunks:
            chunk_idx = chunk["chunk_index"]
            text = chunk["text_content"]
            
            ids.append(f"{paper_id}_{chunk_idx}")
            documents.append(text)
            metadatas.append({
                "paper_id": str(paper_id),
                "chunk_index": int(chunk_idx),
                "section_title": str(chunk["section_title"]),
                "start_page": int(chunk["start_page"]),
                "end_page": int(chunk["end_page"])
            })

        try:
            # Generate embeddings batch-wise using the injected service
            embeddings = self.embedding_service.embed_documents(documents)
            
            # Upsert into Chroma
            self.collection.upsert(
                ids=ids,
                embeddings=embeddings,
                metadatas=metadatas,
                documents=documents
            )
            logger.info("Successfully indexed %d vectors for paper %s in vector database.", len(chunks), paper_id)
        except Exception as e:
            logger.exception("Failed to index chunks in ChromaDB.")
            raise RuntimeError(f"ChromaDB indexing error: {str(e)}")

    def similarity_search(
        self, 
        query: str, 
        paper_id: str, 
        k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Executes a vector search query restricted to chunks matching a specific paper ID.
        """
        logger.debug("Running similarity search for paper %s (k=%d): '%s'", paper_id, k, query)
        try:
            # Vectorize query
            query_vector = self.embedding_service.embed_query(query)
            
            # Execute query with metadata filter constraint
            results = self.collection.query(
                query_embeddings=[query_vector],
                n_results=k,
                where={"paper_id": str(paper_id)}
            )
            
            # Formulate structured output
            output: List[Dict[str, Any]] = []
            
            if not results or not results["ids"] or len(results["ids"][0]) == 0:
                return []
                
            ids = results["ids"][0]
            documents = results["documents"][0]
            metadatas = results["metadatas"][0]
            distances = results["distances"][0] if "distances" in results and results["distances"] else [0.0] * len(ids)

            for i in range(len(ids)):
                output.append({
                    "id": ids[i],
                    "text_content": documents[i],
                    "metadata": metadatas[i],
                    "distance": distances[i]
                })
                
            return output
            
        except Exception as e:
            logger.exception("Failed to execute ChromaDB query.")
            raise RuntimeError(f"ChromaDB search failed: {str(e)}")

    def get_chunks_count(self, paper_id: str) -> int:
        """
        Returns the number of vector documents indexed for a specific paper.
        """
        try:
            results = self.collection.get(
                where={"paper_id": str(paper_id)},
                include=[] # Empty array means retrieve count/IDs only without documents/embeddings
            )
            if results and "ids" in results:
                return len(results["ids"])
            return 0
        except Exception as e:
            logger.error("Failed to check ChromaDB chunk count for paper %s: %s", paper_id, str(e))
            return 0

    def delete_paper_chunks(self, paper_id: str) -> None:
        """
        Deletes all vector indexes associated with a specific paper ID.
        """
        logger.info("Deleting ChromaDB chunks for paper: %s", paper_id)
        try:
            self.collection.delete(
                where={"paper_id": str(paper_id)}
            )
            logger.info("ChromaDB chunks deleted successfully for paper %s.", paper_id)
        except Exception as e:
            logger.exception("Failed to delete vector indexes for paper %s", paper_id)
            raise RuntimeError(f"ChromaDB deletion error: {str(e)}")
