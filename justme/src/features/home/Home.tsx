import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotesStore, useJournalDates, useSpecialDays } from '../notes/useNotesStore'
import { useAuthStore } from '../auth/useAuthStore'
import DayJournalView from './DayJournalView'

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

/** Build a local YYYY-MM-DD string from local date parts — avoids UTC offset bugs */
function toLocalDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Today as local YYYY-MM-DD */
function todayStr(): string {
  const t = new Date()
  return toLocalDateStr(t.getFullYear(), t.getMonth(), t.getDate())
}

function getGreeting(): { text: string; icon: string } {
  const h = new Date().getHours()
  if (h < 12) return { text: 'Good morning', icon: '☀️' }
  if (h < 18) return { text: 'Good afternoon', icon: '🌤️' }
  return { text: 'Good evening', icon: '🌙' }
}

function getFirstName(email: string | undefined): string {
  if (!email) return ''
  const local = email.split('@')[0]
  // Capitalize first letter, strip numbers/dots
  return local.replace(/[^a-zA-Z]/g, '').charAt(0).toUpperCase() +
    local.replace(/[^a-zA-Z]/g, '').slice(1).toLowerCase()
}

function getNoteSnippet(content: any[]): string {
  if (!Array.isArray(content)) return ''
  for (const node of content) {
    for (const child of node.children || []) {
      if (child.text?.trim()) return child.text.trim()
    }
  }
  return ''
}

