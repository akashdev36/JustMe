import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotesStore } from '../notes/useNotesStore'
import { useAuthStore } from '../auth/useAuthStore'
import DayJournalView from './DayJournalView'

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

export default function Home(): React.ReactElement {
  const navigate = useNavigate()
  const { notes } = useNotesStore()
  const { user } = useAuthStore()

  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState(today.getDate())
  const [journalDate, setJournalDate] = useState<string | null>(null)

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)
  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth()

  // Get dates that have notes for dot indicators
  const noteDates = new Set(notes.map(n => new Date(n.updatedAt).toDateString()))
  
  // Get dates that have journal entries
  const journalDates = new Set(
    notes
      .filter(n => n.title.startsWith('journal::'))
      .map(n => n.title.replace('journal::', ''))
  )

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


  // Build calendar grid
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="h-full w-full bg-[#f0f4f7] overflow-y-auto pb-24 md:pb-6">
      
      <div className="h-4" /> {/* Top spacer since greeting is gone */}

      {/* Calendar Card */}
      <div className="mx-6 mb-5 bg-white rounded-[28px] shadow-sm overflow-hidden mt-4">
        
        {/* Month Navigation */}
        <div className="px-6 pt-5 pb-3 flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-50 text-gray-500 transition-all active:scale-90"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span className="text-[16px] font-bold text-gray-900">{MONTHS[viewMonth]} {viewYear}</span>
          <button
            onClick={nextMonth}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-50 text-gray-500 transition-all active:scale-90"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        {/* Day Labels */}
        <div className="grid grid-cols-7 px-4 pb-2">
          {DAYS.map(d => (
            <div key={d} className="text-center text-[11px] font-bold text-gray-400 py-1">{d}</div>
          ))}
        </div>

        {/* Date Grid */}
        <div className="grid grid-cols-7 px-4 pb-5 gap-y-1">
          {cells.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} />
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dateObj = new Date(viewYear, viewMonth, day)
            const isToday = isCurrentMonth && day === today.getDate()
            const isSelected = day === selectedDay
            const hasNote = noteDates.has(dateObj.toDateString())
            const hasJournal = journalDates.has(dateStr)
            
            const isFuture = dateObj > today
            const isPastEmpty = !isToday && !isFuture && !hasJournal

            return (
              <button
                key={day}
                onClick={() => {
                  setSelectedDay(day)
                  if (!isFuture && (isToday || hasJournal)) {
                    setJournalDate(dateStr)
                  }
                }}
                disabled={isFuture || isPastEmpty}
                className={[
                  'relative mx-auto w-9 h-9 flex items-center justify-center rounded-full text-[14px] font-semibold transition-all active:scale-90',
                  isSelected
                    ? 'bg-[#00aeb1] text-white shadow-md'
                    : isToday
                    ? 'border-2 border-[#00aeb1] text-[#00aeb1]'
                    : isFuture
                    ? 'text-gray-200 cursor-default'
                    : isPastEmpty
                    ? 'text-gray-300 cursor-default'
                    : 'text-gray-700 hover:bg-gray-50'
                ].join(' ')}
              >
                {day}
                {/* Note dot indicator */}
                {hasNote && !isSelected && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#00aeb1]" />
                )}
                {/* Journal indicator - subtle line */}
                {hasJournal && !isSelected && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400 border border-white" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Day Journal View Overlay */}
      {journalDate && (
        <DayJournalView
          dateStr={journalDate}
          isToday={journalDate === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`}
          onClose={() => setJournalDate(null)}
        />
      )}

    </div>
  )
}

function getPreview(content: any[]): string {
  if (!content || !Array.isArray(content)) return ''
  for (const node of content) {
    if (node.children) {
      for (const child of node.children) {
        if (child.text && child.text.trim() !== '') return child.text.trim()
      }
    }
  }
  return ''
}
