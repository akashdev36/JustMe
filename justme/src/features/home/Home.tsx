import React from 'react'

import { useNavigate } from 'react-router-dom'
import { useNotesStore } from '../notes/useNotesStore'

export default function Home(): React.ReactElement {
  const navigate = useNavigate()
  const { notes } = useNotesStore()

  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-sm w-full px-6">
        <button
          onClick={() => navigate('/notes')}
          type="button"
          className="bg-white border border-gray-200 hover:border-gray-300 rounded-2xl p-6 flex flex-col items-center gap-2 transition-all shadow-sm group text-center"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 transition-colors group-hover:bg-emerald-100">
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-gray-900 font-sans">Notes</span>
            <span className="text-xs text-gray-400 font-sans">{notes.length} note{notes.length !== 1 ? 's' : ''}</span>
          </div>
        </button>
      </div>
    </div>
  )
}
