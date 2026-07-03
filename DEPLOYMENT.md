# ResearchMind AI Deployment Guide

This guide provides step-by-step instructions for deploying, configuring, and maintaining the **ResearchMind AI** Intelligent Multi-Agent workspace.

---

## 1. System Architecture

ResearchMind AI consists of two main microservices containerized for production:
- **Backend (FastAPI)**: Coordinates PyMuPDF text segmentations, indexes dense vectors (via a local Sentence Transformers engine), saves threads in SQLite (SQLAlchemy), and orchestrates LLM reasoning graphs (LangGraph + OpenAI). Exposes REST endpoints on port `8000`.
- **Frontend (React + Nginx)**: Bundled using Vite, styled with Tailwind CSS, and hosted behind Nginx to route SPA URLs. Exposes user panels on port `80`.

---

## 2. Prerequisites

Ensure the following tools are installed on your host system:
- **Docker Desktop** (v20.10 or higher)
- **Docker Compose** (v2.0 or higher)
- **OpenAI API Key** (Required for the multi-agent orchestrator nodes)

---

## 3. Environment Configuration

1. Create a `.env` file in the **root** project directory (parallel to `docker-compose.yml`):
   ```bash
   # Root .env configuration
   OPENAI_API_KEY=sk-proj-yourActiveOpenAiApiKeyStringHere
   ```
2. The docker-compose orchestrator will automatically load this file and map `OPENAI_API_KEY` into the backend container.

### Advanced Settings (Optional)
The backend container includes these configurations as defaults:
- `APP_ENV`: `production` (toggles dev/prod exception handlers)
- `SQLITE_URL`: `sqlite:///db_data/researchmind.db` (persistent DB location)
- `CHROMA_PERSIST_DIR`: `/app/chromadb_data` (persistent vector DB location)
- `UPLOAD_DIR`: `/app/uploaded_papers` (persistent PDF files directory)
- `EMBEDDING_ENGINE`: `local` (set to `openai` to use cloud-based OpenAI embeddings)
- `LOCAL_EMBEDDING_MODEL`: `all-MiniLM-L6-v2` (Offline sentence-transformers model)

---

## 4. Deploying with Docker Compose (Recommended)

To compile and launch the entire application, execute the following commands in your terminal from the project root directory:

### Build and Launch Containers
```bash
docker compose up --build -d
```
*Note: The first build will bake the Sentence Transformers model weights (approx. 90MB) directly into the backend image to ensure offline embedding calculations are fast. This may take 1-2 minutes depending on your network.*

### Check Services Status
```bash
docker compose ps
```
Once initialized:
- The **Frontend Dashboard** is available at: [http://localhost](http://localhost)
- The **Backend API Swagger docs** are available at: [http://localhost:8000/docs](http://localhost:8000/docs)
- The **Backend Healthcheck** can be queried at: [http://localhost:8000/health](http://localhost:8000/health)

### View Execution Logs
```bash
docker compose logs -f
```

### Stop Application Containers
```bash
docker compose down
```

---

## 5. Local Development Execution (Manual)

If you prefer to run services manually for local development:

### Backend Development
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a python virtual environment:
   ```bash
   python -m venv .venv
   # On Windows:
   .venv\Scripts\activate
   # On macOS/Linux:
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the application server:
   ```bash
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

### Frontend Development
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install packages:
   ```bash
   npm install
   ```
3. Launch the development server:
   ```bash
   npm run dev
   ```
   *The client dev server runs on [http://localhost:5173](http://localhost:5173).*

---

## 6. Data Persistence & Backups

ResearchMind AI mounts three persistent **Docker Named Volumes** in `docker-compose.yml` to prevent data loss when containers are restarted:
1. `sqlite_data`: Stores chat session logs, messages, and uploaded paper schemas.
2. `chromadb_data`: Stores vector databases and indexes.
3. `uploaded_papers`: Stores raw PDF documents.

### How to Backup Named Volumes
To create a compressed backup of your relational data and vector indexes:
```bash
# Backup relational SQL database
docker run --rm -v researchmind-ai_sqlite_data:/volume -v %cd%:/backup alpine tar -czf /backup/sqlite_backup.tar.gz -C /volume .

# Backup ChromaDB vector database
docker run --rm -v researchmind-ai_chromadb_data:/volume -v %cd%:/backup alpine tar -czf /backup/chroma_backup.tar.gz -C /volume .
```

---

## 7. Troubleshooting

- **Authentication Errors (401 Unauthorized)**: Ensure you log in with the demo credentials: Username = `admin`, Password = `password123`.
- **CORS Failures**: If running the frontend client locally on a port other than `5173` or `80`, update the CORS configurations inside `backend/app/core/config.py` settings.
- **Port Conflict (80 or 8000 already in use)**: Modify the host mapping ports in `docker-compose.yml` (e.g., change `"80:80"` to `"8080:80"`).
