# Project Handoff Notes: ResearchMind AI

If you are continuing this project in a new conversation session, please read these notes to instantly catch up on the codebase state, design decisions, and system credentials.

---

## 📂 Project Location & Environment
* **Root Workspace Path**: `C:\Users\Hp\.gemini\antigravity\scratch\researchmind-ai`
* **Local Run Script**: Double-click `run-local.bat` at the root to spin up both FastAPI backend (`127.0.0.1:8000`) and Vite frontend (`localhost:5173`).
* **Environment Keys**: The LLM configuration is loaded from `backend/.env`.

---

## 🔐 Default Access Credentials
* **Administrator Profile**:
  - **Username**: `admin`
  - **Password**: `admin123` (Enables the admin-only "Registered Users" panel)
* **Researcher Profile**:
  - **Username**: `user`
  - **Password**: `user123` (Default standard user, no admin panels)

---

## 🛠️ Key Features Implemented

1. **User Ownership Isolation**:
   - Every uploaded research paper is linked to the logged-in user via a `user_id` column in the database (with self-healing migration scripts executing during database lifespan setup).
   - Endpoint GET lists filter automatically by the authenticated JWT session owner.

2. **Workstation View Layouts & Actions**:
   - Added layout toggles: **Split Screen (50/50)**, **Notes Editor Mode (Full Screen Editor)**, and **AI Chat Mode (Full Screen Chat)**.
   - Built a **Copy to Notes** action on chat responses to instantly append AI explanations directly to the active notes editor draft.
   - Built a collapsible **Paper Metadata Accordion Drawer** containing doi resolvers, journal venue data, and DB reference logs.

3. **Admin Panel Column**:
   - If logged in as `admin`, the literature library dashboard displays a third panel on the right rendering a list of all registered accounts dynamically queried from a custom admin-secured backend route.

4. **Groq Auto-Detection & Schema Robustness**:
   - The LLM orchestrator automatically routes Groq API keys (`gsk_...`) to Groq's endpoints, sets active models to `llama-3.3-70b-versatile`, and runs a JSON schema polyfill wrapper for structured citation extraction.
   - Changed schema fields to `Optional` to avoid Pydantic validator crashes on incomplete academic reference variables.

5. **Instant Login Authentication**:
   - Password PBKDF2 hashing rounds optimized to `2,000` (from `100,000`) for near-instant (less than 10ms) verify calls on local development systems.
