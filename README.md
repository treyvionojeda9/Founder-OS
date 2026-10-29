# Founder OS starter scaffold (Appendix E training lab)

[![Free Milestone 1 Checklist ($0+)](https://img.shields.io/badge/Gumroad-Free_Milestone_1_Checklist_(%240%2B)-D4AF37?style=for-the-badge&logo=gumroad&logoColor=0D0D0F)](https://aukdome.gumroad.com/l/founder-os-starter)
[![Full 37-Page Founder OS Manual + 14 SOPs ($49)](https://img.shields.io/badge/Gumroad-Full_37--Page_Founder_OS_Manual_(%2449)-0D0D0F?style=for-the-badge&logo=gumroad&logoColor=D4AF37)](https://aukdome.gumroad.com/l/founder-os)
[![Free AI Agent Setup Checklist ($0+)](https://img.shields.io/badge/Gumroad-Free_AI_Agent_Setup_Checklist_(%240%2B)-1E293B?style=for-the-badge&logo=gumroad&logoColor=D4AF37)](https://aukdome.gumroad.com/l/agent-setup-checklist)

A local-first, pen-and-tablet-ready personal knowledge, Sovereign University, and multi-agent operating environment by Aukdom Ethnine (The Sovereign Monastery). Canonical repository: https://github.com/treyvionojeda9/Founder-OS

- Track 2 Free Starter (`$0+` on Gumroad): *Founder OS: Milestone 1 Architecture & SOP Checklist (Human/Machine Vault Map & SOP-01 to SOP-04 Starter)* at https://aukdome.gumroad.com/l/founder-os-starter
- Track 2 Flagship Manual (`$49` on Gumroad): *Founder OS: The Sovereign Monastery Edition (37-Page Engineering Manual + All 14 Build SOP Checklists, 6 Exercises, 30-Day Challenge Tracker & 5 Vibe-Coding Prompts)* at https://aukdome.gumroad.com/l/founder-os
- Track 1 Separate Multi-Agent Track (`$0+` / `$19` on Gumroad): *The Step-by-Step AI Agent Setup Checklist* (https://aukdome.gumroad.com/l/agent-setup-checklist) and *How to Build Multi-Agent AI Systems* (https://aukdome.gumroad.com/l/multi-agent-systems)
- All Sovereign Monastery books, worksheets, and community rooms: https://linktr.ee/Aukdom and https://whop.com/aukdom-ethnine

## What this repository is

This repository is the reproducible Appendix E training scaffold from *Founder OS: The Sovereign Monastery Edition*. It includes a typed local frontend repository (`client/src/storage/noteRepository.ts`), a FastAPI validation boundary (`api/app/main.py`), and the five-table PostgreSQL schema (`sql/001_init_schema.sql`). It also provides the local Docker Compose skeleton (`compose.yaml`), the Chapter 1 Product Contract template (`docs/PRODUCT-CONTRACT-TEMPLATE.md`), and automated boundary unit tests (`tests/test_boundary.py`).

Founder OS is built around one architectural rule: the machine may analyze permitted human notes, but it never writes into the human-authored record.

```text
founder-os-data/
  human-vault/
    projects/<project-id>/notes/
    projects/<project-id>/ink/
    projects/<project-id>/attachments/
  machine-vault/
    projects/<project-id>/research/
    projects/<project-id>/reports/
  library/
    books/
    course-assets/
  media/
    music/
    films/
    photos/
  exports/
  backups/
```

## Two-minute quickstart

### 1. Run the boundary unit tests (zero external dependencies required)

```bash
PYTHONPATH=. python3 -m unittest discover -s tests -v
```

The test suite verifies two core invariants from Chapter 3 and Appendix E:
1. `/tasks/validate` validates task shape (`valid_shape: True`) while enforcing `executable: False` and `review_required: True`.
2. Any attempt by a `machine` principal to create or overwrite a `human` vault record raises `403 AUDIT_REJECT`.

### 2. Run the FastAPI training scaffold

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install fastapi "uvicorn[standard]" pydantic
uvicorn api.app.main:app --reload
```

Open `http://127.0.0.1:8000/docs` to test `/health`, `/tasks/validate`, and `/notes/write`.

### 3. Inspect the typed IndexedDB client repository (`client/`)

`client/src/storage/noteRepository.ts` implements the typed `Note` and `NoteRepository` interface using Dexie (IndexedDB). It enforces `principal === "human"` and `note.vault === "human"` on `saveHumanEdit`. You can later swap in a native Android Kotlin/Compose client on the TCL Note A1 NXTPAPER tablet without changing your domain model.

## What is in this repo vs. the full 37-page Founder OS manual

| Layer or Deliverable | This Free GitHub Scaffold (Appendix E) | Free Milestone 1 Checklist (`$0+` on Gumroad) | Full Founder OS Manual + 14 SOPs (`$49` on Gumroad) |
|---|---|---|---|
| **Chapter 1 Product Contract & No-Feature Test** | Template (`docs/PRODUCT-CONTRACT-TEMPLATE.md`) | Included (`Founder-OS-Milestone-1-Checklist.pdf`) | Full Chapter 1 specification + Exercise 1 |
| **Chapter 3 Five-Table SQL Schema & Vault Tree** | Included (`sql/001_init_schema.sql`) | Visual Two-Vault Topology Map (`Founder-OS-Vault-Architecture-Map.pdf`) | Full 5-layer storage architecture + Exercise 2 |
| **Chapter 5 Docker Compose Local Skeleton** | Included (`compose.yaml`) | Milestone 1 Sync Checklist | Full 8 TB NAS mirror sizing, 3-2-1 backup, and offline sync cursors |
| **Chapter 7 & 10 Model Scorecard & 10/30/60 Routing** | Not included | Included (`Founder-OS-MCP-Cost-Calculator.pdf`) | Full 8-model role scorecard, 5-role team, and Exercise 6 malicious doc test |
| **Appendix E FastAPI + Dexie Training Scaffold** | Included (`api/`, `client/`, `tests/`) | Reference checklist | Full 5-step Appendix E lab walk-through |
| **17 Engineering Chapters (Parts I to IV)** | Not included | Overview only | Complete 37-page manual (Software, Models/Agents, Human-Machine, Ops) |
| **All 14 Build SOP Checklists (SOP-01 to SOP-14)** | SOP-01 directory layout only | SOP-01 to SOP-04 Starter | All 14 printable/fillable SOP sheets (`Founder-OS-Complete-Workbook-and-SOPs.pdf`) |
| **6 Hands-On Security & Architecture Exercises** | Exercise 1 & 2 code hooks | Checklist summary | All 6 exercises in fillable worksheet format |
| **Chapter 17 30-Day Build-and-Learn Challenge** | Not included | Not included | Complete 30-day tracker (Define, Capture, Connect, Protect, Interpret, Execute) |
| **Appendix A: 5 Ready-to-Use Vibe-Coding Prompts** | Not included | Not included | All 5 prompts (Architect, Feature Builder, Ink Interpreter, Tutor, Security Reviewer) |
| **Appendix B: 15-Item Core Acceptance Checklist** | Not included | Not included | Full release-gate verification sheet |

## Next steps for builders

1. Download the free *Founder OS: Milestone 1 Architecture & SOP Checklist* (`$0+` PWYW, includes the 2-page Milestone 1 Checklist, 2-page Vault Architecture Map, and 2-page MCP Cost Calculator): https://aukdome.gumroad.com/l/founder-os-starter
2. Get the complete 37-page *Founder OS: The Sovereign Monastery Edition* manual + 8-page Complete Workbook & All 14 Build SOP Checklists (`$49`): https://aukdome.gumroad.com/l/founder-os
3. Want the standalone multi-agent workflow track? Grab the separate free *The Step-by-Step AI Agent Setup Checklist* (`$0+` at https://aukdome.gumroad.com/l/agent-setup-checklist) and companion ebook *How to Build Multi-Agent AI Systems* (`$19` at https://aukdome.gumroad.com/l/multi-agent-systems).
4. Join The Sovereign Monastery and The Forge: https://whop.com/aukdom-ethnine and https://linktr.ee/Aukdom
