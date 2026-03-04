import { useEffect, useRef, useState } from 'react'
import {
  Brain, Sparkles, GitFork, Users, Bell, Filter, Bot,
  MessageSquare, Zap, ArrowUpRight, ChevronRight,
  Lightbulb, HelpCircle, Heart, AlertTriangle, Clock, Eye,
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════════════
   HOOKS
   ═══════════════════════════════════════════════════════════════════════════ */

function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add('revealed'); obs.unobserve(el) } },
      { threshold },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return ref
}

function useActiveSection(ids: string[]) {
  const [active, setActive] = useState('')
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id) }),
      { rootMargin: '-40% 0px -55% 0px' },
    )
    ids.forEach(id => { const el = document.getElementById(id); if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [ids])
  return active
}

/* ═══════════════════════════════════════════════════════════════════════════
   PRIMITIVES
   ═══════════════════════════════════════════════════════════════════════════ */

function Reveal({ children, className = '', delay = 0, id }: {
  children: React.ReactNode; className?: string; delay?: number; id?: string
}) {
  const ref = useReveal()
  return (
    <div
      ref={ref}
      id={id}
      className={`reveal-up ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wide uppercase rounded-full px-3 py-1"
      style={{ color, background: `color-mix(in srgb, ${color} 10%, transparent)` }}
    >
      {children}
    </span>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   NAV
   ═══════════════════════════════════════════════════════════════════════════ */

const NAV_SECTIONS = ['features', 'flow', 'agents', 'graph', 'chat', 'stack']

function Nav() {
  const active = useActiveSection(NAV_SECTIONS)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const labels: Record<string, string> = {
    features: 'Features',
    flow: 'How It Works',
    agents: 'Agents',
    graph: 'Graph',
    chat: 'AI Chat',
    stack: 'Stack',
  }

  return (
    <nav
      className="fixed top-0 inset-x-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(12,12,13,0.7)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px) saturate(1.4)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(1.4)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.04)' : '1px solid transparent',
      }}
    >
      <div className="max-w-[1200px] mx-auto flex items-center justify-between h-14 px-6">
        <a href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#8b5cf6] to-[#14b8a6] transition-transform group-hover:scale-110">
            <Brain size={14} color="white" strokeWidth={2} />
          </div>
          <span className="text-[13px] font-semibold text-white/90">Midwicket</span>
        </a>

        <div className="hidden md:flex items-center gap-1">
          {NAV_SECTIONS.map(id => (
            <a
              key={id}
              href={`#${id}`}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200"
              style={{
                color: active === id ? '#fff' : 'rgba(255,255,255,0.35)',
                background: active === id ? 'rgba(255,255,255,0.06)' : 'transparent',
              }}
            >
              {labels[id]}
            </a>
          ))}
        </div>

        <a
          href="/"
          className="text-[12px] font-medium text-white/70 hover:text-white flex items-center gap-1 transition-colors"
        >
          Open App <ArrowUpRight size={11} />
        </a>
      </div>
    </nav>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   HERO — full screen, cinematic, minimal
   ═══════════════════════════════════════════════════════════════════════════ */

function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Mesh gradient blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="hero-blob hero-blob-1" />
        <div className="hero-blob hero-blob-2" />
        <div className="hero-blob hero-blob-3" />
        {/* Noise grain */}
        <div className="absolute inset-0 noise-overlay" />
      </div>

      <div className="relative z-10 text-center px-6 max-w-3xl">
        <Reveal>
          <Badge color="#8b5cf6">Architecture & Design</Badge>
        </Reveal>

        <Reveal delay={100}>
          <h1 className="mt-8 text-[clamp(2.8rem,7vw,5.5rem)] font-bold leading-[1.05] tracking-[-0.035em] text-white">
            Your brain,<br />
            <span className="hero-gradient-text">extended.</span>
          </h1>
        </Reveal>

        <Reveal delay={200}>
          <p className="mt-6 text-[clamp(1rem,2vw,1.2rem)] leading-relaxed text-white/40 max-w-xl mx-auto">
            Midwicket captures thoughts, builds a knowledge graph, detects contradictions, and asks you the right questions. Not an assistant — a thinking partner.
          </p>
        </Reveal>

        <Reveal delay={300}>
          <div className="mt-10 flex items-center justify-center gap-3">
            <a
              href="/"
              className="h-10 px-5 rounded-xl text-[13px] font-medium text-white bg-[#8b5cf6] hover:bg-[#7c4deb] inline-flex items-center gap-2 transition-colors"
            >
              Open Midwicket <ChevronRight size={13} />
            </a>
            <a
              href="#features"
              className="h-10 px-5 rounded-xl text-[13px] font-medium text-white/50 hover:text-white/80 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] inline-flex items-center gap-2 transition-all"
            >
              Explore
            </a>
          </div>
        </Reveal>
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-8 flex flex-col items-center gap-2 opacity-30">
        <div className="w-[1px] h-8 bg-gradient-to-b from-transparent to-white/40" />
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   FEATURES — bento grid with varied sizes
   ═══════════════════════════════════════════════════════════════════════════ */

