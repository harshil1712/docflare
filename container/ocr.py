"""
RapidOCR CLI script for the Sandbox container.

Usage:
    python ocr.py /path/to/input.pdf

Converts PDF pages to images via poppler, runs RapidOCR (ONNX Runtime) on
each page, and prints JSON result to stdout.

Output format:
    { "pages": [ { "page": 1, "text": "..." }, ... ] }

RapidOCR uses the same PaddleOCR models (PP-OCRv3 det, PP-OCRv4 rec) converted
to ONNX format, running on ONNXRuntime instead of PaddlePaddle. This cuts
framework memory from ~500 MiB to ~80 MiB.
"""

import json
import sys
import numpy as np
from pathlib import Path
from pdf2image import convert_from_path, pdfinfo_from_path
from rapidocr import RapidOCR

# Initialize RapidOCR once. Uses bundled ONNX models (same PP-OCR architecture).
engine = RapidOCR()


def ocr_image(img) -> str:
    """Run OCR on a PIL Image, return extracted text."""
    img_array = np.array(img)
    result = engine(img_array)

    if result is None or result.txts is None:
        return ""

    return "\n".join(result.txts)


def process_pdf(pdf_path: str) -> dict:
    """Convert PDF to images one page at a time, OCR each page, return structured result."""
    path = Path(pdf_path)
    if not path.exists():
        return {"error": f"File not found: {pdf_path}", "pages": []}

    # Get page count first, then convert one page at a time to keep peak
    # memory low (~25 MiB per page instead of all pages in memory at once).
    info = pdfinfo_from_path(str(path))
    num_pages = info["Pages"]

    pages = []
    for i in range(1, num_pages + 1):
        images = convert_from_path(str(path), dpi=300, first_page=i, last_page=i)
        text = ocr_image(images[0])
        pages.append({"page": i, "text": text})

    return {"pages": pages}


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python ocr.py <pdf_path>"}))
        sys.exit(1)

    pdf_path = sys.argv[1]
    result = process_pdf(pdf_path)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
