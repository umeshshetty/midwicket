import { useEffect, useRef } from 'react'
import {
  Brain, Sparkles, GitFork, Users, Briefcase, Bell, Filter, Bot,
  MessageSquare, Zap, Database, Cpu, ArrowRight, ArrowDown,
  Lightbulb, HelpCircle, Heart, AlertTriangle, Clock, Eye,
  Layers, Code2, Palette, Type, ChevronRight
} from 'lucide-react'

// ─── Scroll fade-in hook ─────────────────────────────────────────────────────

function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = '1'
          el.style.transform = 'translateY(0)'
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return ref
}

function Section({ children, id }: { children: React.ReactNode; id?: string }) {
  const ref = useFadeIn()
  return (
    <div
      ref={ref}
      id={id}
      style={{
        opacity: 0,
        transform: 'translateY(24px)',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
      }}
    >
      {children}
    </div>
  )
}

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold" style={{ color: '#e8e8f0' }}>{children}</h2>
      {sub && <p className="text-sm mt-1" style={{ color: '#5a5a72' }}>{sub}</p>}
    </div>
  )
}

function Divider() {
  return (
    <div className="my-16 mx-auto" style={{ maxWidth: 200 }}>
      <div style={{
        height: 1,
        background: 'linear-gradient(90deg, transparent, #8b5cf6, #14b8a6, transparent)',
      }} />
    </div>
  )
}

// ─── HERO ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <div className="relative overflow-hidden" style={{ minHeight: '80vh' }}>
      {/* Animated gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 30% 20%, rgba(139,92,246,0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(20,184,166,0.1) 0%, transparent 50%)',
          animation: 'pulse 8s ease-in-out infinite alternate',
        }}
      />

      <div className="relative flex flex-col items-center justify-center text-center px-6" style={{ minHeight: '80vh' }}>
        {/* Logo */}
        <div
          className="flex items-center justify-center rounded-2xl mb-8"
          style={{
            width: 72,
            height: 72,
            background: 'linear-gradient(135deg, #8b5cf6, #14b8a6)',
            boxShadow: '0 0 60px rgba(139,92,246,0.3), 0 0 120px rgba(20,184,166,0.15)',
          }}
        >
          <Brain size={36} color="white" />
        </div>

        <h1
          className="text-5xl font-bold tracking-tight mb-4"
          style={{
            background: 'linear-gradient(135deg, #e8e8f0, #8b5cf6, #14b8a6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Midwicket
        </h1>

        <p className="text-xl font-light mb-3" style={{ color: '#9090a8' }}>
          A Pure Processing Agent — Your Thinking Partner
        </p>

        <p className="text-sm max-w-lg leading-relaxed" style={{ color: '#5a5a72' }}>
          Not an assistant that gives answers, but a cognitive mirror that helps you think better.
          Captures thoughts, builds a knowledge graph, detects contradictions, and asks the right questions.
        </p>

        <div className="flex items-center gap-4 mt-8">
          <a
            href="/"
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all"
            style={{ background: 'rgba(139,92,246,0.9)', color: 'white' }}
          >
            Open App <ChevronRight size={14} />
          </a>
          <a
            href="#features"
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#9090a8', border: '1px solid #2e2e35' }}
          >
            Explore Architecture
          </a>
        </div>

        <div className="mt-16">
          <ArrowDown size={20} style={{ color: '#3d3d47' }} className="animate-bounce" />
        </div>
      </div>
    </div>
  )
}

// ─── FEATURE GRID ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Sparkles,
    title: 'Zero-Friction Capture',
    desc: 'Text, voice, paste — every thought flows to one inbox. Auto-generated titles, hashtag extraction, word counts. Capture now, organize never.',
    color: '#8b5cf6',
  },
  {
    icon: GitFork,
    title: 'Knowledge Graph',
    desc: 'Two-pass AI extracts entities (people, projects, concepts) and discovers relationships across notes. Graph-guided retrieval improves as it grows.',
    color: '#14b8a6',
  },
  {
    icon: Brain,
    title: 'Active Intelligence',
    desc: 'Living project briefs auto-maintained by AI. Contradiction detection flags when new info conflicts with established facts. Time-decay surfaces what matters.',
    color: '#f59e0b',
  },
  {
    icon: Users,
    title: 'People & Work Registries',
    desc: 'Automatic CRM from your notes — roles, organizations, relationships for people. Status, blockers, stakeholders for projects. All AI-extracted.',
    color: '#14b8a6',
  },
  {
    icon: Bell,
    title: 'Temporal Awareness',
    desc: 'Tasks, events, deadlines extracted from natural language. Smart date parsing, priority detection. Grouped by urgency: Overdue, Today, This Week, Later.',
    color: '#f43f5e',
  },
  {
    icon: Filter,
    title: 'Cognitive Sieve',
    desc: 'Brain dump mode: paste stream-of-consciousness, AI sorts into Actionable Steps, Incubating Ideas, Open Questions, and Emotional Offload. One-click to notes.',
    color: '#8b5cf6',
  },
  {
    icon: Bot,
    title: 'AI Thinking Partner',
    desc: 'Socratic chat that asks questions, not answers. Injects note context, project briefs, contradictions, and blockers. Helps you think, not think for you.',
    color: '#14b8a6',
  },
  {
    icon: MessageSquare,
    title: 'Thread Intelligence',
    desc: 'Detects topic switches and saves tangent ideas. "Where was I?" restores context. Dependency resolution surfaces immediate bottlenecks. Socratic unblocking when stuck.',
    color: '#f59e0b',
  },
]