function relativeDate(dateStr: string): string {
  const now = new Date()
  const d = new Date(dateStr + 'T12:00:00') // local noon to avoid UTC offset
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Home(): React.ReactElement {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const notes = useNotesStore(state => state.notes)
  const { setActiveNoteId } = useNotesStore()
  const journalDatesString = useJournalDates()
  const journalDates = useMemo(() => {
    const dates = journalDatesString.split(',').filter(d => d !== '')
    return new Set(dates)
  }, [journalDatesString])

  const specialDaysString = useSpecialDays()
  const specialDays = useMemo(() => {
    try { return JSON.parse(specialDaysString) as Record<string, string> }
    catch { return {} as Record<string, string> }
  }, [specialDaysString])

  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState(today.getDate())
  const [journalDate, setJournalDate] = useState<string | null>(null)

  const TODAY_STR = todayStr()
  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth()
  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)

  const greeting = getGreeting()
  const firstName = getFirstName(user?.email)

  // Recent non-journal notes — top 4 by updatedAt
  const recentNotes = useMemo(() => {
    return notes
      .filter(n => !n.title.startsWith('journal::'))
      .slice(0, 4)
  }, [notes])

  // Today's journal note snippet
  const todayJournalNote = useMemo(() => {
    return notes.find(n => n.title === `journal::${TODAY_STR}`)
  }, [notes, TODAY_STR])

  // Calendar nav
  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
    setSelectedDay(1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
    setSelectedDay(1)
  }
  const jumpToToday = () => {
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth())
    setSelectedDay(today.getDate())
  }

  // Calendar grid
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="h-full w-full bg-[#f0f4f7] overflow-y-auto scroll-container pb-24 md:pb-6">

      {/* ── Greeting ─────────────────────────────────────── */}
      <div className="px-6 pt-5 pb-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[18px] font-bold text-gray-900 leading-tight">
              {greeting.text}{firstName ? `, ${firstName}` : ''} {greeting.icon}
            </p>
            <p className="text-[12px] text-gray-400 mt-0.5">
              {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          {/* Jump-to-today button — only visible when not on current month */}
          {!isCurrentMonth && (
            <button
              onClick={jumpToToday}
              className="px-3 py-1 rounded-full bg-[#00aeb1]/10 text-[#00aeb1] text-[11px] font-bold transition-all active:scale-95"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* ── Calendar Card ─────────────────────────────────── */}
      <div className="mx-6 mb-4 bg-white rounded-[20px] shadow-sm overflow-hidden">

        {/* Month Navigation */}
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-50 text-gray-500 transition-all active:scale-90"
            aria-label="Previous month"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span className="text-[14px] font-bold text-gray-900">{MONTHS[viewMonth]} {viewYear}</span>
          <button
            onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-50 text-gray-500 transition-all active:scale-90"
            aria-label="Next month"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        {/* Day Labels */}
        <div className="grid grid-cols-7 px-3 pb-1">
          {DAYS.map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-gray-400 py-1">{d}</div>
          ))}
        </div>

        {/* Date Grid */}
        <div className="grid grid-cols-7 px-3 pb-4 gap-y-1">
          {cells.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} />
            const dateStr = toLocalDateStr(viewYear, viewMonth, day)
            const dateObj = new Date(viewYear, viewMonth, day)
            const isToday = isCurrentMonth && day === today.getDate()
            const isSelected = day === selectedDay
            const hasJournal = journalDates.has(dateStr)
            const isSpecialDay = !!specialDays[dateStr]
            const isFuture = dateObj > today
            const isClickable = isToday || hasJournal
            const isPastEmpty = !isToday && !isFuture && !hasJournal

            return (
              <button
                key={day}
                onClick={() => {
                  setSelectedDay(day)
                  if (isClickable) setJournalDate(dateStr)
                }}
                disabled={isFuture || isPastEmpty}
                title={isPastEmpty ? 'No entry for this date' : undefined}
                aria-label={`${day} ${MONTHS[viewMonth]}${hasJournal ? ' — has journal entry' : ''}${isToday ? ' — today' : ''}`}
                className={[
                  'relative mx-auto w-8 h-8 flex items-center justify-center rounded-full text-[13px] font-semibold transition-all active:scale-90',
                  isSelected
                    ? 'bg-[#00aeb1] text-white shadow-md'
                    : isToday
                    ? 'border border-[#00aeb1] text-[#00aeb1]'
                    : isFuture
                    ? 'text-gray-200 cursor-default'
                    : isPastEmpty
                    ? 'text-gray-300 cursor-default'
                    : 'text-gray-700 hover:bg-gray-50',
                ].join(' ')}
              >
                {day}
                {/* Journal indicator — gold star for special days, teal dot for regular journal days */}
                {hasJournal && !isSelected && (
                  isSpecialDay ? (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] leading-none text-amber-400">★</span>
                  ) : (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#00aeb1]" />
                  )
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Today's Journal Card ──────────────────────────── */}
      <div className="mx-6 mb-4">
        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-2 px-1">Today's Entry</p>
        <button
          onClick={() => setJournalDate(TODAY_STR)}
          className="w-full text-left bg-white rounded-[16px] p-4 shadow-sm border border-transparent hover:border-[#00aeb1]/20 transition-all active:scale-[0.98]"
        >
          {todayJournalNote ? (
            <>
              <p className="text-[12px] font-bold text-[#00aeb1] uppercase tracking-widest mb-0.5">Continue writing</p>
              <p className="text-[14px] text-gray-800 font-medium leading-snug line-clamp-2">
                {getNoteSnippet(todayJournalNote.content) || 'Tap to continue your entry…'}
              </p>
            </>
          ) : (
            <>
              <p className="text-[12px] font-bold text-[#00aeb1] uppercase tracking-widest mb-0.5">Start writing</p>
              <p className="text-[14px] text-gray-400 leading-snug">
                How's your day going? Tap to begin today's journal entry…
              </p>
            </>
          )}
          <div className="flex items-center gap-1 mt-2 text-[#00aeb1]">
            <span className="text-[11px] font-bold">Open journal</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        </button>
      </div>

      {/* ── Recent Notes Strip ────────────────────────────── */}
      {recentNotes.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-2 px-7">Recent Notes</p>
          <div className="flex gap-3 overflow-x-auto scroll-container px-6 pb-2 [&::-webkit-scrollbar]:hidden">
            {recentNotes.map(note => (
              <button
                key={note.id}
                onClick={() => {
                  setActiveNoteId(note.id)
                  navigate('/notes')
                }}
                className="flex-shrink-0 w-[180px] text-left bg-white rounded-[16px] p-3 shadow-sm border border-transparent hover:border-[#00aeb1]/20 transition-all active:scale-95"
              >
                <p className="text-[13px] font-bold text-gray-900 truncate mb-0.5">
                  {note.title || 'Untitled'}
                </p>
                <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed mb-2">
                  {getNoteSnippet(note.content) || 'No content'}
                </p>
                <p className="text-[10px] text-gray-400 font-medium">
                  {relativeDate(note.updatedAt)}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── DayJournalView Overlay ───────────────────────── */}
      {journalDate && (
        <DayJournalView
          dateStr={journalDate}
          isToday={journalDate === TODAY_STR}
          onClose={() => setJournalDate(null)}
        />
      )}
    </div>
  )
}
