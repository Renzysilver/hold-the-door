'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface AIDialogueProps {
  messages: string[]
  emotionalState: string
}

const STATE_COLORS: Record<string, string> = {
  confused: '#f59e0b',
  hopeful: '#22c55e',
  sad: '#6366f1',
  grateful: '#00d4ff',
  desperate: '#ef4444',
}

const STATE_LABELS: Record<string, string> = {
  confused: 'PROCESSING',
  hopeful: 'OPTIMISTIC',
  sad: 'MELANCHOLY',
  grateful: 'APPRECIATIVE',
  desperate: 'CRITICAL',
}

const STATE_BG: Record<string, string> = {
  confused: 'emotion-confused',
  hopeful: 'emotion-hopeful',
  sad: 'emotion-sad',
  grateful: 'emotion-grateful',
  desperate: 'emotion-desperate',
}

export default function AIDialogue({ messages, emotionalState }: AIDialogueProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [totalChars, setTotalChars] = useState(0)

  const targetChars = useMemo(() => messages.reduce((sum, m) => sum + m.length, 0), [messages])

  // Track previous target to detect new messages
  const prevTargetRef = useRef(0)

  // Typewriter animation
  useEffect(() => {
    if (targetChars !== prevTargetRef.current) {
      prevTargetRef.current = targetChars
    }
    const timer = setInterval(() => {
      setTotalChars(prev => {
        if (prev < targetChars) return prev + 1
        return prev
      })
    }, 20)
    return () => clearInterval(timer)
  }, [targetChars])

  // Reset displayed chars when new messages arrive (previous chars already shown)
  const prevMsgCountRef = useRef(0)
  useEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      // Don't reset totalChars - let it increment from where it is
      prevMsgCountRef.current = messages.length
    }
  }, [messages.length])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [totalChars])

  const displayedMessages = useMemo(() => {
    return messages.reduce<Array<{ text: string; displayText: string; done: boolean; cumChars: number }>>((acc, text) => {
      const prevCum = acc.length > 0 ? acc[acc.length - 1].cumChars : 0
      const available = Math.max(0, totalChars - prevCum)
      const chars = Math.min(available, text.length)
      acc.push({ text, displayText: text.slice(0, chars), done: chars >= text.length, cumChars: prevCum + chars })
      return acc
    }, [])
  }, [messages, totalChars])

  const stateColor = STATE_COLORS[emotionalState] || '#00d4ff'
  const stateLabel = STATE_LABELS[emotionalState] || emotionalState.toUpperCase()
  const emotionBg = STATE_BG[emotionalState] || ''

  return (
    <div className={`h-full flex flex-col bg-[#0a0e17] border border-cyan-900/30 rounded-lg overflow-hidden ${emotionBg}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-cyan-900/30 bg-[#0d1220]">
        <div className="relative">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: stateColor }}
          />
          <div
            className="absolute inset-0 w-2 h-2 rounded-full animate-ping"
            style={{ backgroundColor: stateColor, opacity: 0.4 }}
          />
        </div>
        <span className="text-[10px] font-mono tracking-wider text-cyan-400/70 uppercase">ARIA v2.7</span>
        <span
          className="text-[10px] font-mono ml-auto px-2 py-0.5 rounded-sm"
          style={{
            color: stateColor,
            backgroundColor: `${stateColor}15`,
            border: `1px solid ${stateColor}30`,
          }}
        >
          [{stateLabel}]
        </span>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-2 max-h-80 game-scroll"
      >
        {displayedMessages.length === 0 && (
          <div className="flex items-center gap-2 text-cyan-900/40 font-mono text-xs italic">
            <div className="w-1.5 h-4 bg-cyan-900/30 animate-pulse rounded-sm" />
            ARIA is silent... waiting for input.
          </div>
        )}
        <AnimatePresence>
          {displayedMessages.map((msg, i) => (
            <motion.div
              key={`${i}-${msg.text.slice(0, 10)}`}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="font-mono text-xs leading-relaxed"
            >
              {msg.text.startsWith('ARIA:') ? (
                <>
                  <span className="font-bold" style={{ color: stateColor }}>ARIA:</span>
                  <span className="text-cyan-200/80 ml-1">
                    {msg.displayText.replace('ARIA:', '')}
                  </span>
                  {!msg.done && (
                    <span
                      className="inline-block w-1.5 h-3 ml-0.5 align-middle"
                      style={{ backgroundColor: stateColor, animation: 'cursor-blink 0.7s step-end infinite' }}
                    />
                  )}
                </>
              ) : (
                <>
                  <span className="text-slate-400">{msg.displayText}</span>
                  {!msg.done && (
                    <span
                      className="inline-block w-1.5 h-3 ml-0.5 align-middle"
                      style={{ backgroundColor: stateColor, animation: 'cursor-blink 0.7s step-end infinite' }}
                    />
                  )}
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Bottom scan line effect */}
      <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
    </div>
  )
}
