import sys
import uuid
import os
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from app.services.embedding_service import get_embedding_service
from app.vectorstore.chroma_store import ChromaRepository

def test_chroma_vectorstore():
    print("Initializing embedding service for vector store...")
    embedding_service = get_embedding_service()
    
    print("Initializing ChromaRepository...")
    vector_repo = ChromaRepository(embedding_service)
    
    paper_id = str(uuid.uuid4())
    print(f"Using mock paper ID: {paper_id}")
    
    mock_chunks = [
        {
            "chunk_index": 0,
            "text_content": "Deep learning models require multi-agent structures to orchestrate prompt routing dynamically.",
            "section_title": "1. Introduction",
            "start_page": 1,
            "end_page": 1
        },
        {
            "chunk_index": 1,
            "text_content": "Our experimental results show a 25% increase in query recall when using hybrid BM25 and vector search.",
            "section_title": "3. Results",
            "start_page": 3,
            "end_page": 4
        },
        {
            "chunk_index": 2,
            "text_content": "We use a ChromaDB vector store running local Sentence Transformers representations to store chunks persistently.",
            "section_title": "2. Implementation Details",
            "start_page": 2,
            "end_page": 2
        }
    ]
    
    print("\nUpserting mock chunks into ChromaDB...")
    vector_repo.upsert_chunks(paper_id, mock_chunks)
    
    print("\nRunning similarity query for 'experimental recall results'...")
    query = "experimental recall results"
    results = vector_repo.similarity_search(query, paper_id, k=2)
    
    print(f"Results Count: {len(results)}")
    assert len(results) > 0, "No search results returned!"
    
    print("\nSearch results breakdown:")
    for idx, r in enumerate(results):
        print(f"Match #{idx} | Score/Distance: {r['distance']:.4f} | Section: {r['metadata']['section_title']}")
        print(f"Text Content: {r['text_content']}")
        print("-" * 50)
        
    # Check constraints
    first_match = results[0]
    assert first_match["metadata"]["paper_id"] == paper_id, "Metadata paper_id mismatch"
    assert "experimental results" in first_match["text_content"].lower(), "Top match should be semantically similar to results"
    
    print("\nTesting metadata filters with another paper ID...")
    other_paper_id = str(uuid.uuid4())
    other_results = vector_repo.similarity_search(query, other_paper_id, k=2)
    print(f"Results count for other paper ID: {len(other_results)}")
    assert len(other_results) == 0, "Search results should be empty for a different paper ID!"
    print("Metadata filter isolation check passed!")
    
    print("\nCleaning up index chunks for mock paper...")
    vector_repo.delete_paper_chunks(paper_id)
    
    print("Re-running search to verify deletion...")
    deleted_results = vector_repo.similarity_search(query, paper_id, k=2)
    print(f"Results count after deletion: {len(deleted_results)}")
    assert len(deleted_results) == 0, "Chunks were not deleted successfully from vector database!"
    
    print("\nChromaRepository CRUD and query verification passed completely!")

if __name__ == "__main__":
    test_chroma_vectorstore()
