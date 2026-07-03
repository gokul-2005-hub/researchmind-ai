import sys
import os
import asyncio
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from app.main import app, lifespan
from app.database.connection import get_db, SessionLocal
from app.repositories.sqlalchemy_repo import SQLAlchemyPaperRepository

async def test_db():
    print("Executing app lifespan startup...")
    async with lifespan(app):
        print("Lifespan executed successfully. Verification checking...")
        
        # Test session connection
        db = SessionLocal()
        try:
            repo = SQLAlchemyPaperRepository(db)
            papers = repo.list_all()
            print(f"Successfully connected to the database! Number of papers in DB: {len(papers)}")
            
            # Create a mock paper and roll it back
            paper = repo.create(
                title="Lifespan test paper",
                authors=["Tester AI"],
                file_path="./test.pdf",
                publication_year=2026
            )
            print(f"Successfully created mock paper with ID: {paper.id}")
            
            # Query back
            fetched = repo.get_by_id(paper.id)
            print(f"Queried paper back successfully: {fetched.title} by {fetched.authors}")
            
            # Clean up
            repo.delete(paper.id)
            print("Successfully deleted mock paper and cleaned up database!")
            
        finally:
            db.close()

if __name__ == "__main__":
    asyncio.run(test_db())
