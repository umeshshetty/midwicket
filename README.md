# Midwicket

A personal knowledge management app built as a **cognitive offload tool** — a thinking partner that captures your notes, surfaces connections, and keeps track of people, projects, reminders, and ideas so you don't have to hold everything in your head.

---

## Features

### Inbox — Quick Capture
- Rich text editor (TipTap) with markdown shortcuts
- Auto-saves as you type (500ms debounce)
- Every note automatically triggers AI analysis in the background
- Pin important notes, filter by tags, full-text search

### AI Chat
- Persistent AI chat sidebar powered by Claude (Sonnet, streaming)
- Aware of all your notes — ask questions, summarize, connect ideas
- Collapsible panel; available from any view

### Knowledge Graph
- Auto-built from your notes — no manual tagging required
- **Two-pass graph agent** (runs after every note save):
  - **Pass 1** — Extracts named entities (people, projects, concepts, technologies, orgs, events, ideas)
  - **Pass 1b** — Graph-guided retrieval: looks up extracted entity names in the existing graph to find related notes (local, no API cost)
  - **Pass 2** — Identifies cross-note relationships and shared concepts using only the most relevant related notes
- Link quality improves as the graph grows (self-reinforcing index)
- Interactive React Flow canvas with D3-force layout
- Color-coded entity nodes by type; drag to reposition (positions persist)
- Click a note node to open it; minimap + zoom controls
- **Bulk analysis** button: two-pass analysis across all notes to build the full graph from scratch

### Reminders
- Automatic extraction of tasks, events, deadlines, and reminders from notes
- Resolves natural language dates ("next Tuesday", "March 15") to ISO dates where possible
- Grouped by urgency: Overdue / Today / This Week / Later / Undated
- Mark done, jump to source note, or delete from the Reminders view
- Automatically updates when you edit a note

### People Registry
- Everyone you mention in your notes appears here automatically
- Extracted context per person: **role**, **organization**, **relationship type** (colleague, client, mentor, advisor, friend, stakeholder), **key fact**
- Searchable card list with role + org subtitle and relationship badge
- Detail panel: key fact callout + chronological list of every note mentioning that person
- `lastMentionedAt` tracking — always shows the most recent interaction date

### Work Registry
- All **projects** and **organizations** from your notes in one place
- Extracted context: **status** (active / planning / completed / on-hold), **description**, **stakeholders**, **industry**
- Status dot with glow (teal = active, amber = planning, gray = completed, rose = on-hold)
- Filter tabs: All / Active / Planning / Completed
- Detail panel: status badge, description, stakeholder chips, related notes timeline
- Stakeholders linked back to person entities with full context

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite 7 + TypeScript |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite`, no config file) |
| State | Zustand v5 with `persist` middleware (localStorage) |
| Editor | TipTap v3 (StarterKit + Placeholder + CharacterCount) |
| Graph UI | React Flow 11 + D3-force |
| AI | Anthropic SDK (`@anthropic-ai/sdk`) |
| Icons | Lucide React |

**AI models used:**
- `claude-sonnet-4-6` — streaming chat
- `claude-haiku-4-5-20251001` — background agents (entity extraction, relationship analysis, reminder detection) via structured tool use

---

## Project Structure

```
midwicket/
├── blueprint.md              # Original product spec
└── web/                      # React SPA
    ├── src/
    │   ├── types.ts           # All shared types (Note, GraphNode, Reminder, EntityMetadata…)
    │   ├── App.tsx            # Root layout + view routing
    │   ├── stores/
    │   │   ├── notesStore.ts       # Notes + triggers agents on save/delete
    │   │   ├── graphStore.ts       # Knowledge graph nodes/edges, metadata merge
    │   │   ├── remindersStore.ts   # Reminders with overdue/upcoming selectors
    │   │   ├── chatStore.ts        # AI chat messages
    │   │   └── uiStore.ts          # View, active note, sidebar, chat panel
    │   ├── lib/
    │   │   ├── ai.ts               # Streaming chat (Sonnet)
    │   │   └── agents/
    │   │       ├── agentQueue.ts   # Debounce queue (2s per note)
    │   │       ├── graphAgent.ts   # Two-pass entity + relationship extraction
    │   │       └── reminderAgent.ts # Reminder/event extraction
    │   └── components/
    │       ├── capture/        # QuickCapture
    │       ├── notes/          # NoteCard, NoteList, NoteEditor
    │       ├── chat/           # ChatPanel
    │       ├── graph/          # GraphView, KnowledgeGraph, BulkAnalyzeButton
    │       ├── reminders/      # RemindersView
    │       ├── people/         # PeopleView
    │       ├── work/           # WorkView
    │       ├── search/         # SearchView
    │       └── layout/         # Sidebar, TopBar
    ├── package.json
    └── vite.config.ts
```

---

## Getting Started

**Prerequisites:** Node.js 18+, pnpm

```bash
# Install dependencies
cd web
pnpm install

# Add your Anthropic API key
cp .env.local.example .env.local
# Edit .env.local and set VITE_ANTHROPIC_API_KEY=sk-ant-...

# Start dev server
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173).

> The app works without an API key (notes save locally) but AI features (chat, graph building, reminders) require a valid key.

---

## How the Graph Agent Works

```
Note saved
    │
    ▼
Pass 1 — extract_entities (Haiku API call)
    Extracts: name, type, aliases, context
    Context: role, org, relationship, status, description, stakeholders…
    │
    ▼
Pass 1b — Graph index lookup (LOCAL, free)
    Finds related notes that previously mentioned the same entities
    Result: up to 10 most relevant related note IDs
    │
    ▼
Upsert entity nodes into graph store
    Metadata is MERGED (never overwrites with empty values)
    lastMentionedAt tracks the most recent note date
    │
    ▼ (only if related notes found)
Pass 2 — extract_relationships (Haiku API call)
    Identifies entity↔entity relationships ("works at", "founded", "uses")
    Identifies note↔note shared concepts
    Upserts edges into graph store
```

As the graph grows, Pass 1b finds more related notes → Pass 2 produces richer links. The system self-improves.

---

## Design

Dark-first UI, no light mode.

| Token | Colour | Use |
|---|---|---|
| Background | `#0c0c0d` | Canvas |
| Surface | `#131315` / `#1a1a1d` | Sidebar, panels |
| Accent purple | `#8b5cf6` | Primary actions, note nodes |
| Accent teal | `#14b8a6` | Person entities, active status |
| Accent amber | `#f59e0b` | Project/planning states, processing |
| Accent rose | `#f43f5e` | Overdue, on-hold |
| Muted | `#9090a8` | Secondary text |