function FeatureGrid() {
  return (
    <Section id="features">
      <SectionTitle sub="Eight interlocking pillars of cognitive offload">Feature Pillars</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {FEATURES.map((f, i) => {
          const Icon = f.icon
          return (
            <div
              key={i}
              className="rounded-xl border p-5 transition-all hover:border-opacity-50"
              style={{
                background: '#131315',
                borderColor: '#2e2e35',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = f.color
                ;(e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${f.color}15`
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = '#2e2e35'
                ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
              }}
            >
              <div
                className="flex items-center justify-center rounded-lg mb-3"
                style={{ width: 36, height: 36, background: `${f.color}15` }}
              >
                <Icon size={18} style={{ color: f.color }} />
              </div>
              <h3 className="text-sm font-semibold mb-2" style={{ color: '#e8e8f0' }}>{f.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: '#5a5a72' }}>{f.desc}</p>
            </div>
          )
        })}
      </div>
    </Section>
  )
}

// ─── DATA FLOW DIAGRAM ───────────────────────────────────────────────────────

function DataFlow() {
  return (
    <Section id="dataflow">
      <SectionTitle sub="What happens when you save a note">Data Flow Architecture</SectionTitle>

      <div className="rounded-xl border p-6 overflow-x-auto" style={{ background: '#131315', borderColor: '#2e2e35' }}>
        <pre
          className="text-xs leading-relaxed whitespace-pre"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: '#9090a8' }}
        >
{`  ┌──────────────────┐
  │   Note Created    │  User saves a note via QuickCapture or NoteEditor
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │  Agent Queue     │  2-second debounce per note — rapid edits don't spam AI
  │  (debounce 2s)   │
  └────────┬─────────┘
           │
     ┌─────┴──────┐
     │            │
     ▼            ▼
 `}<span style={{ color: '#8b5cf6' }}>{'Graph Agent'}</span>{`   `}<span style={{ color: '#f59e0b' }}>{'Reminder Agent'}</span>{`     ◄── Run in parallel (Promise.all)
     │            │
     │            └─► `}<span style={{ color: '#f59e0b' }}>{'extract_reminders'}</span>{` tool (Haiku)
     │                 → Tasks, events, deadlines with dates
     │                 → Priority: high / medium / low
     │                 → Stored in RemindersStore
     │
     ├─► `}<span style={{ color: '#8b5cf6' }}>{'Pass 1: extract_entities'}</span>{` tool (Haiku)
     │    → People, projects, concepts, orgs, events, places, tech, ideas
     │    → Rich metadata: role, org, status, stakeholders
     │
     ├─► `}<span style={{ color: '#14b8a6' }}>{'Pass 1b: Graph Index Lookup'}</span>{`  ◄── `}<span style={{ color: '#14b8a6' }}>{'FREE (no API call)'}</span>{`
     │    → Match entities against existing graph nodes
     │    → Find related notes via shared entities
     │    → Returns up to 10 most relevant notes
     │
     ├─► `}<span style={{ color: '#f59e0b' }}>{'Context Agent'}</span>{`  ◄── Fire & forget (30s per-entity debounce)
     │    → For project/org entities only
     │    → update_project_context tool (Haiku)
     │    → Maintains ≤100-word living brief
     │    → Updates: summary, open questions, blockers
     │
     └─► `}<span style={{ color: '#8b5cf6' }}>{'Pass 2: extract_relationships'}</span>{` tool (Haiku)
          → Only fires if related notes found in Pass 1b
          → Entity ↔ Entity relationships (with labels + weights)
          → Note ↔ Note shared concepts (thematic bridges)
          → `}<span style={{ color: '#f43f5e' }}>{'Contradiction detection'}</span>{` (was X, now Y)
              → Stored in TensionsStore`}
        </pre>
      </div>

      {/* Key insight callout */}
      <div
        className="mt-4 rounded-xl border px-5 py-4 flex items-start gap-3"
        style={{ background: 'rgba(20,184,166,0.06)', borderColor: 'rgba(20,184,166,0.15)' }}
      >
        <Lightbulb size={16} style={{ color: '#14b8a6', flexShrink: 0, marginTop: 2 }} />
        <div>
          <p className="text-sm font-medium" style={{ color: '#14b8a6' }}>Self-Reinforcing Loop</p>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: '#5a5a72' }}>
            Pass 1b uses the existing graph as a retrieval index — no vectors, no embeddings, zero API cost.
            As you add more notes, the graph grows, which makes Pass 1b find better related notes,
            which makes Pass 2 discover richer relationships. The system gets smarter with every note.
          </p>
        </div>
      </div>
    </Section>
  )
}

// ─── AGENT CARDS ─────────────────────────────────────────────────────────────

const AGENTS = [
  {
    name: 'Graph Agent',
    icon: GitFork,
    color: '#8b5cf6',
    model: 'claude-haiku-4-5',
    trigger: '2s after note save',
    tools: ['extract_entities', 'extract_relationships'],
    passes: [
      'Pass 1: Extract entities with rich metadata (role, org, status)',
      'Pass 1b: Local graph index lookup — finds related notes (FREE)',
      'Pass 2: Discover relationships, shared concepts, contradictions',
    ],
    output: 'Graph nodes, edges, tensions',
  },
  {
    name: 'Context Agent',
    icon: Eye,
    color: '#f59e0b',
    model: 'claude-haiku-4-5',
    trigger: 'After entity upsert (30s debounce)',
    tools: ['update_project_context'],
    passes: [
      'Reads current summary + triggering note + last 3 mentions',
      'Generates ≤100-word living brief of current state',
      'Extracts open questions and blockers (max 5 each)',
    ],
    output: 'EntityMetadata: summary, openQuestions, blockers',
  },
  {
    name: 'Reminder Agent',
    icon: Bell,
    color: '#f43f5e',
    model: 'claude-haiku-4-5',
    trigger: '2s after note save',
    tools: ['extract_reminders'],
    passes: [
      'Scans note for temporal language and action items',
      'Parses dates to ISO 8601 (supports natural language)',
      'Assigns priority: high (urgent/today), medium (this week), low (someday)',
    ],
    output: 'Reminders with action, date, person, type, priority',
  },
  {
    name: 'Sieve Agent',
    icon: Filter,
    color: '#8b5cf6',
    model: 'claude-haiku-4-5',
    trigger: 'Manual (brain dump submit)',
    tools: ['parse_brain_dump'],
    passes: [
      'Takes raw stream-of-consciousness text input',
      'Categorizes every thought into exactly one bucket',
      'Preserves user voice for incubating ideas, cleans up actions',
    ],
    output: '4 buckets: actionable, incubating, questions, emotional',
  },
]

function AgentCards() {
  return (
    <Section id="agents">
      <SectionTitle sub="Four specialized AI agents work in the background">Agent System</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AGENTS.map((agent, i) => {
          const Icon = agent.icon
          return (
            <div
              key={i}
              className="rounded-xl border p-5"
              style={{ background: '#131315', borderColor: '#2e2e35' }}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="flex items-center justify-center rounded-lg"
                  style={{ width: 36, height: 36, background: `${agent.color}15` }}
                >
                  <Icon size={18} style={{ color: agent.color }} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: '#e8e8f0' }}>{agent.name}</h3>
                  <p className="text-xs" style={{ color: '#5a5a72' }}>{agent.trigger}</p>
                </div>
              </div>

              {/* Model + Tools */}
              <div className="flex flex-wrap gap-2 mb-3">
                <span
                  className="text-xs rounded-full px-2 py-0.5 font-mono"
                  style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.2)' }}
                >
                  {agent.model}
                </span>
                {agent.tools.map(tool => (
                  <span
                    key={tool}
                    className="text-xs rounded-full px-2 py-0.5 font-mono"
                    style={{ background: 'rgba(20,184,166,0.1)', color: '#14b8a6', border: '1px solid rgba(20,184,166,0.2)' }}
                  >
                    {tool}
                  </span>
                ))}
              </div>

              {/* Passes */}
              <div className="flex flex-col gap-1.5 mb-3">
                {agent.passes.map((pass, j) => (
                  <div key={j} className="flex items-start gap-2">
                    <ChevronRight size={12} style={{ color: agent.color, flexShrink: 0, marginTop: 3 }} />
                    <span className="text-xs leading-relaxed" style={{ color: '#9090a8' }}>{pass}</span>
                  </div>
                ))}
              </div>

              {/* Output */}
              <div
                className="rounded-lg px-3 py-2 text-xs"
                style={{ background: 'rgba(0,0,0,0.3)', color: '#5a5a72' }}
              >
                <span className="font-medium" style={{ color: '#9090a8' }}>Output:</span> {agent.output}
              </div>
            </div>
          )
        })}
      </div>
    </Section>
  )
}

// ─── KNOWLEDGE GRAPH SECTION ─────────────────────────────────────────────────

function GraphSection() {
  const nodeTypes = [
    { type: 'Note', color: '#8b5cf6', desc: 'Your captured thoughts' },
    { type: 'Person', color: '#14b8a6', desc: 'People mentioned in notes' },
    { type: 'Project', color: '#f59e0b', desc: 'Initiatives and work items' },
    { type: 'Organization', color: '#14b8a6', desc: 'Companies and teams' },
    { type: 'Concept', color: '#9090a8', desc: 'Ideas and themes' },
    { type: 'Technology', color: '#f43f5e', desc: 'Tools and frameworks' },
  ]

  const edgeTypes = [
    { type: 'contains', desc: 'Note → Entity', example: 'Note mentions a person', style: 'solid' },
    { type: 'related_to', desc: 'Entity ↔ Entity', example: '"works at", "founded"', style: 'solid' },
    { type: 'shares_concept', desc: 'Note ↔ Note', example: 'Thematic bridges across notes', style: 'dashed' },
  ]

  return (
    <Section id="graph">
      <SectionTitle sub="Automatic entity extraction and relationship discovery">Knowledge Graph</SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Node types */}
        <div className="rounded-xl border p-5" style={{ background: '#131315', borderColor: '#2e2e35' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: '#e8e8f0' }}>Node Types</h3>
          <div className="flex flex-col gap-2.5">
            {nodeTypes.map(n => (
              <div key={n.type} className="flex items-center gap-3">
                <div
                  className="rounded-full flex-shrink-0"
                  style={{ width: 10, height: 10, background: n.color, boxShadow: `0 0 8px ${n.color}40` }}
                />
                <span className="text-sm font-medium" style={{ color: n.color, minWidth: 90 }}>{n.type}</span>
                <span className="text-xs" style={{ color: '#5a5a72' }}>{n.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Edge types */}
        <div className="rounded-xl border p-5" style={{ background: '#131315', borderColor: '#2e2e35' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: '#e8e8f0' }}>Edge Types</h3>
          <div className="flex flex-col gap-3">
            {edgeTypes.map(e => (
              <div key={e.type} className="flex items-start gap-3">
                <div
                  className="mt-1.5 flex-shrink-0"
                  style={{
                    width: 24,
                    height: 2,
                    background: '#8b5cf6',
                    borderStyle: e.style === 'dashed' ? 'dashed' : 'solid',
                  }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-medium" style={{ color: '#14b8a6' }}>{e.type}</span>
                    <span className="text-xs" style={{ color: '#5a5a72' }}>{e.desc}</span>
                  </div>
                  <span className="text-xs" style={{ color: '#3d3d47' }}>{e.example}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Metadata */}
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid #2e2e35' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: '#9090a8' }}>Entity Metadata (AI-extracted)</h4>
            <div className="flex flex-wrap gap-1.5">
              {['role', 'organization', 'relationship', 'keyFact', 'status', 'blockers', 'stakeholders', 'summary'].map(f => (
                <span
                  key={f}
                  className="text-xs rounded px-1.5 py-0.5 font-mono"
                  style={{ background: '#1a1a1d', color: '#5a5a72', border: '1px solid #2e2e35' }}
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}

// ─── AI CHAT ARCHITECTURE ────────────────────────────────────────────────────

function ChatArchitecture() {
  const contextLayers = [
    { label: 'Notes Context', desc: 'Top 10 notes sorted by decay score', color: '#8b5cf6', icon: Layers },
    { label: 'Project Briefs', desc: 'AI-maintained summaries of active projects', color: '#f59e0b', icon: Briefcase },
    { label: 'Tensions', desc: 'Unresolved contradictions to surface proactively', color: '#f43f5e', icon: AlertTriangle },
    { label: 'Active Blockers', desc: 'Dependency context for critical path analysis', color: '#14b8a6', icon: Zap },
    { label: 'Thread History', desc: 'Recent conversation threads for context restoration', color: '#9090a8', icon: MessageSquare },
  ]

  const behaviors = [
    { name: 'Dependency Resolution', desc: 'Detects blocker language, surfaces immediate bottleneck', icon: Zap, color: '#14b8a6' },
    { name: 'Thread Forking', desc: 'Captures tangent ideas mid-conversation, returns to main topic', icon: GitFork, color: '#f59e0b' },
    { name: 'Context Restoration', desc: '"Where was I?" → 2-sentence ramp-up + next step', icon: Clock, color: '#8b5cf6' },
    { name: 'Socratic Unblocking', desc: '5 Whys, Constraint Forcing, Inversion, Smallest Step', icon: HelpCircle, color: '#f43f5e' },
  ]

  return (
    <Section id="chat">
      <SectionTitle sub="Socratic questioning with rich context injection">AI Chat Architecture</SectionTitle>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Context layers */}
        <div className="rounded-xl border p-5" style={{ background: '#131315', borderColor: '#2e2e35' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: '#e8e8f0' }}>
            Context Injection Layers
          </h3>
          <p className="text-xs mb-4 leading-relaxed" style={{ color: '#5a5a72' }}>
            Every message to the AI includes these context layers in the system prompt,
            giving it awareness of your entire knowledge base:
          </p>
          <div className="flex flex-col gap-2">
            {contextLayers.map((layer, i) => {
              const Icon = layer.icon
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg px-3 py-2"
                  style={{ background: `${layer.color}08`, border: `1px solid ${layer.color}15` }}
                >
                  <Icon size={14} style={{ color: layer.color, flexShrink: 0 }} />
                  <div>
                    <span className="text-xs font-medium" style={{ color: layer.color }}>{layer.label}</span>
                    <span className="text-xs ml-2" style={{ color: '#5a5a72' }}>{layer.desc}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Chat behaviors */}
        <div className="rounded-xl border p-5" style={{ background: '#131315', borderColor: '#2e2e35' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: '#e8e8f0' }}>
            Intelligent Behaviors
          </h3>
          <div className="flex flex-col gap-3">
            {behaviors.map((b, i) => {
              const Icon = b.icon
              return (
                <div key={i} className="flex items-start gap-3">
                  <div
                    className="flex items-center justify-center rounded-lg flex-shrink-0"
                    style={{ width: 28, height: 28, background: `${b.color}15` }}
                  >
                    <Icon size={14} style={{ color: b.color }} />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium" style={{ color: '#e8e8f0' }}>{b.name}</h4>
                    <p className="text-xs mt-0.5" style={{ color: '#5a5a72' }}>{b.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Decay formula */}
          <div
            className="mt-4 rounded-lg px-4 py-3"
            style={{ background: '#0c0c0d', border: '1px solid #2e2e35' }}
          >
            <p className="text-xs font-medium mb-1" style={{ color: '#9090a8' }}>Time-Decay Relevance</p>
            <code
              className="text-sm"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: '#14b8a6' }}
            >
              score = (1 + connections) × e<sup>−0.05 × days</sup>
            </code>
            <p className="text-xs mt-2" style={{ color: '#5a5a72' }}>
              Half-life ~14 days. Notes with more graph connections decay slower.
              Recent, well-connected notes surface first in chat context.
            </p>
          </div>
        </div>
      </div>
    </Section>
  )
}

// ─── STATE MANAGEMENT ────────────────────────────────────────────────────────

function StateManagement() {
  const stores = [
    { name: 'notesStore', key: 'midwicket-notes', desc: 'All notes + triggers agent analysis', color: '#8b5cf6', persisted: true },
    { name: 'graphStore', key: 'midwicket-graph', desc: 'Knowledge graph nodes, edges, positions', color: '#14b8a6', persisted: true },
    { name: 'remindersStore', key: 'midwicket-reminders', desc: 'Tasks, events, deadlines', color: '#f43f5e', persisted: true },
    { name: 'tensionsStore', key: 'midwicket-tensions', desc: 'Detected contradictions', color: '#f59e0b', persisted: true },
    { name: 'sieveStore', key: 'midwicket-sieve', desc: 'Brain dump results', color: '#8b5cf6', persisted: true },
    { name: 'threadStore', key: 'midwicket-threads', desc: 'Chat threads + forked ideas', color: '#14b8a6', persisted: true },
    { name: 'chatStore', key: '—', desc: 'Chat messages (session-only)', color: '#9090a8', persisted: false },
    { name: 'uiStore', key: '—', desc: 'View state, sidebar, active note', color: '#9090a8', persisted: false },
  ]

  return (
    <Section id="state">
      <SectionTitle sub="Zustand v5 with persist middleware — all data in localStorage">State Management</SectionTitle>
      <div className="rounded-xl border overflow-hidden" style={{ background: '#131315', borderColor: '#2e2e35' }}>
        {/* Header */}
        <div className="grid grid-cols-4 gap-4 px-5 py-3 text-xs font-medium" style={{ color: '#5a5a72', borderBottom: '1px solid #2e2e35' }}>
          <span>Store</span>
          <span>localStorage Key</span>
          <span>Purpose</span>
          <span>Persisted</span>
        </div>
        {stores.map((s, i) => (
          <div
            key={i}
            className="grid grid-cols-4 gap-4 px-5 py-2.5 text-xs items-center"
            style={{ borderBottom: i < stores.length - 1 ? '1px solid #1a1a1d' : 'none' }}
          >
            <span className="font-mono font-medium" style={{ color: s.color }}>{s.name}</span>
            <span className="font-mono" style={{ color: '#5a5a72' }}>{s.key}</span>
            <span style={{ color: '#9090a8' }}>{s.desc}</span>
            <span>
              {s.persisted ? (
                <span className="text-xs rounded px-1.5 py-0.5" style={{ background: 'rgba(20,184,166,0.1)', color: '#14b8a6' }}>yes</span>
              ) : (
                <span className="text-xs rounded px-1.5 py-0.5" style={{ background: 'rgba(90,90,114,0.1)', color: '#5a5a72' }}>session</span>
              )}
            </span>
          </div>
        ))}
      </div>

      <div
        className="mt-4 rounded-xl border px-5 py-4 flex items-start gap-3"
        style={{ background: 'rgba(139,92,246,0.06)', borderColor: 'rgba(139,92,246,0.15)' }}
      >
        <Database size={16} style={{ color: '#8b5cf6', flexShrink: 0, marginTop: 2 }} />
        <div>
          <p className="text-sm font-medium" style={{ color: '#8b5cf6' }}>Local-First Architecture</p>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: '#5a5a72' }}>
            All data lives in the browser. No backend, no account, no sync — your thoughts stay on your machine.
            Agents use <code style={{ fontFamily: "'JetBrains Mono'", color: '#14b8a6' }}>useStore.getState()</code> outside
            React and dynamic <code style={{ fontFamily: "'JetBrains Mono'", color: '#14b8a6' }}>import()</code> to avoid circular dependencies.
          </p>
        </div>
      </div>
    </Section>
  )
}

// ─── TECH STACK ──────────────────────────────────────────────────────────────

function TechStack() {
  const stack = [
    { name: 'React 19', desc: 'UI framework', color: '#8b5cf6' },
    { name: 'Vite 7', desc: 'Build tool', color: '#f59e0b' },
    { name: 'TypeScript', desc: 'Type safety', color: '#14b8a6' },
    { name: 'Tailwind CSS v4', desc: 'Utility-first styling', color: '#8b5cf6' },
    { name: 'Zustand v5', desc: 'State management', color: '#f59e0b' },
    { name: 'TipTap v3', desc: 'Rich text editor', color: '#14b8a6' },
    { name: 'React Flow 11', desc: 'Graph visualization', color: '#8b5cf6' },
    { name: 'd3-force', desc: 'Physics simulation', color: '#f59e0b' },
    { name: 'Anthropic SDK', desc: 'AI integration', color: '#14b8a6' },
    { name: 'Lucide React', desc: 'Icon system', color: '#8b5cf6' },
  ]

  return (
    <Section id="tech">
      <SectionTitle sub="Carefully chosen for capture speed and semantic intelligence">Tech Stack</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {stack.map((s, i) => (
          <div
            key={i}
            className="rounded-xl border px-4 py-3 text-center"
            style={{ background: '#131315', borderColor: '#2e2e35' }}
          >
            <p className="text-sm font-semibold" style={{ color: s.color }}>{s.name}</p>
            <p className="text-xs mt-0.5" style={{ color: '#5a5a72' }}>{s.desc}</p>
          </div>
        ))}
      </div>

      {/* AI Models */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border px-5 py-4" style={{ background: '#131315', borderColor: '#2e2e35' }}>
          <div className="flex items-center gap-2 mb-2">
            <Bot size={16} style={{ color: '#14b8a6' }} />
            <span className="text-sm font-semibold" style={{ color: '#e8e8f0' }}>Chat Model</span>
          </div>
          <code className="text-sm font-mono" style={{ color: '#14b8a6' }}>claude-sonnet-4-6</code>
          <p className="text-xs mt-1" style={{ color: '#5a5a72' }}>Streaming, conversational AI for the Thinking Partner</p>
        </div>
        <div className="rounded-xl border px-5 py-4" style={{ background: '#131315', borderColor: '#2e2e35' }}>
          <div className="flex items-center gap-2 mb-2">
            <Cpu size={16} style={{ color: '#8b5cf6' }} />
            <span className="text-sm font-semibold" style={{ color: '#e8e8f0' }}>Agent Model</span>
          </div>
          <code className="text-sm font-mono" style={{ color: '#8b5cf6' }}>claude-haiku-4-5</code>
          <p className="text-xs mt-1" style={{ color: '#5a5a72' }}>Tool-use, non-streaming — optimized for speed and cost</p>
        </div>
      </div>
    </Section>
  )
}

// ─── DESIGN SYSTEM ───────────────────────────────────────────────────────────

function DesignSystemSection() {
  const surfaces = [
    { name: 'Surface 0', value: '#0c0c0d', desc: 'Page background' },
    { name: 'Surface 1', value: '#131315', desc: 'Panels, headers' },
    { name: 'Surface 2', value: '#1a1a1d', desc: 'Cards, editors' },
    { name: 'Surface 3', value: '#222226', desc: 'Hover states' },
    { name: 'Surface 4', value: '#2a2a2f', desc: 'Emphasis' },
  ]

  const accents = [
    { name: 'Purple', value: '#8b5cf6', desc: 'Primary accent' },
    { name: 'Teal', value: '#14b8a6', desc: 'Secondary, entities' },
    { name: 'Amber', value: '#f59e0b', desc: 'Warning, tertiary' },
    { name: 'Rose', value: '#f43f5e', desc: 'Error, destructive' },
  ]

  const text = [
    { name: 'Primary', value: '#e8e8f0', desc: 'Main content' },
    { name: 'Secondary', value: '#9090a8', desc: 'Less emphasis' },
    { name: 'Muted', value: '#5a5a72', desc: 'Very low emphasis' },
  ]

  return (
    <Section id="design">
      <SectionTitle sub="Dark-first design language with semantic color coding">Design System</SectionTitle>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Surfaces */}
        <div className="rounded-xl border p-5" style={{ background: '#131315', borderColor: '#2e2e35' }}>
          <div className="flex items-center gap-2 mb-4">
            <Palette size={16} style={{ color: '#8b5cf6' }} />
            <h3 className="text-sm font-semibold" style={{ color: '#e8e8f0' }}>Surfaces</h3>
          </div>
          <div className="flex flex-col gap-2">
            {surfaces.map(s => (
              <div key={s.name} className="flex items-center gap-3">
                <div
                  className="rounded flex-shrink-0"
                  style={{ width: 32, height: 20, background: s.value, border: '1px solid #2e2e35' }}
                />
                <div>
                  <span className="text-xs font-mono" style={{ color: '#e8e8f0' }}>{s.value}</span>
                  <span className="text-xs ml-2" style={{ color: '#5a5a72' }}>{s.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Accents */}
        <div className="rounded-xl border p-5" style={{ background: '#131315', borderColor: '#2e2e35' }}>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} style={{ color: '#14b8a6' }} />
            <h3 className="text-sm font-semibold" style={{ color: '#e8e8f0' }}>Accents</h3>
          </div>
          <div className="flex flex-col gap-3">
            {accents.map(a => (
              <div key={a.name} className="flex items-center gap-3">
                <div
                  className="rounded-full flex-shrink-0"
                  style={{ width: 20, height: 20, background: a.value, boxShadow: `0 0 10px ${a.value}40` }}
                />
                <div>
                  <span className="text-xs font-medium" style={{ color: a.value }}>{a.name}</span>
                  <span className="text-xs ml-2 font-mono" style={{ color: '#5a5a72' }}>{a.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Typography */}
        <div className="rounded-xl border p-5" style={{ background: '#131315', borderColor: '#2e2e35' }}>
          <div className="flex items-center gap-2 mb-4">
            <Type size={16} style={{ color: '#f59e0b' }} />
            <h3 className="text-sm font-semibold" style={{ color: '#e8e8f0' }}>Typography</h3>
          </div>

          <div className="mb-4">
            <p className="text-xs mb-1" style={{ color: '#5a5a72' }}>UI Font</p>
            <p className="text-lg font-semibold" style={{ fontFamily: "'Inter', sans-serif", color: '#e8e8f0' }}>
              Inter
            </p>
            <p className="text-xs" style={{ color: '#9090a8' }}>300 · 400 · 500 · 600 · 700</p>
          </div>

          <div className="mb-4">
            <p className="text-xs mb-1" style={{ color: '#5a5a72' }}>Code Font</p>
            <p className="text-lg font-medium" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#14b8a6' }}>
              JetBrains Mono
            </p>
            <p className="text-xs" style={{ color: '#9090a8' }}>400 · 500</p>
          </div>

          <div>
            <p className="text-xs mb-2" style={{ color: '#5a5a72' }}>Text Hierarchy</p>
            {text.map(t => (
              <p key={t.name} className="text-sm mb-1" style={{ color: t.value }}>
                {t.name} <span className="font-mono text-xs">({t.value})</span>
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Component patterns */}
      <div className="mt-4 rounded-xl border p-5" style={{ background: '#131315', borderColor: '#2e2e35' }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: '#e8e8f0' }}>Component Patterns</h3>
        <div className="flex flex-wrap gap-3 items-center">
          {/* Badge */}
          <span className="text-xs rounded-full px-2 py-0.5 font-medium" style={{ background: 'rgba(139,92,246,0.2)', color: '#8b5cf6' }}>Badge</span>
          <span className="text-xs rounded-full px-2 py-0.5 font-medium" style={{ background: 'rgba(20,184,166,0.15)', color: '#14b8a6' }}>Entity</span>
          <span className="text-xs rounded-full px-2 py-0.5 font-medium" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>Warning</span>
          <span className="text-xs rounded-full px-2 py-0.5 font-medium" style={{ background: 'rgba(244,63,94,0.15)', color: '#f43f5e' }}>Alert</span>

          {/* Status dots */}
          <div className="flex items-center gap-1.5 ml-4">
            <div className="rounded-full" style={{ width: 8, height: 8, background: '#14b8a6', boxShadow: '0 0 6px rgba(20,184,166,0.5)' }} />
            <span className="text-xs" style={{ color: '#9090a8' }}>Active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="rounded-full" style={{ width: 8, height: 8, background: '#f59e0b', boxShadow: '0 0 6px rgba(245,158,11,0.5)' }} />
            <span className="text-xs" style={{ color: '#9090a8' }}>Planning</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="rounded-full" style={{ width: 8, height: 8, background: '#5a5a72' }} />
            <span className="text-xs" style={{ color: '#9090a8' }}>Completed</span>
          </div>

          {/* Tag pill */}
          <span
            className="ml-4 text-xs rounded-full px-2 py-0.5"
            style={{ background: '#1a1a1d', color: '#9090a8', border: '1px solid #2e2e35' }}
          >
            #tag-pill
          </span>

          {/* Code inline */}
          <code
            className="text-xs rounded px-1.5 py-0.5"
            style={{ fontFamily: "'JetBrains Mono'", background: '#1a1a1d', color: '#14b8a6', border: '1px solid #2e2e35' }}
          >
            inline code
          </code>
        </div>
      </div>
    </Section>
  )
}

// ─── SIEVE SECTION ───────────────────────────────────────────────────────────

function SieveSection() {
  const buckets = [
    { name: 'Actionable Next Steps', icon: Zap, color: '#8b5cf6', example: '"Schedule call with Sarah about Q3 numbers"' },
    { name: 'Incubating Ideas', icon: Lightbulb, color: '#f59e0b', example: '"What if we used webhooks for real-time sync?"' },
    { name: 'Open Questions', icon: HelpCircle, color: '#14b8a6', example: '"Do we need SOC 2 before the enterprise launch?"' },
    { name: 'Emotional Offload', icon: Heart, color: '#f43f5e', example: '"Frustrated that the timeline keeps shifting"' },
  ]

  return (
    <Section id="sieve">
      <SectionTitle sub="Stream-of-consciousness → structured clarity">Cognitive Sieve</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {buckets.map((b, i) => {
          const Icon = b.icon
          return (
            <div
              key={i}
              className="rounded-xl border p-4"
              style={{ background: `${b.color}08`, borderColor: `${b.color}20` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon size={16} style={{ color: b.color }} />
                <span className="text-xs font-semibold" style={{ color: b.color }}>{b.name}</span>
              </div>
              <p className="text-xs italic leading-relaxed" style={{ color: '#5a5a72' }}>{b.example}</p>
            </div>
          )
        })}
      </div>
      <div className="mt-3 text-xs text-center" style={{ color: '#3d3d47' }}>
        Every item can be converted to a full note with one click. Emotional offload is acknowledged, not dismissed.
      </div>
    </Section>
  )
}

// ─── FOOTER ──────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <div className="text-center py-16 px-6">
      <div
        className="mx-auto mb-6"
        style={{ width: 40, height: 1, background: 'linear-gradient(90deg, #8b5cf6, #14b8a6)' }}
      />
      <p className="text-sm font-medium mb-2" style={{ color: '#9090a8' }}>
        Process, don't manage. Mirror, don't direct.
      </p>
      <p className="text-xs" style={{ color: '#3d3d47' }}>
        Built with the Midwicket philosophy: preserve cognitive ownership.
      </p>
      <a
        href="/"
        className="inline-flex items-center gap-2 mt-6 rounded-xl px-5 py-2.5 text-sm font-medium transition-all"
        style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.2)' }}
      >
        <Brain size={16} /> Open Midwicket
      </a>
    </div>
  )
}

// ─── NAV ─────────────────────────────────────────────────────────────────────

function Nav() {
  const links = [
    { label: 'Features', href: '#features' },
    { label: 'Data Flow', href: '#dataflow' },
    { label: 'Agents', href: '#agents' },
    { label: 'Graph', href: '#graph' },
    { label: 'Chat', href: '#chat' },
    { label: 'State', href: '#state' },
    { label: 'Tech', href: '#tech' },
    { label: 'Design', href: '#design' },
  ]

  return (
    <nav
      className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b backdrop-blur-md"
      style={{ background: 'rgba(12,12,13,0.85)', borderColor: '#2e2e35' }}
    >
      <a href="/" className="flex items-center gap-2">
        <div
          className="flex items-center justify-center rounded-lg"
          style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #8b5cf6, #14b8a6)' }}
        >
          <Brain size={14} color="white" />
        </div>
        <span className="text-sm font-semibold" style={{ color: '#e8e8f0' }}>Midwicket</span>
      </a>
      <div className="hidden md:flex items-center gap-1">
        {links.map(l => (
          <a
            key={l.href}
            href={l.href}
            className="rounded-lg px-2.5 py-1.5 text-xs transition-colors"
            style={{ color: '#5a5a72' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#e8e8f0'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#5a5a72'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            {l.label}
          </a>
        ))}
      </div>
    </nav>
  )
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────

export default function ArchitecturePage() {
  return (
    <div style={{ background: '#0c0c0d', minHeight: '100vh' }}>
      <style>{`
        @keyframes pulse {
          0% { opacity: 0.7; }
          100% { opacity: 1; }
        }
        html { scroll-behavior: smooth; }
      `}</style>

      <Nav />
      <Hero />

      <div className="max-w-5xl mx-auto px-6">
        <FeatureGrid />
        <Divider />
        <DataFlow />
        <Divider />
        <AgentCards />
        <Divider />
        <GraphSection />
        <Divider />
        <SieveSection />
        <Divider />
        <ChatArchitecture />
        <Divider />
        <StateManagement />
        <Divider />
        <TechStack />
        <Divider />
        <DesignSystemSection />
      </div>

      <Footer />
    </div>
  )
}
