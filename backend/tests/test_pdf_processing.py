import sys
import os
import asyncio
from pathlib import Path
import fitz

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from app.main import app, lifespan
from app.database.connection import SessionLocal
from app.services.pdf_service import PDFService

def generate_test_pdf(filename: str):
    """
    Programmatically creates a structured test PDF using PyMuPDF.
    """
    doc = fitz.open()
    
    # Page 1: Abstract & Introduction
    page1 = doc.new_page()
    
    # Title
    page1.insert_textbox(
        fitz.Rect(50, 50, 500, 160),
        "Deep Neural Networks for Semantic Chunks Extraction\nBy John Doe and Jane Smith",
        fontsize=16,
        fontname="helv",
        align=1 # Center
    )
    
    # Abstract Section
    page1.insert_textbox(
        fitz.Rect(50, 180, 500, 280),
        "ABSTRACT\nThis paper proposes a layout-aware multi-agent architecture for research paper navigation. We demonstrate how parsing sections dynamically improves RAG retrieval context. Our experiments achieve state of the art results.",
        fontsize=11,
        fontname="helv"
    )
    
    # Introduction Section
    page1.insert_textbox(
        fitz.Rect(50, 300, 500, 550),
        "1. INTRODUCTION\nDeep learning models require structured contexts to generate precise responses. In normal environments, RAG splitters cut sentences in half. This leads to a severe loss of mathematical notation. To solve this, we parse headers first. Then we index semantic blocks. This is a very clean approach. We proceed to section two.",
        fontsize=11,
        fontname="helv"
    )

    # Page 2: Methodology & References
    page2 = doc.new_page()
    
    # Methodology
    page2.insert_textbox(
        fitz.Rect(50, 50, 500, 300),
        "2. METHODOLOGY\nOur core system consists of a Supervisor Agent and multiple specialized agents. First, the PDF Processing Agent extracts raw bytes. Second, the Retrieval Agent queries ChromaDB. Equation (1) defines our similarity score. We weight dense semantic scores and sparse keyword matches. This ensures maximum recall.",
        fontsize=11,
        fontname="helv"
    )
    
    # References
    page2.insert_textbox(
        fitz.Rect(50, 320, 500, 500),
        "REFERENCES\n[1] Vaswani, et al. Attention Is All You Need. NeurIPS 2017.\n[2] Park, et al. Generative Agents. CHI 2023.",
        fontsize=10,
        fontname="helv"
    )
    
    doc.save(filename)
    doc.close()
    print(f"Generated test PDF: {filename}")

async def run_pdf_tests():
    test_pdf_file = "sample_test_paper.pdf"
    generate_test_pdf(test_pdf_file)
    
    async with lifespan(app):
        db = SessionLocal()
        try:
            service = PDFService(db)
            
            # Read file bytes
            with open(test_pdf_file, "rb") as f:
                file_content = f.read()
            
            print("Invoking PDFService ingestion pipeline...")
            paper, chunks = service.process_pdf_upload(
                file_content=file_content,
                original_filename="sample_test_paper.pdf"
            )
            
            print("---- INGESTION PIPELINE SUCCESS ----")
            print(f"Paper Title: {paper.title}")
            print(f"Paper Authors: {paper.authors}")
            print(f"Paper Year: {paper.publication_year}")
            print(f"Paper DOI: {paper.doi}")
            print(f"Saved DB Chunks Count: {len(chunks)}")
            
            print("\nPrinting chunk breakdown:")
            for c in chunks:
                print(f"Chunk #{c.chunk_index} | Section: {c.section_title} | Pages: {c.start_page}-{c.end_page}")
                print(f"Text Content snippet: {c.text_content[:90]}...")
                print("-" * 40)
            
            # Basic validation assertions
            assert len(chunks) > 0, "No chunks generated!"
            assert "1. Introduction" in [c.section_title for c in chunks], "Introduction header not detected!"
            assert "2. Methodology" in [c.section_title for c in chunks], "Methodology header not detected!"
            
            # Clean up records
            db.delete(paper)
            db.commit()
            print("Successfully verified and cleaned up database records.")
            
        finally:
            db.close()
            # Clean up generated PDF file
            if os.path.exists(test_pdf_file):
                os.remove(test_pdf_file)

if __name__ == "__main__":
    asyncio.run(run_pdf_tests())
