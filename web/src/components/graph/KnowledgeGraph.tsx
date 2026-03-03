import { useCallback, useEffect, useMemo } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  BackgroundVariant,
  type Node,
  type Edge,
  type NodeDragHandler,
} from 'reactflow'
import 'reactflow/dist/style.css'
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force'
import { useGraphStore } from '../../stores/graphStore'
import { useUIStore } from '../../stores/uiStore'
import type { GraphNode, GraphEdge, EntityType } from '../../types'

// ─── Color Map ────────────────────────────────────────────────────────────────

const ENTITY_COLORS: Record<EntityType, { border: string; bg: string; text: string }> = {
  person:       { border: '#14b8a6', bg: 'rgba(20,184,166,0.12)',  text: '#14b8a6' },
  project:      { border: '#f59e0b', bg: 'rgba(245,158,11,0.12)', text: '#f59e0b' },
  technology:   { border: '#3b82f6', bg: 'rgba(59,130,246,0.12)', text: '#3b82f6' },
  concept:      { border: '#a78bfa', bg: 'rgba(167,139,250,0.1)', text: '#a78bfa' },
  organization: { border: '#f97316', bg: 'rgba(249,115,22,0.12)', text: '#f97316' },
  place:        { border: '#22c55e', bg: 'rgba(34,197,94,0.1)',   text: '#22c55e' },
  event:        { border: '#f43f5e', bg: 'rgba(244,63,94,0.12)', text: '#f43f5e' },
  idea:         { border: '#e879f9', bg: 'rgba(232,121,249,0.1)', text: '#e879f9' },
}

// ─── Custom Node Components ───────────────────────────────────────────────────

