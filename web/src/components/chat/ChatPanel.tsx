import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Send, Trash2, Bot, User, Loader2, AlertCircle, Lightbulb } from 'lucide-react'
import { useChatStore } from '../../stores/chatStore'
import { useNotesStore } from '../../stores/notesStore'
import { useGraphStore } from '../../stores/graphStore'
import { useTensionsStore } from '../../stores/tensionsStore'
import { useThreadStore } from '../../stores/threadStore'
import {
  streamChat, buildNotesContext, buildProjectContext, buildTensionsContext,
  buildDependencyContext, buildThreadContext,
} from '../../lib/ai'
import { computeDecayScore } from '../../lib/decay'
import type { ChatTurn } from '../../lib/ai'

function MessageBubble({ role, content, isStreaming }: { role: 'user' | 'assistant'; content: string; isStreaming?: boolean }) {
  const isUser = role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className="flex-shrink-0 rounded-full flex items-center justify-center"
        style={{
          width: 28,
          height: 28,
          background: isUser ? 'rgba(139,92,246,0.2)' : 'rgba(20,184,166,0.15)',
          marginTop: 2,
        }}
      >
        {isUser ? (
          <User size={14} style={{ color: '#8b5cf6' }} />
        ) : (
          <Bot size={14} style={{ color: '#14b8a6' }} />
        )}
      </div>

      {/* Content */}
      <div
        className="rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed max-w-[85%]"
        style={{
          background: isUser ? 'rgba(139,92,246,0.12)' : '#1e1e22',
          color: '#e8e8f0',
          borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
          border: isUser ? '1px solid rgba(139,92,246,0.2)' : '1px solid #2e2e35',
        }}
      >
        {content}
        {isStreaming && (
          <span
            className="inline-block ml-1 animate-pulse"
            style={{ color: '#8b5cf6' }}
          >
            ▋
          </span>
        )}
      </div>
    </div>
  )
}

