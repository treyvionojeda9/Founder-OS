# How to Start Founder OS (Frontend-First Quickstart)

Repository: https://github.com/treyvionojeda9/Founder-OS

This guide gives you the exact commands to boot the **Founder OS** environment so you can build and style the **frontend and visual design first**, while the local Human/Machine Vault storage (`IndexedDB` via Dexie) and FastAPI boundary already work underneath.

---

## Step 1 — Push or Unpack This Starter Into Your Repo

If you downloaded `founder-os-starter-github-repo.zip`, unzip it, open a terminal inside the `github-starter-repo` folder, and push it to your GitHub repo:

```bash
git init
git add .
git commit -m "Initial Founder OS starter scaffold (Frontend shell + Vault boundary)"
git branch -M main
git remote add origin https://github.com/treyvionojeda9/Founder-OS.git
git push -u origin main
```

---

## Step 2 — Start the Frontend Dev Server First (Hot-Reload UI Mode)

You can design and build the entire frontend UI **without** needing Docker or Postgres running, because `client/src/storage/noteRepository.ts` runs locally in your browser's IndexedDB (`FounderOSLocalDB`).

Open a terminal and run:

```bash
cd client
npm install
npm run dev
```

1. Open **`http://localhost:5173`** in your browser.
2. Edit **`client/src/App.tsx`** (and add your components, screens, canvas/ink views, and stylesheets under **`client/src/`**).
3. Every time you save a file in `client/src/`, Vite hot-reloads the browser immediately so you can see how it looks live.

### How the Frontend Connects to the Data Layer (Already Wired for You)
Inside `client/src/storage/noteRepository.ts`, two methods enforce the Founder OS architecture automatically while you build the UI:
- **`repo.saveHumanEdit(note, "human")`** — Saves notes, ink strokes, and workspace items into the **Human Vault** (`vault: "human"`).
- **`repo.saveMachineOutput(note, "machine")`** — Saves AI/agent outputs into the **Machine Vault** (`vault: "machine"`). If any machine call tries to write to the Human Vault, it automatically throws `SECURITY_BOUNDARY_VIOLATION`.

---

## Step 3 — Start the FastAPI Backend (Optional While Styling UI)

When you want your frontend to hit the Python API endpoints (`/health`, `/tasks/validate`, `/notes/write`), open a second terminal in the repo root and run:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install fastapi "uvicorn[standard]" pydantic
uvicorn api.app.main:app --reload --port 8000
```

- **Interactive API Docs:** `http://127.0.0.1:8000/docs`
- **Frontend Proxy:** `client/vite.config.ts` is already pre-configured to proxy `/api/*` requests from `http://localhost:5173` directly to `http://127.0.0.1:8000`.

---

## Step 4 — Verify the Security & Boundary Tests Anytime

From the repo root, run:

```bash
PYTHONPATH=. python3 -m unittest discover -s tests -v
```

This runs the 4 automated boundary tests (`tests/test_boundary.py`) confirming that machine principals are rejected (`403 AUDIT_REJECT`) if they ever attempt to touch the Human Vault.

---

## Step 5 — Start PostgreSQL 17 via Docker (When You Move Past Local IndexedDB)

Once your frontend look and feel are locked in and you're ready to wire server-side persistence:

```bash
DB_PASSWORD=choose_a_local_password docker compose up -d db
```

Then load the 5-table schema in `sql/001_init_schema.sql` (`projects`, `notes`, `note_links`, `tasks`, `audit_events`).
