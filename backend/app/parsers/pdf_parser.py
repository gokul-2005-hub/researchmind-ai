import fitz  # PyMuPDF
import re
import logging
from typing import Dict, List, Any, Tuple, Optional

logger = logging.getLogger("app.parsers.pdf")

class PDFParser:
    """
    Handles PDF parsing, text extraction, structural metadata parsing, and section header detection.
    """
    
    # Common regex patterns to detect section headers in academic papers
    SECTION_PATTERNS = [
        re.compile(r'^(ABSTRACT|INTRODUCTION|BACKGROUND|RELATED\s+WORK|METHODOLOGY|METHODS|PROPOSED\s+METHOD|EXPERIMENTS|RESULTS|DISCUSSION|CONCLUSION|CONCLUSIONS|REFERENCES|BIBLIOGRAPHY)$', re.IGNORECASE),
        re.compile(r'^(I|II|III|IV|V|VI|VII|VIII|IX|X)\.\s+([A-Z][a-zA-Z\s]+)$'),  # Roman Numerals: I. Introduction
        re.compile(r'^([1-9]\d*)\.\s+([A-Z][a-zA-Z\s\-\,]+)$'),                     # Arabic Numerals: 1. Introduction
        re.compile(r'^([1-9]\d*)\.([1-9]\d*)\s+([A-Z][a-zA-Z\s]+)$')                 # Subsection: 1.1 Related Work
    ]

    def parse(self, file_path: str) -> Dict[str, Any]:
        """
        Parses a PDF file, extracting text page-by-page, identifying section headers, and resolving metadata.
        """
        logger.info("Parsing PDF file: %s", file_path)
        try:
            doc = fitz.open(file_path)
        except Exception as e:
            logger.exception("Failed to open PDF file %s", file_path)
            raise RuntimeError(f"Failed to open PDF file: {str(e)}")

        pages_text: List[Dict[str, Any]] = []
        raw_metadata = doc.metadata or {}
        detected_sections: List[Dict[str, Any]] = []
        
        current_section = "Title Page / Header"
        
        # We start with Title Page
        detected_sections.append({
            "title": current_section,
            "start_page": 1
        })

        for page_num in range(len(doc)):
            page = doc[page_num]
            blocks = page.get_text("blocks")
            
            # Sort blocks from top to bottom, left to right
            blocks.sort(key=lambda b: (round(b[1], 1), round(b[0], 1)))
            
            page_text_blocks = []
            
            for block in blocks:
                text = block[4].strip()
                if not text:
                    continue
                
                # Check lines inside block for potential section headers
                lines = [line.strip() for line in text.split("\n") if line.strip()]
                for line in lines:
                    is_header, clean_title = self._check_is_section_header(line)
                    if is_header:
                        # Avoid duplicate consecutive section headers
                        if not detected_sections or detected_sections[-1]["title"] != clean_title:
                            logger.debug("Detected section: %s on page %d", clean_title, page_num + 1)
                            detected_sections.append({
                                "title": clean_title,
                                "start_page": page_num + 1
                            })
                            current_section = clean_title
                
                page_text_blocks.append(text)
            
            page_raw_text = "\n\n".join(page_text_blocks)
            pages_text.append({
                "page_number": page_num + 1,
                "text": page_raw_text
            })

        # Try to resolve metadata
        resolved_metadata = self._extract_metadata(doc, pages_text)
        
        doc.close()
        
        return {
            "metadata": resolved_metadata,
            "pages": pages_text,
            "sections": detected_sections,
            "total_pages": len(pages_text)
        }

    def _check_is_section_header(self, text: str) -> Tuple[bool, str]:
        """
        Runs heuristics to identify if a text line represents a main section header.
        """
        candidate = text.strip()
        if not candidate or len(candidate) > 60:
            return False, ""
        
        for pattern in self.SECTION_PATTERNS:
            match = pattern.match(candidate)
            if match:
                # If there's a match, clean up the header text
                if len(match.groups()) == 1:
                    clean = match.group(1).title()
                elif len(match.groups()) == 2:
                    clean = f"{match.group(1)}. {match.group(2).strip().title()}"
                else:
                    clean = f"{match.group(1)}.{match.group(2)} {match.group(3).strip().title()}"
                return True, clean
                
        return False, ""

    def _extract_metadata(self, doc: fitz.Document, pages: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Extracts structural attributes like DOI, Title, and Authors, falling back to heuristics.
        """
        raw = doc.metadata or {}
        
        # Default fallback values
        title = raw.get("title", "").strip()
        authors_raw = raw.get("author", "").strip()
        
        # If title is missing or generic (e.g. filename), grab the first non-empty lines from page 1
        if not title or title.lower().endswith(".pdf") or len(title) < 4:
            if pages:
                first_page_text = pages[0]["text"]
                lines = [line.strip() for line in first_page_text.split("\n") if line.strip()]
                # Grab first line that seems like a title
                for line in lines[:4]:
                    if len(line) > 10 and not line.startswith("arXiv") and not line.startswith("http"):
                        title = line
                        break
        
        # If still empty, use a placeholder
        if not title:
            title = "Unknown Research Paper"

        # Parsing Authors
        authors = []
        if authors_raw:
            # Authors can be split by comma or semicolon
            split_char = ";" if ";" in authors_raw else ","
            authors = [a.strip() for a in authors_raw.split(split_char) if a.strip()]
        
        # Fallback author parsing from page 1 text if empty
        if not authors and pages:
            first_page_text = pages[0]["text"]
            # Look for author indicators or lines right under the title
            lines = [line.strip() for line in first_page_text.split("\n") if line.strip()]
            for line in lines[1:5]:
                if any(x in line.lower() for x in ["email", "university", "department", "abstract"]):
                    break
                # Filter out lines that are too long, too short, or look like titles
                if 5 < len(line) < 100 and not any(char.isdigit() for char in line):
                    authors = [a.strip() for a in line.split(",") if a.strip()]
                    break

        if not authors:
            authors = ["Unknown Authors"]

        # Parse publication year (e.g., from PDF metadata creation date like D:20170615143000)
        pub_year = None
        creation_date = raw.get("creationDate", "")
        if creation_date and len(creation_date) >= 6:
            # Extract 4-digit year following D:
            match = re.search(r'D:(\d{4})', creation_date)
            if match:
                pub_year = int(match.group(1))
        
        # Fallback year search in first page text
        if not pub_year and pages:
            text = pages[0]["text"]
            # Search for typical publication strings: "Published in 2018", "Proceedings of ... 2021", "(2019)"
            match = re.search(r'\b(19\d{2}|20\d{2})\b', text)
            if match:
                pub_year = int(match.group(1))

        # Check for DOI
        doi = None
        if pages:
            # Combine first 2 pages to look for DOI link/string
            full_text = "\n".join([p["text"] for p in pages[:2]])
            doi_match = re.search(r'\b10\.\d{4,9}/[-._;()/:A-Z0-9]+\b', full_text, re.IGNORECASE)
            if doi_match:
                doi = doi_match.group(0).rstrip(".")

        return {
            "title": title,
            "authors": authors,
            "publication_year": pub_year,
            "journal_venue": raw.get("subject", "").strip() or None,
            "doi": doi
        }
