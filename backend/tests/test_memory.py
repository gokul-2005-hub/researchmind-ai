import sys
import os
import asyncio
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from app.main import app, lifespan
from app.database.connection import SessionLocal
from app.services.memory_service import MemoryService
from app.repositories.sqlalchemy_repo import SQLAlchemyPaperRepository

async def test_memory_service():
    print("Beginning memory service database integration test...")
    async with lifespan(app):
        db = SessionLocal()
        try:
            # 1. Create a dummy paper record for reference
            paper_repo = SQLAlchemyPaperRepository(db)
            paper = paper_repo.create(
                title="Memory Testing Guide",
                authors=["Memory Specialist"],
                file_path="./memory_guide.pdf"
            )
            print(f"Created reference paper: {paper.id}")

            # 2. Initialize MemoryService and create a chat session
            memory_service = MemoryService(db)
            session = memory_service.create_session(
                paper_id=paper.id,
                title="Testing Memory Session"
            )
            print(f"Created chat session: {session.id} | Title: {session.title}")

            # 3. Add sequence of messages
            print("\nInserting sequence of messages...")
            # Turn 1
            msg1 = memory_service.add_user_message(session.id, "Hello, can you help me summarize this paper?")
            print(f"User Msg 1 saved: ID={msg1.id}")
            msg2 = memory_service.add_agent_response(
                session_id=session.id,
                agent_name="supervisor",
                content="Sure! I can help you summarize the document.",
                agent_thoughts="Decided to route to summary agent."
            )
            print(f"Agent Msg 1 saved: ID={msg2.id} | Thoughts={msg2.agent_thoughts}")

            # Turn 2
            msg3 = memory_service.add_user_message(session.id, "Who are the authors?")
            msg4 = memory_service.add_agent_response(
                session_id=session.id,
                agent_name="qa_agent",
                content="The author listed is Memory Specialist.",
                agent_thoughts="Retrieved metadata and responded."
            )

            # 4. Fetch complete messages list
            history = memory_service.get_messages(session.id)
            print(f"\nTotal messages retrieved from DB: {len(history)}")
            assert len(history) == 4, "Should have retrieved exactly 4 messages!"

            # Verify thoughts were preserved
            agent_msgs = [m for m in history if m.sender != "user"]
            assert agent_msgs[0].agent_thoughts == "Decided to route to summary agent."
            print("Agent thoughts logs successfully verified in database!")

            # 5. Verify LLM role formatting and limit constraint
            llm_format = memory_service.get_messages_for_llm(session.id, limit=2)
            print(f"\nLLM messages (limit=2): {llm_format}")
            assert len(llm_format) == 2, "Should have retrieved only the last 2 messages!"
            assert llm_format[0]["role"] == "user"
            assert llm_format[1]["role"] == "assistant"
            print("LLM formatting and window truncation verification passed!")

            # 6. Clean up
            print("\nCleaning up database records...")
            memory_service.delete_session(session.id)
            paper_repo.delete(paper.id)
            db.commit()
            print("Cleanup successful.")

        finally:
            db.close()

if __name__ == "__main__":
    asyncio.run(test_memory_service())
