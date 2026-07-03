FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV HF_HOME=/app/model_cache

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libmagic1 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy python packages requirements
COPY requirements.txt .

# Install packages
RUN pip install --no-cache-dir -r requirements.txt

# Bake local SentenceTransformer weights into image cache during build phase
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Copy backend source code
COPY . .

# Ensure volume data directories exist with appropriate permissions
RUN mkdir -p uploaded_papers chromadb_data

EXPOSE 8000

# Start FastAPI application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
