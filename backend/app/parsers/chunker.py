import re
import logging
from typing import List, Dict, Any

logger = logging.getLogger("app.parsers.chunker")

class SemanticChunker:
    """
    Groups extracted PDF text into semantically cohesive, section-aware chunks.
    Ensures sentence boundaries are preserved and appends document coordinate metadata.
    """
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 150):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def chunk_document(self, parsed_pdf: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Chunks pages by mapping their text blocks to their active structural sections.
        Flushes buffers immediately on section transitions.
        """
        pages = parsed_pdf["pages"]
        sections = parsed_pdf["sections"]
        
        chunks: List[Dict[str, Any]] = []
        chunk_index = 0

        for i, page in enumerate(pages):
            page_num = page["page_number"]
            page_text = page["text"]
            
            # Determine initial section for this page based on page number
            active_section = "Unknown Section"
            for sec in sections:
                if sec["start_page"] <= page_num:
                    active_section = sec["title"]

            # Split page text into original blocks (separated by double newlines)
            blocks = [b.strip() for b in page_text.split("\n\n") if b.strip()]
            
            current_chunk_sentences: List[str] = []
            current_length = 0
            
            for block in blocks:
                lines = [line.strip() for line in block.split("\n") if line.strip()]
                if not lines:
                    continue
                
                # Check if the first line of the block represents a section header
                first_line = lines[0]
                is_header = False
                matched_section_title = None
                
                for sec in sections:
                    if first_line.lower() == sec["title"].lower() or first_line.lower() == sec["title"].lower().rstrip("."):
                        is_header = True
                        matched_section_title = sec["title"]
                        break
                
                if is_header and matched_section_title:
                    # If this is a new section, flush the previous buffer first
                    if matched_section_title != active_section:
                        if current_chunk_sentences:
                            chunks.append(self._build_chunk(
                                chunk_index,
                                current_chunk_sentences,
                                active_section,
                                page_num,
                                page_num
                            ))
                            chunk_index += 1
                            current_chunk_sentences = []
                            current_length = 0
                        active_section = matched_section_title
                    
                    # If it's a single line header, add it and proceed
                    if len(lines) == 1:
                        current_chunk_sentences.append(first_line)
                        current_length += len(first_line)
                        continue
                    else:
                        current_chunk_sentences.append(first_line)
                        current_length += len(first_line)
                        # Extract the remaining paragraph lines
                        paragraph_text = " ".join(lines[1:])
                else:
                    paragraph_text = " ".join(lines)
                
                # Split paragraph text into sentences
                sentences = re.split(r'(?<=[.!?])\s+', paragraph_text)
                
                for sentence in sentences:
                    sentence = sentence.strip()
                    if not sentence:
                        continue
                    
                    # Fallback check for inline section headers (e.g. double newlines omitted)
                    for sec in sections:
                        if sentence.lower() == sec["title"].lower() and sec["title"] != active_section:
                            if current_chunk_sentences:
                                chunks.append(self._build_chunk(
                                    chunk_index,
                                    current_chunk_sentences,
                                    active_section,
                                    page_num,
                                    page_num
                                ))
                                chunk_index += 1
                                current_chunk_sentences = []
                                current_length = 0
                            active_section = sec["title"]
                            break

                    # If sentence is extremely long, treat it as its own chunk
                    if len(sentence) >= self.chunk_size:
                        if current_chunk_sentences:
                            chunks.append(self._build_chunk(
                                chunk_index,
                                current_chunk_sentences,
                                active_section,
                                page_num,
                                page_num
                            ))
                            chunk_index += 1
                            current_chunk_sentences = []
                            current_length = 0
                        
                        chunks.append(self._build_chunk(
                            chunk_index,
                            [sentence],
                            active_section,
                            page_num,
                            page_num
                        ))
                        chunk_index += 1
                        continue

                    # Buffer boundary check
                    if current_length + len(sentence) > self.chunk_size:
                        chunks.append(self._build_chunk(
                            chunk_index,
                            current_chunk_sentences,
                            active_section,
                            page_num,
                            page_num
                        ))
                        chunk_index += 1
                        
                        # Apply sliding window overlap at the sentence level
                        overlap_sentences = []
                        overlap_len = 0
                        for s in reversed(current_chunk_sentences):
                            if overlap_len + len(s) > self.chunk_overlap:
                                break
                            overlap_sentences.insert(0, s)
                            overlap_len += len(s)
                        
                        current_chunk_sentences = overlap_sentences + [sentence]
                        current_length = overlap_len + len(sentence)
                    else:
                        current_chunk_sentences.append(sentence)
                        current_length += len(sentence)

            # Flush remaining sentences at end of page
            if current_chunk_sentences:
                chunks.append(self._build_chunk(
                    chunk_index,
                    current_chunk_sentences,
                    active_section,
                    page_num,
                    page_num
                ))
                chunk_index += 1

        logger.info("Successfully split PDF into %d semantic chunks.", len(chunks))
        return chunks

    def _build_chunk(
        self, 
        index: int, 
        sentences: List[str], 
        section_title: str, 
        start_page: int, 
        end_page: int
    ) -> Dict[str, Any]:
        """
        Helper to construct a chunk object dictionary.
        """
        text_content = " ".join(sentences)
        return {
            "chunk_index": index,
            "text_content": text_content,
            "section_title": section_title,
            "start_page": start_page,
            "end_page": end_page
        }
