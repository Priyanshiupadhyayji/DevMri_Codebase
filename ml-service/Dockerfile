# ══════════════════════════════════════
# DevMRI — ML Microservice Dockerfile
# ══════════════════════════════════════
# FastAPI + scikit-learn + Prophet

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for Prophet / numpy
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (cache layer)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create model directory for trained models
RUN mkdir -p /app/models

# Non-root user for security
RUN groupadd --system mluser && useradd --system --gid mluser mluser
RUN chown -R mluser:mluser /app
USER mluser

EXPOSE 8000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
