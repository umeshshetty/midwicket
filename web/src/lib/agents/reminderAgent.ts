/**
 * Reminder Agent — single-pass Haiku tool_use call.
 * Scans note text for temporal information and action items,
 * returns structured reminders with ISO dates where resolvable.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { Note } from '../../types'
import type { useRemindersStore } from '../../stores/remindersStore'

type RemindersStoreState = ReturnType<typeof useRemindersStore.getState>

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
})

const REMINDER_TOOLS: Anthropic.Tool[] = [
  {
    name: 'extract_reminders',
    description: 'Extract tasks, events, deadlines, and reminders from note text.',
    input_schema: {
      type: 'object' as const,
      properties: {
        reminders: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description: 'The verbatim sentence or phrase from the note',
              },
              action: {
                type: 'string',
                description: 'Clean imperative: "Call Sarah", "Submit report", "Review proposal"',
              },
              person: {
                type: 'string',
                description: 'Person associated with this action. Omit if none.',
              },
              date_text: {
                type: 'string',
                description: 'Original date/time text from note: "next Tuesday", "by EOD", "March 15 at 3pm"',
              },
              parsed_date: {
                type: 'string',
                description: 'ISO 8601 date (YYYY-MM-DD) if resolvable from the date_text. Omit if uncertain.',
              },
              type: {
                type: 'string',
                enum: ['task', 'event', 'deadline', 'reminder'],
                description: 'task=action to do, event=happening at a time, deadline=must be done by, reminder=general recall',
              },
              priority: {
                type: 'string',
                enum: ['high', 'medium', 'low'],
                description: 'high=urgent/today/ASAP, medium=this week, low=someday/vague',
              },
            },
            required: ['text', 'action', 'date_text', 'type', 'priority'],
          },
        },
      },
      required: ['reminders'],
    },
  },
]

const REMINDER_SYSTEM = `You are a temporal and action-item extraction engine.
Call extract_reminders exactly once.
Extract ONLY items with a clear temporal or action dimension.
If the note has NO actionable or temporal content, return an empty reminders array.
parsed_date MUST be a valid ISO 8601 date (YYYY-MM-DD) or omitted entirely.
Today's date is provided in each message — use it to resolve relative dates.`

interface ExtractedReminders {
  reminders: Array<{
    text: string
    action: string
    person?: string
    date_text: string
    parsed_date?: string
    type: string
    priority: string
  }>
}

export async function analyzeNoteForReminders(
  note: Note,
  remindersStore: RemindersStoreState
): Promise<void> {
  if (!import.meta.env.VITE_ANTHROPIC_API_KEY) return
  if (note.plainText.trim().length < 10) return

  try {
    const todayISO = new Date().toISOString().slice(0, 10)

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: REMINDER_SYSTEM,
      tools: REMINDER_TOOLS,
      tool_choice: { type: 'any' },
      messages: [
        {
          role: 'user',
          content: `Today's date: ${todayISO}

Extract all time-sensitive items, action items, events, and reminders from this note.

Title: ${note.title}
Text: ${note.plainText}`,
        },
      ],
    })

    const toolUse = response.content.find(b => b.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') return

    const { reminders } = toolUse.input as ExtractedReminders

    // Replace any prior reminders for this note (handles edits)
    remindersStore.deleteRemindersForNote(note.id)

    for (const r of reminders) {
      // Validate parsed_date is a plausible ISO date before storing
      const validDate =
        r.parsed_date && /^\d{4}-\d{2}-\d{2}$/.test(r.parsed_date)
          ? r.parsed_date
          : undefined

      remindersStore.addReminder({
        noteId: note.id,
        text: r.text,
        action: r.action,
        person: r.person,
        dateText: r.date_text,
        parsedDate: validDate,
        type: r.type as 'task' | 'event' | 'deadline' | 'reminder',
        priority: r.priority as 'high' | 'medium' | 'low',
      })
    }
  } catch (err) {
    console.warn('[ReminderAgent] Analysis failed for note', note.id, err)
  }
}
