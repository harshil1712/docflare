# Single-stage build: Sandbox image with RapidOCR (ONNX Runtime).
#
# RapidOCR uses the same PaddleOCR models (PP-OCRv3/v4) converted to ONNX,
# running on ONNXRuntime instead of PaddlePaddle. This eliminates the
# ~500 MiB PaddlePaddle framework overhead and the numpy ABI hack.
# ONNX models are bundled inside the rapidocr pip package — no pre-downloaded
# models directory needed.
FROM docker.io/cloudflare/sandbox:0.7.18-python

# System dependencies:
#   poppler-utils — PDF -> image conversion (pdf2image)
#   libgomp1     — OpenMP runtime for ONNXRuntime
#   libgl1       — OpenGL runtime required by OpenCV (pulled in by RapidOCR)
#   libglib2.0-0 — GLib runtime required by OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    libgomp1 \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install RapidOCR + dependencies in separate layers to reduce individual layer sizes
# and avoid registry upload timeouts. Strip debug symbols to further reduce size.

# Layer 1: Heavy dependency (~60 MB)
RUN pip3 install --no-cache-dir onnxruntime

# Layer 2: Lighter dependencies (~25 MB)
RUN pip3 install --no-cache-dir rapidocr pdf2image Pillow

# Layer 3: Strip debug symbols and clean caches to reduce layer size
RUN find /usr/local/lib/python* -name '*.so' -exec strip --strip-debug {} + 2>/dev/null || true && \
    find /usr/local/lib/python* -type d -name '__pycache__' -exec rm -rf {} + 2>/dev/null || true

# Copy OCR script
COPY container/ocr.py /app/ocr.py