function NoteNodeComponent({ data }: { data: { label: string; isProcessing: boolean } }) {
  return (
    <div
      style={{
        background: 'rgba(139,92,246,0.12)',
        border: `2px solid ${data.isProcessing ? '#f59e0b' : '#8b5cf6'}`,
        borderRadius: 10,
        padding: '8px 14px',
        minWidth: 100,
        maxWidth: 160,
        color: '#e8e8f0',
        fontSize: 11,
        fontWeight: 600,
        position: 'relative',
        fontFamily: 'Inter, sans-serif',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {data.isProcessing && (
        <div
          style={{
            position: 'absolute',
            top: -5,
            right: -5,
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#f59e0b',
            boxShadow: '0 0 6px #f59e0b',
          }}
        />
      )}
      <div style={{ color: '#8b5cf6', fontSize: 9, marginBottom: 3, letterSpacing: '0.05em' }}>
        NOTE
      </div>
      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {data.label}
      </div>
    </div>
  )
}

function EntityNodeComponent({
  data,
}: {
  data: { label: string; entityType: EntityType; noteCount: number }
}) {
  const colors = ENTITY_COLORS[data.entityType] ?? ENTITY_COLORS.concept
  return (
    <div
      style={{
        background: colors.bg,
        border: `1.5px solid ${colors.border}60`,
        borderRadius: 20,
        padding: '5px 12px',
        color: colors.text,
        fontSize: 11,
        fontWeight: 500,
        whiteSpace: 'nowrap',
        fontFamily: 'Inter, sans-serif',
        cursor: 'pointer',
        userSelect: 'none',
        boxShadow: data.noteCount > 2 ? `0 0 10px ${colors.border}30` : 'none',
      }}
      title={`${data.entityType} · ${data.noteCount} note${data.noteCount !== 1 ? 's' : ''}`}
    >
      {data.label}
    </div>
  )
}

const NODE_TYPES = {
  noteNode: NoteNodeComponent,
  entityNode: EntityNodeComponent,
}

// ─── D3-Force Layout ──────────────────────────────────────────────────────────

interface SimNode extends SimulationNodeDatum {
  id: string
  fx?: number | null
  fy?: number | null
}

interface SimLink extends SimulationLinkDatum<SimNode> {
  source: string | SimNode
  target: string | SimNode
}

function computeLayout(
  nodes: GraphNode[],
  edges: GraphEdge[]
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>()
  if (nodes.length === 0) return positions

  const cx = 600
  const cy = 400

  const simNodes: SimNode[] = nodes.map(n => ({
    id: n.id,
    x: n.x ?? cx + (Math.random() - 0.5) * 400,
    y: n.y ?? cy + (Math.random() - 0.5) * 300,
    fx: n.x != null ? n.x : null,
    fy: n.y != null ? n.y : null,
  }))

  const simLinks: SimLink[] = edges
    .filter(e => e.type !== 'contains')
    .map(e => ({ source: e.source, target: e.target }))

  const simulation = forceSimulation<SimNode>(simNodes)
    .force('charge', forceManyBody<SimNode>().strength(-250))
    .force(
      'link',
      forceLink<SimNode, SimLink>(simLinks)
        .id(d => d.id)
        .distance(130)
        .strength(0.3)
    )
    .force('center', forceCenter<SimNode>(cx, cy))
    .force('collide', forceCollide<SimNode>(55))
    .stop()

  simulation.tick(300)

  simNodes.forEach(n => {
    positions.set(n.id, { x: n.x ?? 0, y: n.y ?? 0 })
  })

  return positions
}

// ─── Converters: GraphStore → React Flow ──────────────────────────────────────

function toFlowNodes(
  graphNodes: GraphNode[],
  positions: Map<string, { x: number; y: number }>,
  processingIds: string[]
): Node[] {
  return graphNodes.map(n => {
    const pos = positions.get(n.id) ?? { x: 0, y: 0 }
    if (n.type === 'note') {
      return {
        id: n.id,
        type: 'noteNode',
        position: pos,
        data: {
          label: n.label,
          isProcessing: processingIds.includes(n.id),
        },
      }
    }
    return {
      id: n.id,
      type: 'entityNode',
      position: pos,
      data: {
        label: n.label,
        entityType: n.entityType ?? 'concept',
        noteCount: n.noteIds.length,
      },
    }
  })
}

function toFlowEdges(graphEdges: GraphEdge[]): Edge[] {
  return graphEdges.map(e => {
    const isContains = e.type === 'contains'
    const isConcept = e.type === 'shares_concept'
    const isExplicit = e.type === 'explicitly_links'

    return {
      id: e.id,
      source: e.source,
      target: e.target,
      label: !isContains ? e.label : undefined,
      type: 'smoothstep',
      markerEnd: isContains
        ? undefined
        : { type: MarkerType.ArrowClosed, width: 10, height: 10, color: isExplicit ? '#14b8a6' : '#8b5cf6' },
      style: {
        stroke: isContains
          ? '#2e2e35'
          : isExplicit
          ? '#14b8a6'
          : '#8b5cf6',
        strokeWidth: isContains ? 1 : Math.max(1, Math.min(3, e.weight / 3)),
        strokeDasharray: isConcept ? '5,4' : undefined,
        opacity: isContains ? 0.3 : 0.7,
      },
      labelStyle: {
        fill: '#9090a8',
        fontSize: 10,
        fontFamily: 'Inter, sans-serif',
      },
      labelBgStyle: {
        fill: '#1a1a1d',
        fillOpacity: 0.9,
      },
    }
  })
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function KnowledgeGraph() {
  const { nodes: graphNodes, edges: graphEdges, processingNoteIds, setNodePosition } = useGraphStore()
  const openNote = useUIStore(s => s.openNote)

  // Compute layout whenever graph structure changes
  const positions = useMemo(
    () => computeLayout(graphNodes, graphEdges),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [graphNodes.length, graphEdges.length]
  )

  const initialNodes = useMemo(
    () => toFlowNodes(graphNodes, positions, processingNoteIds),
    [graphNodes, positions, processingNoteIds]
  )
  const initialEdges = useMemo(() => toFlowEdges(graphEdges), [graphEdges])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Sync when graph data changes
  useEffect(() => {
    setNodes(toFlowNodes(graphNodes, positions, processingNoteIds))
  }, [graphNodes, positions, processingNoteIds, setNodes])

  useEffect(() => {
    setEdges(toFlowEdges(graphEdges))
  }, [graphEdges, setEdges])

  // Persist dragged positions
  const onNodeDragStop: NodeDragHandler = useCallback(
    (_, node) => {
      setNodePosition(node.id, node.position.x, node.position.y)
    },
    [setNodePosition]
  )

  // Click note node → open note
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === 'noteNode') {
        openNote(node.id)
      }
    },
    [openNote]
  )

  return (
    <div style={{ flex: 1, background: '#0c0c0d' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        attributionPosition="bottom-right"
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#1e1e22"
        />
        <Controls
          style={{ background: '#1a1a1d', border: '1px solid #2e2e35', borderRadius: 8 }}
        />
        <MiniMap
          style={{ background: '#131315', border: '1px solid #2e2e35', borderRadius: 8 }}
          nodeColor={n =>
            n.type === 'noteNode' ? '#8b5cf620' : '#14b8a620'
          }
          maskColor="rgba(12,12,13,0.7)"
        />
      </ReactFlow>
    </div>
  )
}