export default function ChatPanel() {
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [forkedIdea, setForkedIdea] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { messages, isLoading, addMessage, updateMessage, clearMessages, setLoading } = useChatStore()
  const notes = useNotesStore(s => s.notes)
  const addNote = useNotesStore(s => s.addNote)
  const graphNodes = useGraphStore(s => s.nodes)
  const tensions = useTensionsStore(s => s.tensions)
  const { threads, addForkedIdea, updateThread, getActiveThread } = useThreadStore()

  // Decay-sorted notes: most relevant (recent + graph-connected) first
  const sortedNotes = useMemo(
    () => [...notes].sort(
      (a, b) => computeDecayScore(b.id, b.updatedAt, graphNodes)
               - computeDecayScore(a.id, a.updatedAt, graphNodes)
    ),
    [notes, graphNodes]
  )

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /**
   * Process AI response for [FORK_IDEA] markers.
   * If the AI detects a tangent, it prefixes with [FORK_IDEA] <idea text>\n
   * We silently save that as an incubating idea and strip the marker from display.
   */
  const processForkedIdeas = useCallback((text: string): string => {
    const forkMatch = text.match(/^\[FORK_IDEA\]\s*(.+?)(?:\n|$)/)
    if (forkMatch) {
      const ideaText = forkMatch[1].trim()
      // Save as incubating idea note
      const note = addNote({
        content: JSON.stringify({
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: `💡 Incubating: ${ideaText}` }] }],
        }),
        plainText: `💡 Incubating: ${ideaText}`,
        sourceType: 'text',
        tags: ['incubating', 'forked-idea'],
      })
      const activeThread = getActiveThread()
      if (activeThread) {
        addForkedIdea(ideaText, activeThread.id)
      }
      setForkedIdea(ideaText)
      setTimeout(() => setForkedIdea(null), 4000)
      // Strip the marker from display
      return text.slice(forkMatch[0].length).trimStart()
    }
    return text
  }, [addNote, addForkedIdea, getActiveThread])

  async function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    setInput('')
    setError(null)

    // Add user message
    addMessage('user', trimmed)

    // Track thread activity
    const activeThread = getActiveThread()
    if (activeThread) {
      updateThread(activeThread.id, { messageCount: activeThread.messageCount + 1 })
    }

    // Build combined context: decay-scored notes + project briefs + tensions + dependencies + threads
    const notesCtx = buildNotesContext(sortedNotes)
    const projectCtx = buildProjectContext(graphNodes)
    const tensionsCtx = buildTensionsContext(tensions)
    const depsCtx = buildDependencyContext(graphNodes)
    const threadCtx = buildThreadContext(threads)
    const notesContext = [notesCtx, projectCtx, tensionsCtx, depsCtx, threadCtx]
      .filter(Boolean)
      .join('\n\n---\n')

    // Build conversation history for API
    const history: ChatTurn[] = messages
      .filter(m => !m.isStreaming)
      .map(m => ({ role: m.role, content: m.content }))
    history.push({ role: 'user', content: trimmed })

    // Add streaming assistant message
    const assistantMsg = addMessage('assistant', '')
    setLoading(true)

    let accumulated = ''
    let forkProcessed = false

    await streamChat(
      history,
      notesContext,
      (token) => {
        accumulated += token
        // Process fork markers once we have the first line
        if (!forkProcessed && accumulated.includes('\n')) {
          const processed = processForkedIdeas(accumulated)
          if (processed !== accumulated) {
            accumulated = processed
            forkProcessed = true
          }
        }
        updateMessage(assistantMsg.id, forkProcessed ? accumulated : accumulated.replace(/^\[FORK_IDEA\].*?\n?/, ''), true)
      },
      () => {
        // Final fork processing for short responses
        if (!forkProcessed) {
          accumulated = processForkedIdeas(accumulated)
        }
        updateMessage(assistantMsg.id, accumulated, false)
        setLoading(false)
      },
      (err) => {
        setLoading(false)
        updateMessage(assistantMsg.id, '', false)
        setError(err.message)
      }
    )
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      className="flex flex-col border-l"
      style={{
        width: 340,
        flexShrink: 0,
        background: '#131315',
        borderColor: '#2e2e35',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: '#2e2e35', flexShrink: 0 }}
      >
        <div>
          <h2 className="text-sm font-semibold" style={{ color: '#e8e8f0' }}>
            Thinking Partner
          </h2>
          <p className="text-xs" style={{ color: '#5a5a72' }}>
            Ask questions, not answers
          </p>
        </div>
        <button
          onClick={clearMessages}
          className="rounded-lg p-1.5 transition-colors"
          style={{ color: '#5a5a72' }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#f43f5e')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#5a5a72')}
          title="Clear conversation"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4">
        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            role={msg.role}
            content={msg.content}
            isStreaming={msg.isStreaming}
          />
        ))}

        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex gap-3">
            <div
              className="flex-shrink-0 rounded-full flex items-center justify-center"
              style={{ width: 28, height: 28, background: 'rgba(20,184,166,0.15)' }}
            >
              <Loader2 size={14} style={{ color: '#14b8a6' }} className="animate-spin" />
            </div>
            <div
              className="rounded-2xl px-3.5 py-2.5 text-sm"
              style={{ background: '#1e1e22', color: '#5a5a72', border: '1px solid #2e2e35' }}
            >
              Thinking…
            </div>
          </div>
        )}

        {error && (
          <div
            className="flex items-start gap-2 rounded-lg p-3 text-sm"
            style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: '#f43f5e' }}
          >
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">AI unavailable</div>
              <div className="text-xs mt-0.5 opacity-70">{error}</div>
            </div>
          </div>
        )}

        {/* Forked idea toast */}
        {forkedIdea && (
          <div
            className="flex items-start gap-2 rounded-lg p-3 text-sm animate-pulse"
            style={{
              background: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.2)',
              color: '#f59e0b',
            }}
          >
            <Lightbulb size={14} className="flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-xs">Idea saved</div>
              <div className="text-xs mt-0.5 opacity-80">{forkedIdea}</div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t" style={{ borderColor: '#2e2e35', flexShrink: 0 }}>
        <div
          className="flex items-end gap-2 rounded-xl border px-3 py-2 transition-colors"
          style={{ background: '#1a1a1d', borderColor: '#2e2e35' }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Share a thought…"
            rows={1}
            className="flex-1 bg-transparent resize-none text-sm focus:outline-none leading-relaxed"
            style={{
              color: '#e8e8f0',
              caretColor: '#8b5cf6',
              maxHeight: 80,
              overflowY: 'auto',
            }}
            onInput={e => {
              const t = e.currentTarget
              t.style.height = 'auto'
              t.style.height = `${Math.min(t.scrollHeight, 80)}px`
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="flex-shrink-0 rounded-lg p-1.5 transition-all mb-0.5"
            style={{
              background: input.trim() && !isLoading ? '#8b5cf6' : 'transparent',
              color: input.trim() && !isLoading ? 'white' : '#5a5a72',
            }}
          >
            <Send size={14} />
          </button>
        </div>
        <p className="text-xs text-center mt-2" style={{ color: '#3d3d47' }}>
          ↵ send · Shift+↵ newline
        </p>
      </div>
    </div>
  )
}
