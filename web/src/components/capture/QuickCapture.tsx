import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Plus, Sparkles } from 'lucide-react'
import { useNotesStore } from '../../stores/notesStore'
import { useUIStore } from '../../stores/uiStore'

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
  onerror: ((event: Event) => void) | null
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition
    webkitSpeechRecognition?: new () => SpeechRecognition
  }
}

export default function QuickCapture() {
  const [text, setText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [interimText, setInterimText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const addNote = useNotesStore(s => s.addNote)
  const openNote = useUIStore(s => s.openNote)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [text])

  function handleSubmit() {
    const trimmed = text.trim()
    if (!trimmed) return

    const note = addNote({
      content: JSON.stringify({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: trimmed }] }],
      }),
      plainText: trimmed,
      sourceType: 'text',
    })
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    openNote(note.id)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  function toggleVoice() {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionAPI) {
      alert('Speech recognition is not supported in this browser.')
      return
    }

    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
      setInterimText('')
      return
    }

    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final = ''
      let interim = ''
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          final += result[0].transcript + ' '
        } else {
          interim += result[0].transcript
        }
      }
      if (final) setText(prev => prev + final)
      setInterimText(interim)
    }

    recognition.onend = () => {
      setIsRecording(false)
      setInterimText('')
    }

    recognition.onerror = () => {
      setIsRecording(false)
      setInterimText('')
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }

  const hasContent = text.trim().length > 0

  return (
    <div
      className="mx-4 mt-4 mb-2 rounded-xl border transition-all duration-200"
      style={{
        background: '#1a1a1d',
        borderColor: hasContent ? '#8b5cf6' : '#2e2e35',
        boxShadow: hasContent ? '0 0 0 1px rgba(139,92,246,0.2), 0 4px 20px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      {/* Label */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-1">
        <Sparkles size={13} style={{ color: '#8b5cf6' }} />
        <span className="text-xs font-medium" style={{ color: '#5a5a72' }}>
          Capture a thought
        </span>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={text + (isRecording ? interimText : '')}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="What's on your mind? Dump it here — organize never..."
        rows={2}
        className="w-full bg-transparent resize-none px-4 pb-3 text-sm leading-relaxed focus:outline-none"
        style={{
          color: '#e8e8f0',
          caretColor: '#8b5cf6',
          fontFamily: 'Inter, sans-serif',
        }}
      />

      {/* Footer */}
      <div className="flex items-center justify-between px-3 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleVoice}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-all"
            style={{
              background: isRecording ? 'rgba(244,63,94,0.15)' : 'rgba(255,255,255,0.04)',
              color: isRecording ? '#f43f5e' : '#9090a8',
              border: isRecording ? '1px solid rgba(244,63,94,0.3)' : '1px solid transparent',
            }}
          >
            {isRecording ? (
              <>
                <MicOff size={13} />
                <span>Stop</span>
              </>
            ) : (
              <>
                <Mic size={13} />
                <span>Voice</span>
              </>
            )}
          </button>
          {isRecording && (
            <span className="text-xs animate-pulse" style={{ color: '#f43f5e' }}>
              Listening...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: '#5a5a72' }}>
            ⌘↵ to save
          </span>
          <button
            onClick={handleSubmit}
            disabled={!hasContent}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
            style={{
              background: hasContent ? 'rgba(139,92,246,0.9)' : '#2a2a2f',
              color: hasContent ? 'white' : '#5a5a72',
              cursor: hasContent ? 'pointer' : 'not-allowed',
            }}
          >
            <Plus size={13} />
            <span>Capture</span>
          </button>
        </div>
      </div>
    </div>
  )
}
