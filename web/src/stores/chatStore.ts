import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { ChatMessage } from '../types'

interface ChatStore {
  messages: ChatMessage[]
  isLoading: boolean
  addMessage: (role: 'user' | 'assistant', content: string) => ChatMessage
  updateMessage: (id: string, content: string, isStreaming?: boolean) => void
  clearMessages: () => void
  setLoading: (loading: boolean) => void
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [
    {
      id: uuidv4(),
      role: 'assistant',
      content: "Hello! I'm your thinking partner. I won't just give you answers — I'll help you think better by asking the right questions. What's on your mind?",
      timestamp: new Date().toISOString(),
    },
  ],
  isLoading: false,

  addMessage: (role, content) => {
    const msg: ChatMessage = {
      id: uuidv4(),
      role,
      content,
      timestamp: new Date().toISOString(),
      isStreaming: role === 'assistant' ? true : false,
    }
    set(state => ({ messages: [...state.messages, msg] }))
    return msg
  },

  updateMessage: (id, content, isStreaming = false) => {
    set(state => ({
      messages: state.messages.map(m =>
        m.id === id ? { ...m, content, isStreaming } : m
      ),
    }))
  },

  clearMessages: () => {
    set({
      messages: [
        {
          id: uuidv4(),
          role: 'assistant',
          content: "Hello! I'm your thinking partner. What's on your mind?",
          timestamp: new Date().toISOString(),
        },
      ],
    })
  },

  setLoading: (loading) => set({ isLoading: loading }),
}))
