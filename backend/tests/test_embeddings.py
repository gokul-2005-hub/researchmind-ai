import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from app.services.embedding_service import get_embedding_service, LocalEmbeddingService

def test_local_embeddings():
    print("Initializing embedding service factory...")
    service = get_embedding_service()
    
    # We force check that it is indeed LocalEmbeddingService if configured so
    assert isinstance(service, LocalEmbeddingService), "Factory should default to LocalEmbeddingService"
    print(f"Embedding Engine selected: {service.model_name}")
    
    print("\nTesting single query embedding...")
    query = "What is semantic chunking?"
    vector = service.embed_query(query)
    
    print(f"Generated Vector length: {len(vector)}")
    print(f"Vector preview (first 5 elements): {vector[:5]}")
    
    assert len(vector) == service.get_dimensions(), f"Vector dimension mismatch! Expected {service.get_dimensions()}"
    assert isinstance(vector[0], float), "Vector elements should be floats"
    print("Single query embedding verification passed!")

    print("\nTesting batch document embedding...")
    docs = [
        "Language models benefit from modular design.",
        "LangGraph enables multi-agent state coordination.",
        "ChromaDB stores high dimensional vectors."
    ]
    vectors = service.embed_documents(docs)
    
    print(f"Batch Count: {len(vectors)}")
    assert len(vectors) == len(docs), "Batch output count mismatch"
    for idx, vec in enumerate(vectors):
        print(f"Doc #{idx} vector dimension size: {len(vec)}")
        assert len(vec) == service.get_dimensions(), f"Batch element dimension mismatch at index {idx}"
        
    print("Batch document embedding verification passed!")

if __name__ == "__main__":
    test_local_embeddings()