function Features() {
  const items = [
    { icon: Sparkles, title: 'Zero-Friction Capture', desc: 'Every thought flows to one inbox. Auto-titles, hashtags, word counts. Capture now, organize never.', color: '#8b5cf6', size: 'large' as const },
    { icon: GitFork, title: 'Knowledge Graph', desc: 'Two-pass AI extracts entities and discovers cross-note relationships. Grows smarter with every note.', color: '#14b8a6', size: 'large' as const },
    { icon: Brain, title: 'Active Intelligence', desc: 'Living project briefs. Contradiction detection. Time-decay relevance.', color: '#f59e0b', size: 'small' as const },
    { icon: Users, title: 'People & Work', desc: 'Automatic CRM from your notes — roles, orgs, status, blockers.', color: '#14b8a6', size: 'small' as const },
    { icon: Bell, title: 'Temporal Awareness', desc: 'Tasks and deadlines extracted from natural language, grouped by urgency.', color: '#f43f5e', size: 'small' as const },
    { icon: Filter, title: 'Cognitive Sieve', desc: 'Brain dump mode — AI sorts chaos into actionable, incubating, questions, emotional.', color: '#8b5cf6', size: 'small' as const },
    { icon: Bot, title: 'Thinking Partner', desc: 'Socratic AI that asks questions, not answers. Injects your full context — notes, projects, tensions, blockers.', color: '#14b8a6', size: 'large' as const },
    { icon: MessageSquare, title: 'Thread Intelligence', desc: 'Detects topic switches, saves tangent ideas, restores context. Socratic unblocking when you\'re stuck.', color: '#f59e0b', size: 'large' as const },
  ]

  return (
    <section id="features" className="py-32 md:py-40">
      <div className="max-w-[1200px] mx-auto px-6">
        <Reveal>
          <Badge color="#8b5cf6">Features</Badge>
          <h2 className="mt-4 text-[clamp(1.8rem,4vw,3rem)] font-bold tracking-tight text-white leading-tight">
            Eight pillars of<br />cognitive offload
          </h2>
          <p className="mt-3 text-white/30 text-[15px] max-w-md">
            Each system works independently and reinforces the others. Together they reduce the distance between thought and structured knowledge.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-4 gap-3">
          {items.map((item, i) => {
            const Icon = item.icon
            const span = item.size === 'large' ? 'md:col-span-2' : 'md:col-span-1'
            return (
              <Reveal key={i} delay={i * 60} className={span}>
                <div className="bento-card group h-full">
                  <div className="flex items-start gap-4 p-5 md:p-6">
                    <div
                      className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
                      style={{ background: `color-mix(in srgb, ${item.color} 12%, transparent)` }}
                    >
                      <Icon size={17} style={{ color: item.color }} strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[14px] font-semibold text-white/90 mb-1">{item.title}</h3>
                      <p className="text-[13px] leading-relaxed text-white/30">{item.desc}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOW IT WORKS — horizontal pipeline
   ═══════════════════════════════════════════════════════════════════════════ */

function HowItWorks() {
  const steps = [
    {
      num: '01',
      title: 'Capture',
      desc: 'Write or paste any thought. No formatting, no folders, no friction.',
      detail: 'Auto-generated titles, hashtag extraction, word counts. Every note lands in a single inbox.',
      color: '#8b5cf6',
    },
    {
      num: '02',
      title: 'Process',
      desc: 'AI agents analyze in the background — entities, relationships, reminders, contradictions.',
      detail: 'Two-pass graph extraction, temporal parsing, living project briefs. All in 2-3 seconds.',
      color: '#14b8a6',
    },
    {
      num: '03',
      title: 'Think',
      desc: 'Chat with a Socratic AI that knows your full context and asks the right questions.',
      detail: 'Time-decay relevance, dependency resolution, thread forking, context restoration.',
      color: '#f59e0b',
    },
  ]

  return (
    <section id="flow" className="py-32 md:py-40 relative">
      {/* Subtle bg accent */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(ellipse, #8b5cf6, transparent 70%)' }} />
      </div>

      <div className="max-w-[1200px] mx-auto px-6 relative">
        <Reveal>
          <Badge color="#14b8a6">How It Works</Badge>
          <h2 className="mt-4 text-[clamp(1.8rem,4vw,3rem)] font-bold tracking-tight text-white leading-tight">
            Capture → Process → Think
          </h2>
          <p className="mt-3 text-white/30 text-[15px] max-w-lg">
            A note goes from raw thought to structured knowledge in seconds — then powers your AI thinking partner.
          </p>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-0">
          {steps.map((step, i) => (
            <Reveal key={i} delay={i * 120}>
              <div className="relative md:pr-8">
                {/* Connector line */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-10 right-0 w-8 h-[1px]" style={{ background: `linear-gradient(90deg, ${step.color}30, ${steps[i + 1].color}30)` }} />
                )}

                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[11px] font-mono font-bold tracking-wider" style={{ color: step.color }}>{step.num}</span>
                  <div className="h-[1px] w-6" style={{ background: step.color, opacity: 0.3 }} />
                </div>

                <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                <p className="text-[14px] text-white/40 leading-relaxed mb-3">{step.desc}</p>
                <p className="text-[12px] text-white/20 leading-relaxed">{step.detail}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   DATA PIPELINE — visual architecture
   ═══════════════════════════════════════════════════════════════════════════ */

function Pipeline() {
  return (
    <section className="py-20 md:py-28">
      <div className="max-w-[1200px] mx-auto px-6">
        <Reveal>
          <div className="pipeline-card rounded-2xl border border-white/[0.04] p-8 md:p-12 relative overflow-hidden">
            {/* Subtle gradient bg */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#8b5cf6]/[0.02] via-transparent to-[#14b8a6]/[0.02]" />

            <div className="relative z-10">
              <Badge color="#f59e0b">Under The Hood</Badge>
              <h3 className="mt-4 text-[clamp(1.4rem,3vw,2rem)] font-bold text-white tracking-tight">
                What happens when you save a note
              </h3>
              <p className="mt-2 text-[14px] text-white/30 max-w-lg">
                A choreographed pipeline of AI agents, graph lookups, and intelligent debouncing.
              </p>

              {/* Pipeline visualization */}
              <div className="mt-12 flex flex-col gap-6">
                {/* Trigger */}
                <PipelineRow
                  color="#fff"
                  label="Note Saved"
                  right="User writes in QuickCapture or NoteEditor"
                />
                <PipelineConnector label="2s debounce" />

                {/* Parallel split */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Graph branch */}
                  <div className="flex flex-col gap-2">
                    <PipelineRow color="#8b5cf6" label="Graph Agent" right="Two-pass extraction" />
                    <PipelineStep color="#8b5cf6" label="extract_entities" desc="People, projects, concepts, orgs with metadata" />
                    <PipelineStep color="#14b8a6" label="Graph Lookup" desc="Match against existing nodes — FREE, no API call" free />
                    <PipelineStep color="#f59e0b" label="Context Agent" desc="Living project briefs — fire & forget" />
                    <PipelineStep color="#8b5cf6" label="extract_relationships" desc="Cross-note links, shared concepts" />
                    <PipelineStep color="#f43f5e" label="Contradictions" desc="Detects conflicting facts across notes" />
                  </div>

                  {/* Reminder branch */}
                  <div className="flex flex-col gap-2">
                    <PipelineRow color="#f59e0b" label="Reminder Agent" right="Temporal extraction" />
                    <PipelineStep color="#f59e0b" label="extract_reminders" desc="Tasks, events, deadlines from natural language" />
                    <PipelineStep color="#f59e0b" label="Date Parsing" desc="Natural language → ISO 8601" />
                    <PipelineStep color="#f43f5e" label="Priority" desc="High (urgent/today), Medium (week), Low (someday)" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function PipelineRow({ color, label, right }: { color: string; label: string; right: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-4 py-3 border border-white/[0.04]" style={{ background: `color-mix(in srgb, ${color} 4%, transparent)` }}>
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 8px ${color}60` }} />
      <span className="text-[13px] font-semibold text-white/80">{label}</span>
      <span className="text-[12px] text-white/20 ml-auto">{right}</span>
    </div>
  )
}

function PipelineStep({ color, label, desc, free }: { color: string; label: string; desc: string; free?: boolean }) {
  return (
    <div className="flex items-start gap-3 pl-7">
      <div className="w-[3px] h-full rounded-full flex-shrink-0 mt-1" style={{ background: `${color}20`, minHeight: 16 }} />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-mono font-medium" style={{ color }}>{label}</span>
          {free && <span className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded" style={{ background: '#14b8a615', color: '#14b8a6' }}>FREE</span>}
        </div>
        <p className="text-[11px] text-white/20 mt-0.5">{desc}</p>
      </div>
    </div>
  )
}

function PipelineConnector({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pl-5">
      <div className="w-[1px] h-5 bg-white/10" />
      <span className="text-[10px] font-mono text-white/15">{label}</span>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   AGENTS — clean cards
   ═══════════════════════════════════════════════════════════════════════════ */

function Agents() {
  const agents = [
    {
      name: 'Graph Agent', icon: GitFork, color: '#8b5cf6',
      model: 'haiku-4-5', trigger: '2s debounce',
      desc: 'Two-pass entity & relationship extraction. Uses existing graph as a free retrieval index.',
      tools: ['extract_entities', 'extract_relationships'],
    },
    {
      name: 'Context Agent', icon: Eye, color: '#f59e0b',
      model: 'haiku-4-5', trigger: '30s debounce',
      desc: 'Maintains living briefs for projects and orgs — summary, open questions, blockers.',
      tools: ['update_project_context'],
    },
    {
      name: 'Reminder Agent', icon: Bell, color: '#f43f5e',
      model: 'haiku-4-5', trigger: '2s debounce',
      desc: 'Extracts tasks, events, and deadlines from natural language with priority classification.',
      tools: ['extract_reminders'],
    },
    {
      name: 'Sieve Agent', icon: Filter, color: '#8b5cf6',
      model: 'haiku-4-5', trigger: 'Manual',
      desc: 'Brain dump → sorted buckets. Actionable steps, incubating ideas, questions, emotional offload.',
      tools: ['parse_brain_dump'],
    },
  ]

  return (
    <section id="agents" className="py-32 md:py-40">
      <div className="max-w-[1200px] mx-auto px-6">
        <Reveal>
          <Badge color="#f59e0b">Agents</Badge>
          <h2 className="mt-4 text-[clamp(1.8rem,4vw,3rem)] font-bold tracking-tight text-white leading-tight">
            Four agents,<br />working quietly
          </h2>
          <p className="mt-3 text-white/30 text-[15px] max-w-md">
            Specialized AI agents fire in the background after every note save. You never wait — they just make your knowledge richer.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-3">
          {agents.map((a, i) => {
            const Icon = a.icon
            return (
              <Reveal key={i} delay={i * 80}>
                <div className="bento-card h-full">
                  <div className="p-5 md:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `color-mix(in srgb, ${a.color} 10%, transparent)` }}>
                          <Icon size={16} style={{ color: a.color }} strokeWidth={1.8} />
                        </div>
                        <h3 className="text-[14px] font-semibold text-white/90">{a.name}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-white/20">{a.trigger}</span>
                      </div>
                    </div>

                    <p className="text-[13px] text-white/30 leading-relaxed mb-4">{a.desc}</p>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.04] text-white/25 border border-white/[0.04]">
                        {a.model}
                      </span>
                      {a.tools.map(t => (
                        <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded-md border" style={{
                          background: `color-mix(in srgb, ${a.color} 5%, transparent)`,
                          borderColor: `color-mix(in srgb, ${a.color} 12%, transparent)`,
                          color: `color-mix(in srgb, ${a.color} 60%, white)`,
                        }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   KNOWLEDGE GRAPH — visual + data
   ═══════════════════════════════════════════════════════════════════════════ */

function Graph() {
  // Node positions for the abstract graph visual
  const nodes = [
    { x: 50, y: 50, r: 5, color: '#8b5cf6', label: 'Note' },
    { x: 22, y: 32, r: 3.5, color: '#14b8a6', label: 'Person' },
    { x: 78, y: 28, r: 3.5, color: '#f59e0b', label: 'Project' },
    { x: 18, y: 68, r: 3, color: '#14b8a6', label: 'Org' },
    { x: 82, y: 72, r: 3, color: '#f43f5e', label: 'Tech' },
    { x: 40, y: 80, r: 2.5, color: '#9090a8', label: 'Concept' },
    { x: 65, y: 18, r: 2.5, color: '#8b5cf6', label: 'Note' },
    { x: 35, y: 15, r: 2, color: '#f59e0b', label: 'Event' },
  ]

  const edges = [
    [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [6, 1], [6, 2], [6, 7], [1, 3], [2, 4],
  ]

  return (
    <section id="graph" className="py-32 md:py-40 relative">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: visualization */}
          <Reveal>
            <div className="aspect-square max-w-[480px] mx-auto w-full relative">
              <div className="absolute inset-0 rounded-3xl overflow-hidden border border-white/[0.04]" style={{ background: 'rgba(255,255,255,0.01)' }}>
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  {/* Edges */}
                  {edges.map(([a, b], i) => (
                    <line
                      key={i}
                      x1={nodes[a].x} y1={nodes[a].y}
                      x2={nodes[b].x} y2={nodes[b].y}
                      stroke="white"
                      strokeOpacity={0.06}
                      strokeWidth={0.3}
                    />
                  ))}
                  {/* Nodes with glow */}
                  {nodes.map((n, i) => (
                    <g key={i}>
                      <circle cx={n.x} cy={n.y} r={n.r * 3} fill={n.color} opacity={0.04}>
                        <animate attributeName="opacity" values="0.04;0.08;0.04" dur={`${3 + i * 0.5}s`} repeatCount="indefinite" />
                      </circle>
                      <circle cx={n.x} cy={n.y} r={n.r} fill={n.color} opacity={0.7}>
                        <animate attributeName="r" values={`${n.r};${n.r * 1.15};${n.r}`} dur={`${4 + i * 0.3}s`} repeatCount="indefinite" />
                      </circle>
                    </g>
                  ))}
                </svg>
              </div>
            </div>
          </Reveal>

          {/* Right: description */}
          <div>
            <Reveal>
              <Badge color="#14b8a6">Knowledge Graph</Badge>
              <h2 className="mt-4 text-[clamp(1.6rem,3.5vw,2.5rem)] font-bold tracking-tight text-white leading-tight">
                Your notes become<br />a connected brain
              </h2>
              <p className="mt-4 text-[14px] text-white/30 leading-relaxed max-w-md">
                Every note feeds a growing knowledge graph. Entities are extracted, relationships discovered, and contradictions flagged — automatically.
              </p>
            </Reveal>

            <Reveal delay={150}>
              <div className="mt-8 flex flex-col gap-3">
                {[
                  { label: 'Self-reinforcing', desc: 'Graph index lookup finds related notes with zero API cost. More notes = better relationships.', color: '#14b8a6' },
                  { label: 'Rich metadata', desc: 'Role, organization, status, blockers, stakeholders — all AI-extracted per entity.', color: '#8b5cf6' },
                  { label: 'Contradiction detection', desc: 'When facts conflict across notes, tensions are stored and surfaced in chat.', color: '#f43f5e' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-1 rounded-full flex-shrink-0 mt-1.5" style={{ background: item.color, height: 16 }} />
                    <div>
                      <span className="text-[13px] font-medium text-white/70">{item.label}</span>
                      <p className="text-[12px] text-white/25 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   AI CHAT — context layers + behaviors
   ═══════════════════════════════════════════════════════════════════════════ */

function Chat() {
  return (
    <section id="chat" className="py-32 md:py-40 relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-[0.02]"
          style={{ background: 'radial-gradient(ellipse, #14b8a6, transparent 70%)' }} />
      </div>

      <div className="max-w-[1200px] mx-auto px-6 relative">
        <Reveal>
          <Badge color="#f43f5e">AI Chat</Badge>
          <h2 className="mt-4 text-[clamp(1.8rem,4vw,3rem)] font-bold tracking-tight text-white leading-tight">
            Think out loud,<br />with full context
          </h2>
          <p className="mt-3 text-white/30 text-[15px] max-w-lg">
            A Socratic AI that never prescribes — it mirrors your thinking, asks probing questions, and surfaces connections you missed.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Context layers */}
          <Reveal>
            <div className="bento-card">
              <div className="p-5 md:p-6">
                <p className="text-[11px] font-medium tracking-wide uppercase text-white/25 mb-4">Context injected per message</p>
                <div className="flex flex-col gap-2">
                  {[
                    { num: '1', label: 'Your Notes', desc: 'Top 10 by decay score', color: '#8b5cf6' },
                    { num: '2', label: 'Project Briefs', desc: 'AI-maintained summaries', color: '#f59e0b' },
                    { num: '3', label: 'Tensions', desc: 'Contradictions to surface', color: '#f43f5e' },
                    { num: '4', label: 'Blockers', desc: 'Dependency context', color: '#14b8a6' },
                    { num: '5', label: 'Threads', desc: 'Conversation history', color: '#9090a8' },
                  ].map((l, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5" style={{ background: `color-mix(in srgb, ${l.color} 3%, transparent)` }}>
                      <span className="text-[10px] font-mono font-bold w-5 text-center" style={{ color: l.color }}>{l.num}</span>
                      <span className="text-[13px] font-medium text-white/60">{l.label}</span>
                      <span className="text-[11px] text-white/20 ml-auto">{l.desc}</span>
                    </div>
                  ))}
                </div>

                {/* Decay formula */}
                <div className="mt-4 rounded-lg px-3 py-3 bg-black/20">
                  <p className="text-[10px] uppercase tracking-wider text-white/15 mb-1">Relevance decay</p>
                  <code className="text-[13px] font-mono" style={{ color: '#14b8a6' }}>
                    score = (1 + connections) × e<sup>−0.05 × days</sup>
                  </code>
                  <p className="text-[11px] text-white/15 mt-1">Half-life ~14 days. Connected notes persist longer.</p>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Behaviors */}
          <Reveal delay={100}>
            <div className="bento-card">
              <div className="p-5 md:p-6">
                <p className="text-[11px] font-medium tracking-wide uppercase text-white/25 mb-4">Intelligent behaviors</p>
                <div className="flex flex-col gap-5">
                  {[
                    { icon: Zap, name: 'Dependency Resolution', desc: 'Detects blockers, surfaces the immediate bottleneck to focus on.', color: '#14b8a6' },
                    { icon: GitFork, name: 'Thread Forking', desc: 'Tangent ideas are captured as incubating notes, then back to topic.', color: '#f59e0b' },
                    { icon: Clock, name: 'Context Restoration', desc: '"Where was I?" → 2-sentence ramp-up with your exact next step.', color: '#8b5cf6' },
                    { icon: HelpCircle, name: 'Socratic Unblocking', desc: '5 Whys, Constraint Forcing, Inversion, Smallest Next Step.', color: '#f43f5e' },
                  ].map((b, i) => {
                    const Icon = b.icon
                    return (
                      <div key={i} className="flex items-start gap-3">
                        <Icon size={15} style={{ color: b.color }} strokeWidth={1.8} className="flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-[13px] font-medium text-white/70">{b.name}</h4>
                          <p className="text-[12px] text-white/25 mt-0.5 leading-relaxed">{b.desc}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   COGNITIVE SIEVE — four buckets
   ═══════════════════════════════════════════════════════════════════════════ */

function Sieve() {
  const buckets = [
    { icon: Zap, name: 'Actionable', color: '#8b5cf6', example: 'Schedule call with Sarah about Q3' },
    { icon: Lightbulb, name: 'Incubating', color: '#f59e0b', example: 'What if we used webhooks for sync?' },
    { icon: HelpCircle, name: 'Questions', color: '#14b8a6', example: 'Do we need SOC 2 before launch?' },
    { icon: Heart, name: 'Emotional', color: '#f43f5e', example: 'Frustrated the timeline keeps shifting' },
  ]

  return (
    <section className="py-20 md:py-28">
      <div className="max-w-[1200px] mx-auto px-6">
        <Reveal>
          <div className="bento-card">
            <div className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                <div className="max-w-sm">
                  <Badge color="#8b5cf6">Cognitive Sieve</Badge>
                  <h3 className="mt-3 text-xl font-bold text-white">Brain dump → clarity</h3>
                  <p className="mt-2 text-[13px] text-white/30 leading-relaxed">
                    Paste raw stream-of-consciousness. AI sorts every thought into exactly one bucket. One-click convert to notes.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 flex-1 max-w-md">
                  {buckets.map((b, i) => {
                    const Icon = b.icon
                    return (
                      <div key={i} className="rounded-xl p-3 border border-white/[0.04]" style={{ background: `color-mix(in srgb, ${b.color} 3%, transparent)` }}>
                        <div className="flex items-center gap-2 mb-2">
                          <Icon size={13} style={{ color: b.color }} strokeWidth={2} />
                          <span className="text-[11px] font-semibold" style={{ color: b.color }}>{b.name}</span>
                        </div>
                        <p className="text-[11px] text-white/20 italic">"{b.example}"</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   TECH STACK — clean, minimal
   ═══════════════════════════════════════════════════════════════════════════ */

function Stack() {
  const tech = [
    ['React 19', 'Vite 7', 'TypeScript', 'Tailwind v4', 'Zustand v5'],
    ['TipTap v3', 'React Flow', 'd3-force', 'Anthropic SDK', 'Lucide'],
  ]

  const models = [
    { name: 'claude-sonnet-4-6', role: 'Thinking Partner', desc: 'Streaming chat with full context injection', color: '#14b8a6' },
    { name: 'claude-haiku-4-5', role: 'Background Agents', desc: 'Tool-use extraction — fast, cheap, structured', color: '#8b5cf6' },
  ]

  const stores = [
    { name: 'notes', persisted: true }, { name: 'graph', persisted: true },
    { name: 'reminders', persisted: true }, { name: 'tensions', persisted: true },
    { name: 'sieve', persisted: true }, { name: 'threads', persisted: true },
    { name: 'chat', persisted: false }, { name: 'ui', persisted: false },
  ]

  return (
    <section id="stack" className="py-32 md:py-40">
      <div className="max-w-[1200px] mx-auto px-6">
        <Reveal>
          <Badge color="#f59e0b">Stack</Badge>
          <h2 className="mt-4 text-[clamp(1.8rem,4vw,3rem)] font-bold tracking-tight text-white leading-tight">
            Built for speed
          </h2>
          <p className="mt-3 text-white/30 text-[15px] max-w-md">
            Everything runs in the browser. No backend, no account, no sync. Your thoughts stay on your machine.
          </p>
        </Reveal>

        {/* Tech pills */}
        <Reveal delay={100}>
          <div className="mt-10 flex flex-col gap-2">
            {tech.map((row, i) => (
              <div key={i} className="flex flex-wrap gap-2">
                {row.map(t => (
                  <span key={t} className="text-[12px] font-medium text-white/35 bg-white/[0.03] border border-white/[0.04] rounded-lg px-3.5 py-2 hover:text-white/50 hover:border-white/[0.08] transition-all cursor-default">
                    {t}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </Reveal>

        {/* Models */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-3">
          {models.map((m, i) => (
            <Reveal key={i} delay={i * 80}>
              <div className="bento-card">
                <div className="p-5 md:p-6">
                  <span className="text-[11px] font-medium text-white/20">{m.role}</span>
                  <code className="block mt-1 text-[14px] font-mono font-medium" style={{ color: m.color }}>{m.name}</code>
                  <p className="mt-2 text-[12px] text-white/25">{m.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* State stores */}
        <Reveal delay={200}>
          <div className="mt-10">
            <p className="text-[11px] font-medium tracking-wide uppercase text-white/20 mb-3">Zustand Stores</p>
            <div className="flex flex-wrap gap-2">
              {stores.map(s => (
                <span key={s.name} className="text-[11px] font-mono px-2.5 py-1 rounded-md border border-white/[0.04]" style={{
                  color: s.persisted ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)',
                  background: s.persisted ? 'rgba(255,255,255,0.02)' : 'transparent',
                }}>
                  {s.name}{s.persisted ? '' : ' •'}
                </span>
              ))}
              <span className="text-[10px] text-white/10 self-center ml-1">• = session only</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════════════════════════════════ */

function Footer() {
  return (
    <footer className="py-20 border-t border-white/[0.04]">
      <div className="max-w-[1200px] mx-auto px-6 text-center">
        <p className="text-[15px] text-white/40 font-medium">
          Process, don't manage. Mirror, don't direct.
        </p>
        <p className="mt-2 text-[12px] text-white/15">
          Preserve cognitive ownership.
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 mt-8 text-[13px] font-medium text-white/40 hover:text-white/70 transition-colors"
        >
          <Brain size={15} strokeWidth={1.8} /> Open Midwicket <ArrowUpRight size={11} />
        </a>
      </div>
    </footer>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function ArchitecturePage() {
  return (
    <div className="arch-page bg-[#08080a] min-h-screen">
      <style>{`
        /* ── Base ── */
        .arch-page {
          --grain: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
        }
        html { scroll-behavior: smooth; }
        ::selection { background: rgba(139,92,246,0.25); }

        /* ── Noise overlay ── */
        .noise-overlay {
          background-image: var(--grain);
          background-repeat: repeat;
          background-size: 256px;
          opacity: 0.5;
          mix-blend-mode: overlay;
        }

        /* ── Hero blobs ── */
        .hero-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
        }
        .hero-blob-1 {
          width: 500px; height: 500px;
          background: #8b5cf6;
          opacity: 0.07;
          top: 10%; left: 15%;
          animation: drift 25s ease-in-out infinite alternate;
        }
        .hero-blob-2 {
          width: 400px; height: 400px;
          background: #14b8a6;
          opacity: 0.05;
          bottom: 15%; right: 15%;
          animation: drift 20s ease-in-out infinite alternate-reverse;
        }
        .hero-blob-3 {
          width: 300px; height: 300px;
          background: #f59e0b;
          opacity: 0.03;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          animation: drift 30s ease-in-out infinite alternate;
        }
        @keyframes drift {
          0% { transform: translate(0, 0); }
          100% { transform: translate(40px, -30px); }
        }

        /* ── Gradient text ── */
        .hero-gradient-text {
          background: linear-gradient(135deg, #8b5cf6, #14b8a6, #f59e0b);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradient-shift 5s ease-in-out infinite alternate;
        }
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }

        /* ── Reveal animation ── */
        .reveal-up {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal-up.revealed {
          opacity: 1;
          transform: translateY(0);
        }

        /* ── Bento cards ── */
        .bento-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.04);
          border-radius: 16px;
          transition: border-color 0.3s ease, background 0.3s ease;
        }
        .bento-card:hover {
          border-color: rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
        }

        /* ── Pipeline card ── */
        .pipeline-card {
          background: rgba(255,255,255,0.015);
        }
      `}</style>

      <Nav />
      <Hero />
      <Features />
      <HowItWorks />
      <Pipeline />
      <Agents />
      <Graph />
      <Chat />
      <Sieve />
      <Stack />
      <Footer />
    </div>
  )
}
