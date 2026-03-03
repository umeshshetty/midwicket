# Building the Pure Processing Agent: feature blueprint and architecture

**The "Pure Processing Agent" — a Thinking Partner, not an Executive Assistant — requires eight interlocking feature pillars and a carefully chosen technical stack that prioritizes capture speed, semantic intelligence, and proactive insight over administrative automation.** This report synthesizes research across 30+ tools, CHI 2025 proceedings, architectural analyses, and the user's own requirements documents to produce two actionable deliverables: a comprehensive feature blueprint organized around eight functional pillars, and a software architecture analysis covering web, mobile, backend, and infrastructure. The core thesis from the user's documents is validated: knowledge workers lose **58–60% of their day to meta-work**, and proactive AI assistants show a measurable **12–18% productivity advantage** over reactive tools — but only when interaction design respects cognitive boundaries.

---

# DELIVERABLE 1: Comprehensive feature blueprint

## A. Zero-Friction Capture — listen first, organize never

The foundational principle of ZFC is that **capture and organization are separate acts**, and forcing users to decide "where does this go?" at capture time kills creative momentum. The industry has converged on a "capture now, organize never" philosophy where AI handles filing after the fact.

### The Three-Click Rule in practice

Kosmik explicitly codified this: "If it takes more than three clicks, you'll lose momentum." Their implementation — press W to browse, click capture, click to place on canvas — achieves exactly three interactions. But the best apps now achieve **one or zero clicks**. Drafts opens instantly to a blank editor with the keyboard ready — launch *is* capture. Tana's configurable home-screen widgets send content to a pre-set destination with a single tap. Reflect's lock-screen widget starts voice recording from the lock screen in one interaction. The iPhone's Back Tap accessibility feature (double-tap the phone's back) can trigger a Shortcut to create a new note in any app — a physical gesture requiring zero screen interaction.

