"""
CognifyAI Machine Learning Engine - Preprocessing Module
Provides robust PDF text extraction using PyMuPDF, text cleaning,
and section completeness detection.
"""

import re
import fitz  # PyMuPDF
from typing import Dict, Any, Union


class DocumentProcessingError(Exception):
    """Base exception for document processing errors."""
    pass


class EmptyDocumentError(DocumentProcessingError):
    """Raised when extracted document text is empty."""
    pass


class CorruptedPDFError(DocumentProcessingError):
    """Raised when a PDF file cannot be opened or parsed."""
    pass


def clean_text(text: str) -> str:
    """
    Cleans and normalizes extracted resume and job description text.
    Preserves programming language symbols like C++, C#, .NET, Node.js.
    """
    if not text or not isinstance(text, str):
        return ""

    # Replace newlines and tabs with spaces
    text = re.sub(r'[\r\n\t]+', ' ', text)

    # Remove URLs
    text = re.sub(r'https?://\S+|www\.\S+', ' ', text)

    # Remove email addresses
    text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', ' ', text)

    # Remove phone numbers
    text = re.sub(r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', ' ', text)

    # Replace multiple spaces with a single space
    text = re.sub(r'\s+', ' ', text)

    return text.strip()


def extract_text_from_pdf(pdf_source: Union[str, bytes]) -> str:
    """
    Extracts text from a PDF document using PyMuPDF (fitz).
    Accepts a filepath string or raw byte buffer.
    """
    try:
        if isinstance(pdf_source, bytes):
            doc = fitz.open(stream=pdf_source, filetype="pdf")
        elif isinstance(pdf_source, str):
            doc = fitz.open(pdf_source)
        else:
            raise DocumentProcessingError(f"Unsupported PDF input type: {type(pdf_source)}")
    except Exception as e:
        raise CorruptedPDFError(f"Unable to parse PDF document: {str(e)}") from e

    extracted_pages = []
    try:
        for page_num in range(len(doc)):
            page = doc[page_num]
            page_text = page.get_text("text")
            if page_text:
                extracted_pages.append(page_text)
    finally:
        doc.close()

    raw_text = "\n".join(extracted_pages).strip()
    cleaned = clean_text(raw_text)

    if not cleaned:
        raise EmptyDocumentError("PDF document contains no readable text (scanned image or empty).")

    return cleaned


def detect_sections(text: str) -> Dict[str, Any]:
    """
    Analyzes resume text for standard functional sections and computes
    an explainable section completeness score (0-100).
    """
    text_lower = text.lower()

    sections = {
        "summary": bool(re.search(r'\b(summary|objective|profile|about me|professional summary)\b', text_lower)),
        "experience": bool(re.search(r'\b(experience|work history|employment|career history|work experience)\b', text_lower)),
        "education": bool(re.search(r'\b(education|academic|degree|university|college|bachelor|master|b\.tech|m\.tech|phd)\b', text_lower)),
        "skills": bool(re.search(r'\b(skills|technical skills|competencies|technologies|proficiencies|expertise)\b', text_lower)),
        "projects_or_certifications": bool(re.search(r'\b(projects|certifications|certificate|publications|portfolio)\b', text_lower)),
    }

    found_count = sum(1 for v in sections.values() if v)
    completeness_score = int((found_count / len(sections)) * 100)

    recommendations = []
    if not sections["summary"]:
        recommendations.append("Include a concise Professional Summary at the top of your resume.")
    if not sections["experience"]:
        recommendations.append("Detail your professional Work Experience or internships.")
    if not sections["skills"]:
        recommendations.append("Add a dedicated Skills section to optimize automated parsing.")
    if not sections["projects_or_certifications"]:
        recommendations.append("Add technical Projects or Certifications to validate hands-on expertise.")

    return {
        "sections_detected": sections,
        "completeness_score": completeness_score,
        "found_sections_count": found_count,
        "total_sections_count": len(sections),
        "recommendations": recommendations,
    }

