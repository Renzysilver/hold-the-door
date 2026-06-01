'use client'

import { useEffect, useRef, useState, useMemo } from 'react'

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

export default function AIDialogue({ messages, emotionalState }: AIDialogueProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [totalChars, setTotalChars] = useState(0)

  // Target: total characters that should be visible
  const targetChars = useMemo(() => messages.reduce((sum, m) => sum + m.length, 0), [messages])

  // Typewriter animation via interval callback (async, not direct setState in effect)
  useEffect(() => {
    const timer = setInterval(() => {
      setTotalChars(prev => {
        if (prev < targetChars) return prev + 1
        return prev
      })
    }, 25)
    return () => clearInterval(timer)
  }, [targetChars])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [totalChars])

  // Compute displayed messages from totalChars
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

  return (
    <div className="h-full flex flex-col bg-[#0a0e17] border border-cyan-900/30 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-cyan-900/30 bg-[#0d1220]">
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: stateColor }} />
        <span className="text-[10px] font-mono tracking-wider text-cyan-400/70 uppercase">ARIA v2.7</span>
        <span className="text-[10px] font-mono ml-auto" style={{ color: stateColor }}>
          [{emotionalState}]
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 max-h-80" style={{
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(0, 212, 255, 0.2) transparent',
      }}>
        {displayedMessages.length === 0 && (
          <div className="text-cyan-900/40 font-mono text-xs italic">
            ARIA is silent... waiting for input.
          </div>
        )}
        {displayedMessages.map((msg, i) => (
          <div key={i} className="font-mono text-xs leading-relaxed">
            {msg.text.startsWith('ARIA:') ? (
              <>
                <span className="text-cyan-400 font-bold">ARIA:</span>
                <span className="text-cyan-200/80 ml-1">
                  {msg.displayText.replace('ARIA:', '')}
                </span>
                {!msg.done && <span className="text-cyan-400 animate-pulse">▌</span>}
              </>
            ) : (
              <>
                <span className="text-slate-400">{msg.displayText}</span>
                {!msg.done && <span className="text-cyan-400 animate-pulse">▌</span>}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Bottom scan line effect */}
      <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
    </div>
  )
}