The most effective capture surfaces in 2025–2026 span **five layers**: lock screen widgets (Reflect, Tana), home screen widgets (Drafts grid with 8 configurable buttons, Tana, Notion Shortcuts), Control Center actions (Drafts on iOS 18+, Tana), share sheets (Mem, Capacities, Drafts' "Quick Capture" extension saves with no UI), and voice commands (Siri Shortcuts, "Hey Siri, Tana voice memo"). SupaSend emerged as a meta-capture layer supporting 12+ destinations from one interface. **The Pure Processing Agent should support all five layers from launch.**

### Multimodal capture across voice, text, camera, and screenshots

**Voice is the new keyboard.** Every leading app now offers voice capture with AI post-processing, but the frontier has moved beyond transcription accuracy (which has converged at ~95%+ across providers) to **intelligent structuring**. Mem 2.0's Voice Mode converts spoken "brain dumps" into organized, structured notes — preserving both audio and transcript, detecting when users join calls (Zoom, Teams, Slack, Google Meet), and offering to take notes *without a visible bot*. Tana's voice-chat creates AI-augmented conversations that are transcribed into structured notes with fields auto-filled and tasks extracted. For continuous vocabulary learning, Willow Voice leads with a "every correction compounds future accuracy" approach — names, phrasing, and domain terminology are remembered automatically, achieving **40%+ higher accuracy** than built-in OS dictation.

For camera/OCR, Apple's Live Text (iOS 15+) sets the baseline — interact with text in any image. Kosmik's built-in PDF reader with OCR allows selection of any page region for extraction. Capacities is building toward full OCR with PDF support on its 2026 roadmap. The recommended approach: use on-device OCR (Apple Vision framework, Google ML Kit) for instant local processing, with cloud fallback for complex documents.

### The "Idea Dump" — stream-of-consciousness capture and processing

The user's own whitepaper describes this perfectly: "Human creativity rarely occurs in perfectly formatted, linear sequences." **Mem leads the "capture now, organize never" philosophy**: voice dumps during morning walks become organized, searchable notes. A single "Clean Up" tap transforms messy scratchpad notes into formatted output. No folders required — AI-driven Collections handle organization. Tana takes the complementary approach of **structured emergence from chaos**: capture ideas in Daily Notes without deciding where they go, then apply Supertags later to instantly structure them. Heptabase adds a spatial dimension — daily journal entries can be dragged onto infinite whiteboards where spatial arrangement *is* the organization.

The recommended implementation pattern for the Pure Processing Agent:

- **Single inbox** for all capture (every thought, link, screenshot flows to the same place)
- **AI sorts automatically** within minutes (groups similar notes, extracts themes, creates structure)
- **Weekly review** surfaces AI summaries and clusters for user validation
- **Voice-to-structured-data** pipeline: Whisper transcription → LLM post-processing for formatting, entity extraction (people, dates, action items, topics), and automatic linking to existing knowledge

### AI-augmented brainstorming and thematic clustering

When presented with an initial concept, the system should generate **10–15 distinct variations** rapidly. FigJam's AI automatically clusters sticky notes by topic using embedding models to vectorize text, clustering algorithms to group by semantic similarity, and LLMs to generate descriptive labels. Miro Assist transforms raw brainstorming into structured outcomes. For personal knowledge, **Tana's weekly review workflow** represents the state of the art: daily writing → weekly reflections → emerging themes → growing structure, with AI extracting entities throughout.

The final conversion step — from idea clusters to structured workflows — follows this pipeline: capture (voice/text/images) → AI transcription + cleanup → entity extraction → type/tag application → automatic linking to related content → structured output (tasks with due dates, project cards, meeting summaries with action items).

---

## B. Semantic linking, vector memory, and the knowledge graph

The Pure Processing Agent abandons hierarchical folders for a **Networked Knowledge Graph** where information is connected nodes mirroring associative human memory. The user's requirements document describes the goal: "This thought about urban planning sounds like that note you made three months ago about mycelium networks."

### How leading tools implement networked thought

**Tana** ($25M raised, February 2025) built a true knowledge graph workspace with **Supertags modeled on object-oriented programming classes**. A Supertag defines fields, relationships, and AI commands — when applied to a node, it creates a typed entity instance. Tana implements formal semantic relationships including "is a" (via Supertags), "has a" (via fields), and "part of" (via semantic field functions), enabling recursive semantic queries. **Capacities** uses a similar object-oriented model with typed objects (Person, Book, Company, Meeting) but with more polished UX. **Obsidian** builds its graph implicitly from `[[wikilinks]]` across plain Markdown files — lightweight but lacking typed entities. **Roam Research** pioneered block-level granularity where every bullet point has a unique ID and supports transclusion. **Heptabase** adds spatial knowledge representation where whiteboard arrangement captures reasoning relationships beyond textual linking.

**Mem0** (the open-source AI memory layer) provides the most sophisticated reference architecture with **five pillars**: LLM-powered fact extraction (transforms conversations into atomic facts), vector storage for semantic similarity (supports Pinecone, Weaviate, Qdrant, ChromaDB, FAISS), graph storage for relationships (Neo4j/Neptune for entity-relationship tracking with temporal awareness), hybrid retrieval intelligence (combines vector + graph search), and production infrastructure (multi-tenancy, memory compression with **40% token reduction**).

### Vector embeddings and time-decayed relevance

For personal knowledge bases, the embedding landscape in 2025–2026 offers clear choices. **Obsidian Smart Connections** runs TaylorAI/bge-micro-v2 (384 dimensions) entirely on-device via Transformers.js. **Reor** uses Transformers.js with LanceDB as an embedded vector database, chunking and embedding every note at write time. Production-grade options include OpenAI text-embedding-3-large (3072 dims, $0.13/1M tokens), Voyage 3.5 (best quality/cost ratio at $0.06/1M tokens), and BGE-M3 (free, self-hosted, 100+ languages).

**Time-decayed semantic vectors** improve relevance by **up to 11% MAP** according to citation recommendation research. Three proven approaches exist: Superlinked's RecencySpace encodes timestamps as separate vector dimensions alongside text similarity, allowing query-time weight adjustment without re-embedding. Airweave uses linear decay (`final_score = similarity_score × ((1 - recency_bias) + recency_bias × decay_value)`), with a default recency_bias of 0.3. Milvus offers configurable linear, exponential, and Gaussian decay functions with parameters for origin, scale, offset, and decay rate. The recommended approach: **encode recency as a separate vector dimension** (Superlinked pattern) for maximum flexibility.

### Proactive linking and automatic relationship discovery

**Reor** provides the most explicit implementation of proactive linking: a sidebar automatically reveals related notes from the corpus via vector similarity as the user writes, creating a "feedback loop between you and your ideas." **Obsidian Smart Connections** surfaces related notes/blocks in a Connections pane with inline badges showing connection density. **Reflect** displays semantically similar notes alongside each note and can auto-decorate text with backlinks to identified entities. The emerging standard UX pattern uses **sidebar panels** updating in real-time during writing, **inline badges** indicating connection density, and **chat-based discovery** for deeper exploration.

### Hybrid search as the standard

Pure vector search is insufficient. The 2025 standard combines **three retrieval modalities**: BM25/keyword search for exact terms and proper nouns, dense vector search via embedding models for semantic similarity, and graph traversal for relationship-aware context. Score fusion uses **Reciprocal Rank Fusion (RRF)** or weighted linear combination, followed by cross-encoder reranking. Neo4j's GraphRAG Python package demonstrates the full stack: vector retriever → VectorCypher (vector + graph) → hybrid retriever (BM25 + vector) → HybridCypher (BM25 + vector + graph) for maximum coverage.

---

## C. Active synthesis and the "Thinking Partner" model

The Pure Processing Agent's core differentiator is its role as a **Cognitive Mirror** — not an oracle that provides answers, but a thinking partner that helps users see the shape of their own reasoning.

### The Cognitive Mirror and Socratic questioning

The user's requirements document formalizes this as a four-step loop: **Present** (human explains a concept) → **Query** (AI responds only from that explanation, feigning confusion or asking probes) → **Reflect** (AI's confusion diagnoses gaps in user's understanding) → **Refine** (user revises their mental model). This activates the **Protégé Effect** — humans learn more deeply by teaching others.

In practice, OpenAI's Study Mode (2025) marked the industry shift from answer-engine to thinking-partner, using layered prompts like "What would you try next?" and "Why might that assumption fail?" Georgia Tech's Socratic Mind scales viva-style depth for hundreds of students simultaneously. Khanmigo never gives direct answers, instead guiding through questions. The common implementation pattern across all tools: **one question at a time** (prevents cognitive overload), **follow-up based on response** (adaptive, not scripted), **explicit "don't give the answer" constraints**, and **assumption exposure** ("What assumptions are you making?").

Research validates this "productive friction" approach. A Frontiers in Education study (2025) with 230 students found hybrid models combining AI questioning with human tutoring most effective. UNESCO warns that AI-generated summaries allow users to bypass understanding — "What we need isn't another solution, but an external intelligence that asks the right questions." A landmark METR study found experienced developers were actually **19% slower** with AI tools despite *estimating* they were 20% faster — suggesting AI sometimes removes productive friction that aids comprehension.

### RAG architecture for personal knowledge

The standard RAG pipeline for personal data follows: **indexing** (chunk documents, embed, store) → **retrieval** (semantic + keyword search, rerank) → **augmentation** (inject context into prompt) → **generation** (LLM synthesizes answer). For personal knowledge bases specifically, recommended chunking uses **hierarchical parent-child chunks** (parent 1500 tokens → children 300 tokens) with 20% overlap, preserving markdown links, tables, and headers. Azure AI Search research found **512-token chunks with 25% overlap** consistently outperform other sizes. Hybrid retrieval (BM25 + vector via RRF) improves precision by **15–25%** over vector-only. Reranking ("retrieve wide top 20–50, rerank narrow to top 5") produces dramatic quality improvement at minimal cost.

**GraphRAG** (Microsoft) adds entity-relationship graphs over corpora, enabling theme-level and cross-document reasoning. It dramatically outperforms baseline RAG for "global sensemaking" questions like "What themes emerge across my notes?" Two modes exist: Local (entity-focused) and Global (community summaries). **LazyGraphRAG** defers graph construction to query time for cost efficiency. Recommendation: start with standard RAG, add GraphRAG when the corpus exceeds ~100K tokens and users need cross-document reasoning.

### Project Memory Bank patterns

The CLAUDE.md / .cursorrules pattern from coding tools reveals a fundamental insight: **persistent text files are more reliable than conversational memory**. Claude Code auto-loads `CLAUDE.md` at session start; Cursor loads `.cursorrules`; GitHub Copilot loads `copilot-instructions.md`. The best practice is a `CONTEXT.md` file maintained with current project phase, recent decisions, active blockers, and next steps — a single source of truth referenced by all tools.

For the Pure Processing Agent, this translates to **per-project memory banks** that persist across sessions: automatically maintained summaries of project state, key decisions, open questions, and accumulated context. ChatGPT implements memory as pre-computed user summaries injected into every conversation (automatic but shallow). Claude implements memory as searchable raw conversation history with project-level isolation (on-demand but deep). The recommended hybrid: automatic lightweight summaries + deep searchable history + user-editable context files.

### Pattern discovery across fragmented notes

NotebookLM's Mind Maps visualize how notes connect and group by theme — users report it discovers connections they hadn't explicitly created. Mem uses NLP to detect topics, suggest connections, and link related notes without manual categorization. Microsoft's GraphRAG builds entity-relationship graphs enabling theme-level answers. The implementation pipeline: semantic clustering of notes by embedding similarity → topic modeling to identify themes → knowledge graph mapping of entity relationships → cross-reference analysis finding notes discussing same concepts without explicit links → temporal analysis showing how themes evolve.

---

## D. Proactive intelligence — anticipate, don't just react

CHI 2025 research confirms that proactive AI delivers measurable benefits, but the interaction design is critical: too many nudges, poor timing, or broken trust kills adoption fast.

### The 12–18% productivity advantage

The user's whitepaper cites a **12–18% productivity advantage** for proactive AI over reactive tools. The most directly supporting evidence comes from CHI 2025's "Need Help? Designing Proactive AI Assistants for Programming" (Chen et al., CMU) and a JetBrains five-day field study with professional developers showing **significantly reduced interpretation time** from proactive suggestions. The JetBrains study found proactive suggestions worked best at three workflow-grounded points: ambiguous prompt detection, declined AI edit follow-up, and post-commit review. Microsoft Research presented four CHI 2025 papers on AI-augmented cognition, finding "proactive prompts can surface overlooked tasks" while "passive approaches supported individual thinking without directly influencing team behavior."

### Non-annoying proactive suggestions

Knowledge workers face **275 daily interruptions** and **121 daily emails**. The key frameworks for balancing helpfulness with intrusiveness: **timing intelligence** (AI learns individual patterns — push notifications on Tuesdays see highest engagement at 8.4%), **progressive disclosure** (start minimal, escalate only when context demands), **cross-platform coordination** (unified AI eliminates duplicate alerts across Slack, email, Teams), and **user control** (Apple Intelligence's Priority Notifications surface only the most important items). Meta Reality Labs' ProMemAssist system (UIST 2025) uses a **utility score** and threshold-based policy modeling working memory interference costs to decide whether/when to deliver assistance.

### At-Risk Alerts for stalling projects

Wrike's ML monitors projects using dozens of current and historic factors including: task/subtask complexity, percentage of overdue tasks, and historical owner performance. The system assigns risk levels (low/medium/high) with 1–3 risk summaries. Key detection signals: **velocity decline** (task completion rate vs. baselines), **communication pattern changes** (NLP analyzes sentiment shifts in project documentation), **dependency cascade prediction** (a 2-day design delay → 3-week launch delay), and **resource overload** (team members overbooked). Well-trained models achieve **85–95% prediction accuracy** for project delays.

### Energy-aware scheduling and circadian alignment

**Sunsama** leads with guided daily planning that assigns tasks to flexible energy zones ("Morning Clarity," "Afternoon Steady," "Evening Light"), warns if you plan more than 5 hours of deep work, and celebrates micro-wins. **Reclaim.ai** operates beneath existing tools, automatically protecting focus time, habits, and breaks. **rivva** (emerging 2026) connects to health apps and wearables for energy-based reminders — if recovery score is high, it encourages tackling difficult projects; if dragging, it suggests moving admin tasks. The recommended implementation pattern: Week 1 observe (passive tracking of energy 1–5 scale), Week 2 identify non-negotiable rhythms, Week 3+ map high-value work to peak energy periods.

### Implied task detection from conversations

**Fireflies.ai** generates action items with assignment and ownership from meeting transcripts, integrating with Salesforce, Asana, Trello, Jira. **Granola** takes a hybrid approach: user takes lightweight notes, AI enriches with transcript context — no visible bot, records via desktop audio. **Read AI** creates a cross-channel personal knowledge graph that surfaces insights proactively and tracks action items through completion. The technical approach: NLP detects imperative language and future commitments, speaker diarization enables attribution ("John will handle X"), and contextual understanding links extracted tasks to relevant projects.

---

## E. Relational Intelligence — the AI-powered personal CRM

The user's requirements document describes this as moving reminders from "time-based" (6:00 PM) to "event-based" ("Remind me when I see Sarah") — linking tasks to people, not calendars.

### Building a social graph automatically

**Affinity** is the gold standard: automatic CRM population from firm-wide email and calendar, AI-powered **Relationship Strength Scoring** based on recency and frequency of interactions, visual relationship graphs showing 2nd and 3rd-degree connections, and introduction path suggestions. The technical pattern: data ingestion (email metadata, calendar events, messaging platforms) → entity resolution (deduplication across sources) → edge weighting (interaction frequency, recency, response times, bi-directionality) → graph enrichment (external data adds context) → decay modeling (inactive relationships decrease in strength) → cluster detection (identify project teams, professional circles).

For individual knowledge workers, the most relevant tools are **Clay** (auto-pulls contacts from email, calendar, phone, social profiles; Nexus AI Copilot with MCP support; ~$10/mo), **Dex** (LinkedIn sync with job change notifications; AI message drafting; ~$12/mo), **Folk** (AI Research Assistant auto-generates company research; proactive follow-up suggestions; ~$17.50/mo), and **Orvo** (voice-first CRM where voice memos auto-become structured contact notes; ~$15/mo).

### Sentiment analysis and empathetic communication

EmailAnalytics evaluates email content on a 1–10 sentiment score with aggregated graphs over time. Read.ai provides Speaker Coach with real-time feedback and meeting quality scores. For empathetic outbound structuring, **Crystal Knows** leads with DISC personality profiling — analyzing online data to create personality profiles, then coaching communication style ("Be assertive" for D types, "Focus on big-picture" for I types). Crystal now offers an **MCP server** connecting personality intelligence to Claude, Cursor, and any MCP-compatible AI. Research confirms mismatches between user personality and AI communication style cause friction and reduced trust.

---

## F. Conversational retrieval — "Ask Questions" across everything

The user's whitepaper describes replacing boolean search with conversational natural-language querying across the entire ecosystem: "What were the key decisions regarding the new product launch while I was out?"

### Cross-platform retrieval architecture

**Glean** ($7.2B valuation, June 2025) connects to 100+ enterprise applications with a Personal Graph pulling from enterprise data, activity, conversations, and workflows. **Notion AI Q&A** searches across workspace pages, databases, and connected apps (Google Drive, Slack) with permission-aware retrieval. The standard architecture: connectors index data from multiple sources → unified vector database stores embeddings across all sources → permission layer ensures authorized access → RAG pipeline retrieves and synthesizes → citation system links answers to original sources.

### The Socratic tutoring model

The Pure Processing Agent should implement **bidirectional retrieval**: not just answering questions but asking them back. When a user asks the AI to evaluate a strategic plan, it should challenge underlying assumptions before providing analysis. The "productive friction" approach — give the next right *question*, not the next right *answer* — preserves cognitive ownership. NotebookLM's approach (source-grounded answers with follow-up question suggestions) and Mem 2.0's "AI Thought Partner" (agentic chat that can create, edit, and organize notes through conversation) represent the two poles of implementation.

---

## G. Habit formation and behavioral design

Three frameworks converge on the same principles: BJ Fogg's **B=MAP** (Behavior = Motivation × Ability × Prompt), Nir Eyal's **Hook Model** (Trigger → Action → Variable Reward → Investment), and James Clear's **habit stacking** ("After [existing habit], I will [new habit]").

### Applied to the Pure Processing Agent

The quintessential habit stack: **"After opening laptop → see today's brief."** Focus Bear is the most advanced implementation — when the user opens their computer, the app takes over the entire screen and guides through a morning routine, blocking distracting sites until complete. Sunsama's daily planning ritual and evening shutdown routine create bookend habits. Duolingo's metrics validate the approach: **47.7M daily active users**, 10 million users with 1-year+ streaks, users with active streaks **3× more likely** to return daily.

For the Hook Model applied to this product: **Trigger** = morning notification "Your daily brief is ready" + internal trigger of "I don't know what happened while I was away"; **Action** = open the brief (one click); **Variable Reward** = discover a forgotten insight that solves a current problem (Hunt), feel organized and in control (Self), see what connections emerged overnight (Tribe); **Investment** = add notes, customize preferences, connect integrations — each investment makes the AI better, creating switching costs and loading the next trigger.

The key behavioral design principle from Fogg: "Most ventures underinvest in making the minimum user action easier while overinvesting in attempting to drive motivation." The Pure Processing Agent must prioritize **reducing friction** (Ability) over boosting motivation. **Emerging (2026):** Emergent app treats habits as "adaptive behavioral systems rather than streaks" — models cues, context, and recovery explicitly, reinforcing resilience and return-after-break patterns rather than just streak length.

---

## H. Feature implementation priority matrix

| Priority | Feature | Pillar | Rationale |
|----------|---------|--------|-----------|
| **P0 — Launch** | Voice + text capture with AI structuring | ZFC | Core value prop; without frictionless capture, nothing else works |
| **P0 — Launch** | Semantic search across all content | Vector Memory | Users must find what they captured |
| **P0 — Launch** | Conversational AI interface (chat with notes) | Synthesis | The "Thinking Partner" experience |
| **P1 — Month 2** | Automatic linking and "related notes" sidebar | Semantic Linking | Proactive surfacing creates "a-ha moments" |
| **P1 — Month 2** | iOS/Android widgets, share sheets | ZFC | Mobile capture drives daily habit |
| **P1 — Month 2** | Daily brief and habit loops | Behavioral | Retention mechanism |
| **P2 — Month 4** | Proactive intelligence (at-risk alerts, implied tasks) | Proactive | Requires accumulated user data |
| **P2 — Month 4** | Project Memory Banks | Synthesis | Cross-session context |
| **P3 — Month 6** | Relational Intelligence / Personal CRM | Relational | Needs integration layer |
| **P3 — Month 6** | Energy-aware scheduling | Proactive | Needs behavioral data |
| **P3 — Month 6** | GraphRAG and pattern discovery | Synthesis | Needs large corpus |

---

# DELIVERABLE 2: Software architecture analysis

## The web app — React, Yjs, TipTap, and local-first

### Frontend framework: React + Vite, not Next.js

For a knowledge management SPA with complex client-side state, graph visualization, and real-time AI features, **React 19 + Vite** is the clear winner over Next.js, SvelteKit, or Solid.js. Knowledge management tools are fundamentally interactive SPAs, not content sites — Next.js's SSR/SSG adds unnecessary complexity. React's ecosystem provides everything needed: rich text editors (TipTap, ProseMirror), graph visualization (D3.js, React Flow), CRDT integrations (Yjs), and the largest developer hiring pool. Vite provides faster development experience than Webpack/Turbopack for large codebases.

Notion uses React + Redux + TypeScript. Obsidian uses no framework — vanilla JavaScript with custom DOM manipulation and CodeMirror 6. Anytype uses Electron + TypeScript with a Go backend core communicating via gRPC. The pattern: successful KM tools either use React or no framework at all. Both Obsidian and Anytype chose Electron for cross-platform desktop.

### Real-time sync: Yjs wins for editor-heavy apps

**Yjs** is the strongest CRDT choice — fastest implementation, best editor integrations (TipTap, ProseMirror, BlockNote, Monaco), battle-tested at scale, and supports both P2P and client-server topologies. Use a **client-server architecture** (like Figma/Linear) rather than pure P2P — the server provides auth, backup, and ordering while CRDTs handle local optimistic updates and conflict resolution. Figma explicitly rejected full CRDTs for a simpler Last-Writer-Wins per-property approach with a central server. Linear built an IndexedDB-first architecture where the app reads from the local database and syncs delta changes.

### Streaming AI responses: SSE for AI, WebSocket for sync

**Server-Sent Events win for LLM streaming** — unidirectional, standard HTTP, built-in auto-reconnect, lightweight, and used by ChatGPT, Claude, and most AI apps. WebSockets are needed separately for real-time collaboration (CRDT sync, presence, cursors). At 100K users, SSE has minimal memory overhead while WebSockets consume ~6.68 GiB for idle connections. Use the **dual-protocol approach**: SSE for AI streaming + WebSocket for collaboration.

### State management: Zustand + Jotai hybrid

**Zustand** for global application state (current workspace, UI state, sidebar, user preferences, selected nodes) and **Jotai** for graph node/document state where fine-grained reactivity matters. Both are from the same author (Daishi Kato), designed to work together, and are tiny (<2KB each). In benchmark testing, Jotai achieved **85ms average update time** vs. traditional React state at 220ms for complex interconnected fields. For the CRDT layer, state lives in Yjs shared types with Zustand/Jotai as the React binding layer.

### Rich text editor: TipTap + CodeMirror 6

**TipTap** (ProseMirror-based) for rich text/block editing — used by Linear, with native Yjs integration for collaboration, extensive extension ecosystem, and the most mature DX. Liveblocks' 2025 assessment explicitly recommended TipTap over Lexical: "Lexical needs more time to mature." **CodeMirror 6** for Markdown/code editing views — used by Obsidian. **BlockNote** (built on TipTap) is an option for Notion-style block editing out of the box but is less mature.

### Offline-first architecture

Store CRDT state in IndexedDB via `y-indexeddb` provider. Use a Service Worker + Background Sync for durable offline actions. OPFS (Origin Private File System) for large attachments/media. SQLite-in-browser (via sql.js or wa-sqlite + OPFS) for complex graph queries if IndexedDB proves insufficient. **Key caveat**: Safari historically deleted IndexedDB data after 7 days of inactivity, though modern browsers have relaxed limits significantly.

---

## The mobile app — React Native + Expo with native extensions

### React Native wins for startup velocity

**React Native + Expo with native Swift/Kotlin extensions** provides the best balance of speed, cross-platform reach, and native API access. The New Architecture (JSI, Fabric, TurboModules) is mandatory as of RN 0.82 (October 2025), eliminating the old async bridge — JSI enables synchronous, direct JavaScript↔Native communication. Hermes engine provides **30% faster startup times**. Expo's managed workflow provides cloud builds (EAS Build), OTA JavaScript updates (EAS Update), and single-command deployments.

**Critical constraint**: iOS WidgetKit, Share Sheet extensions, and Siri Shortcuts **must be written in Swift/SwiftUI** natively. React Native cannot render widgets (they run in separate extension processes). This requires 1–2 weeks of Swift/Kotlin work for platform-specific capture surfaces, then minimal maintenance. Expo config plugins allow adding native extension targets without ejecting.

Notion dropped React Native early and went fully native (Swift/Kotlin) with a WebView editor. Obsidian wraps its web app via Capacitor. Bear and Drafts are native Swift (Apple-only). For a cross-platform startup, React Native with strategic native extensions is the practical middle ground — a single JS/TS team with minimal native specialization.

### Offline-first mobile sync: PowerSync + SQLite

**PowerSync** (top recommendation) syncs Postgres ↔ SQLite on the client with SDKs for React Native, Flutter, and Web. Offline-first by design with full local SQLite copy. LWW conflict resolution by default with customizable merge logic. Pairs with Supabase for auth and Row-Level Security. The recommended stack: **Supabase (Postgres) + PowerSync (sync) + expo-sqlite (local)**, with the option to layer Yjs for collaborative text editing later.

### On-device vs. cloud ML — a hybrid strategy

| Feature | Where | Rationale |
|---------|-------|-----------|
| Text classification/tagging | On-device (Core ML/TFLite) | Fast, private, small models work well |
| Semantic search/embeddings | On-device (MiniLM-L6) | Can run sentence-transformers locally |
| Voice transcription | On-device (Whisper tiny/base) + cloud fallback | Whisper tiny runs on-device; cloud for accuracy |
| LLM chat/summarization | Cloud API (GPT-4o, Claude) | Core differentiating feature needs best quality |
| Smart connections/insights | Cloud (batch processing) | Complex graph analysis needs server compute |
| OCR/text recognition | On-device (Vision/ML Kit) | Fast, built-in, privacy-preserving |

**SLMs now power ~40% of mobile AI apps** (up from 15% in 2024). Feasible on-device models include Phi-3 mini (3.8B, quantized to ~2GB), Gemma 3n (5B parameters, 2B active), and Qwen3-0.6B. Sub-100ms inference for classification tasks; text generation at ~10–30 tokens/second on flagship phones.

### Background processing and push notifications

iOS is the constraining platform: BGAppRefreshTask gives ~30 seconds, BGProcessingTask runs when device is idle/charging, and the new BGContinuedProcessingTask (iOS 26) supports user-initiated long tasks. For proactive intelligence, use a **server-side AI processing → relevance scoring → rich push notification** pipeline. Deliver actionable notifications with buttons ("Save", "Remind Later", "Open Note") and respect quiet hours, frequency caps, and per-category opt-in. **expo-background-task** (SDK 53+) wraps BGTaskScheduler (iOS) and WorkManager (Android) in a unified API.

---

## Backend and AI infrastructure — FastAPI, pgvector, and the agent stack

### Backend: Python/FastAPI as primary

**FastAPI** is the clear winner for an AI-native startup: unmatched Python AI ecosystem (LangChain, LlamaIndex, HuggingFace, OpenAI SDKs), async-first performance (~21,000+ RPS on Uvicorn), auto-generated OpenAPI docs, and Pydantic validation. Used by Netflix and Microsoft for ML services. Strategy: **FastAPI monolith → extract Go microservices** for hot paths (embedding pipelines, data ingestion) as you scale.

### Vector database: start with pgvector, graduate to Qdrant

**pgvector** simplifies the stack — single PostgreSQL database for relational and vector data. pgvectorscale achieves **471 QPS at 99% recall** on 50M vectors. Graduate to **Qdrant** when hitting performance walls (consistently fastest in benchmarks, Rust-based, excellent metadata filtering, multi-tenancy with quota controls) or **Pinecone** for zero-ops. **Weaviate** is best if native hybrid search (keyword + vector) is critical from day one.

For embeddings: start with `all-MiniLM-L6-v2` (free, fast, 384 dims) for MVP. Production: OpenAI text-embedding-3-large or Voyage 3.5 (best cost/quality at $0.06/1M tokens). Privacy-critical: BGE-M3 self-hosted (Apache 2.0, 100+ languages). Domain-specific fine-tuning yields **+10–30% gains** typically.

### LLM orchestration: LlamaIndex for RAG, LangGraph for agents

**LlamaIndex** for the RAG core (purpose-built for data retrieval, 35% boost in retrieval accuracy). **LangGraph** (reached v1.0 in late 2025) for complex agent workflows — graph-based state machines with time-travel debugging, human-in-the-loop, and the best observability via LangSmith. Many production teams use LlamaIndex as the knowledge layer + LangGraph as the orchestration layer.

### The "Chief of Staff" multi-agent architecture

Use LangGraph's **supervisor pattern**: a coordinator agent receives user requests, decomposes them into sub-tasks, routes to specialized agents (Research Agent, Calendar Agent, Email Agent, Writing Agent), manages state across multi-step workflows, aggregates results, and handles escalation. **MCP** (Model Context Protocol, now under Linux Foundation governance with 10,000+ active servers and 97M+ monthly SDK downloads) provides universal tool integration. **A2A** (Google's Agent-to-Agent protocol, 50+ launch partners) enables agent-to-agent communication. Build MCP servers to expose your knowledge base; design for A2A compatibility.

### RAG architecture specifics

- **Chunking**: Hierarchical (parent 1500 tokens → children 300 tokens), 25% overlap, preserve document structure
- **Hybrid search**: BM25 + vector via Reciprocal Rank Fusion — **15–25% better** than vector-only
- **Reranking**: Retrieve top 20–50, rerank to top 5 using Cohere Rerank or cross-encoders
- **Query decomposition**: For complex questions, decompose into sub-queries, run in parallel, merge
- **GraphRAG**: Add when corpus exceeds ~100K tokens for cross-document reasoning
- **512-token chunks with 25% overlap** consistently outperform other sizes (Azure AI Search research)

### SLMs vs. large models — cost/performance routing

**Mistral 7B costs ~$0.0004/request vs. GPT-4 at ~$0.036/request — 90× cheaper.** The startup strategy: intent classification/routing via SLM (Phi-3/Qwen 0.6B — nearly free), simple extraction/summarization via SLM (Llama 3.2 8B — minimal cost), complex reasoning via GPT-4o/Claude Sonnet (pay only when needed), on-device/privacy-sensitive via Gemma 3n or Phi-4-mini through Ollama. This **model routing** is the single highest-impact cost optimization, achieving **40–60% savings** while maintaining 95% of GPT-4 quality.

### Authentication and data isolation

**Clerk** for auth (native Organizations with RBAC, SAML/SSO, edge-native JWT validation) + **Supabase PostgreSQL with Row-Level Security** for data isolation. RLS enforces tenant isolation at the database level — even application bugs can't leak cross-tenant data. Vector data isolation: use namespaces (Pinecone) or collection-per-tenant (Qdrant) with tenant_id in metadata filtering.

---

## DevOps, infrastructure, and cost optimization

### Cloud provider: GCP primary, Azure for OpenAI

**GCP** for AI/ML workloads (best startup credits at **$350K for AI track**, strong GKE, Vertex AI). **Azure** as secondary if building on OpenAI models (Azure OpenAI Service is **20–30% cheaper** than direct OpenAI). Stack credits aggressively: GCP AI track ($350K) + AWS Activate ($100K) + Microsoft for Startups ($150K if VC-backed) = **$600K+ potential credits**.

### Per-user LLM cost estimates

Without optimization (10 AI interactions/day, ~2K tokens each): GPT-4o costs **$6–12/user/month**, GPT-4o-mini costs **$0.30–0.60/user/month**. With optimization (caching + routing + prompt compression): **$0.10–$1.50/user/month**. The four-layer cost optimization stack: model routing (40–60% savings), semantic caching (15–40% savings via GPTCache or Redis with vector search; one customer support system reduced costs by **69%** with semantic caching alone), prompt optimization (10–30% via LLMLingua compression), and Anthropic/OpenAI prompt prefix caching (90%/50% savings on repeated system prompts).

### Monitoring: Langfuse + Sentry + OpenTelemetry

**Langfuse** (open-source, MIT) for LLM tracing, prompt management, and cost tracking. **Helicone** as an LLM gateway for caching, routing, and basic monitoring. **Sentry** for error tracking and mobile crash reporting. **Grafana Cloud** for infrastructure metrics and dashboards. **OpenTelemetry** from Day 1 for vendor-agnostic instrumentation. Avoid Datadog at early stage — expensive and proprietary.

### CI/CD: monorepo with Turborepo

**Monorepo** with Turborepo for a unified TypeScript stack across web, mobile, and backend. pnpm workspaces for package management. GitHub Actions for CI/CD. EAS Build for mobile (cloud-based, handles code signing). EAS Update for OTA JavaScript updates without app store review. **PostHog** (free tier, includes analytics + feature flags + session replay) or **Statsig** (stronger for A/B testing AI models — being acquired by OpenAI) for feature flagging.

### Security roadmap

Months 1–3: encryption (AES-256 at rest, TLS 1.3 in transit), RBAC, MFA, audit logging. Months 3–6: SOC 2 Type I readiness, GDPR data handling (right to erasure must work across database, vector store, embeddings, and cached LLM responses). Months 6–12: SOC 2 Type II observation period, penetration testing. Never train on user data by default; strip PII before sending to external LLM APIs using tools like Microsoft Presidio. **EU AI Act enforcement begins August 2026** — plan for conformity assessments if the product touches high-risk categories.

---

## Recommended architecture summary

```
┌─────────────────── WEB ─────────────────────┐
│  React 19 + Vite │ Zustand + Jotai          │
│  TipTap (rich text) + CodeMirror 6 (code)   │
│  Yjs (CRDT sync + offline) │ IndexedDB      │
│  D3.js / React Flow (graph viz)             │
│  SSE (AI streaming) + WebSocket (sync)      │
├──────────────── MOBILE ─────────────────────┤
│  React Native + Expo (SDK 53+)              │
│  Native Swift extensions (widgets, share)    │
│  expo-sqlite + PowerSync (offline sync)     │
│  On-device: Whisper, MiniLM, Vision/ML Kit  │
├──────────────── BACKEND ────────────────────┤
│  Python/FastAPI (primary API + AI service)   │
│  Supabase PostgreSQL + RLS (data store)     │
│  pgvector → Qdrant (vector search)          │
│  LlamaIndex (RAG) + LangGraph (agents)      │
│  Clerk (auth) + Redis (caching)             │
│  MCP servers (tool integration)             │
├──────────────── INFRA ──────────────────────┤
│  GCP (Cloud Run + GKE) │ Azure (OpenAI)     │
│  Langfuse + Helicone (LLM observability)    │
│  Sentry + Grafana Cloud (app monitoring)    │
│  GitHub Actions + Turborepo + EAS (CI/CD)   │
│  PostHog (feature flags + analytics)        │
└─────────────────────────────────────────────┘
```

### Monthly cost at ~1,000 users

| Category | Estimated cost |
|----------|---------------|
| Cloud infrastructure | $200–500 (mostly covered by credits) |
| LLM API costs (with optimization) | $100–1,500 |
| Vector database | $0–70 (free tier → starter) |
| Database (Supabase) | $0–25 |
| Monitoring/observability | $0–100 (free tiers) |
| CI/CD + builds | $0–50 |
| **Total with cloud credits** | **$100–1,500/month** |

## Conclusion — the mirror, not the manager

The Pure Processing Agent's competitive moat is **not** feature breadth but **philosophical clarity**: it processes rather than manages, mirrors rather than directs, and preserves the user's cognitive ownership rather than replacing it. The technical architecture supports this through local-first data ownership (Yjs + IndexedDB + PowerSync), semantic intelligence (hybrid vector + graph + keyword search with time-decay), and a carefully designed proactive layer that earns trust through graduated exposure (weeks 1–2 passive observation → weeks 3–4 gentle suggestions → month 2+ scaled proactive intelligence).

The most important technical insight across this research is that **the frontier in knowledge management has shifted from capture accuracy to post-capture intelligence** — what happens *after* the note is taken matters more than how it's taken. Transcription has converged at 95%+. The differentiator is now automatic structuring, semantic linking, proactive surfacing of forgotten connections, and the Socratic questioning that helps users see the shape of their own thinking. Build the graph, not the filing cabinet. Measure A-ha moments, not Inbox Zero.