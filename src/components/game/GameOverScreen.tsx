'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface GameOverScreenProps {
  stationLog: string
  survived: boolean
  players: Array<{ name: string; role: string }>
  roomsSaved: number
  roomsLost: number
  roundsPlayed: number
  onPlayAgain: () => void
}

// Victory rising particles
function VictoryParticles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {Array.from({ length: 15 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${10 + Math.random() * 80}%`,
            bottom: '10%',
            width: `${2 + Math.random() * 4}px`,
            height: `${2 + Math.random() * 4}px`,
            background: `rgba(255, 215, 0, ${0.3 + Math.random() * 0.5})`,
            animation: `rise-up ${3 + Math.random() * 4}s ease-out infinite`,
            animationDelay: `${Math.random() * 5}s`,
          }}
        />
      ))}
    </div>
  )
}

// Defeat static/noise effect
function DefeatOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animFrame: number
    const animate = () => {
      canvas.width = 100
      canvas.height = 60
      const imageData = ctx.createImageData(100, 60)
      for (let i = 0; i < imageData.data.length; i += 4) {
        const v = Math.random() * 255
        imageData.data[i] = v * 0.8
        imageData.data[i + 1] = v * 0.2
        imageData.data[i + 2] = v * 0.2
        imageData.data[i + 3] = Math.random() * 15
      }
      ctx.putImageData(imageData, 0, 0)
      animFrame = requestAnimationFrame(animate)
    }
    animate()
    return () => cancelAnimationFrame(animFrame)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      style={{ imageRendering: 'pixelated', opacity: 0.3 }}
    />
  )
}

export default function GameOverScreen({
  stationLog,
  survived,
  players,
  roomsSaved,
  roomsLost,
  roundsPlayed,
  onPlayAgain,
}: GameOverScreenProps) {
  const [displayedLog, setDisplayedLog] = useState('')
  const [logComplete, setLogComplete] = useState(false)

  // Typewriter effect for station log
  useEffect(() => {
    setDisplayedLog('')
    setLogComplete(false)
    let idx = 0
    const timer = setInterval(() => {
      idx++
      setDisplayedLog(stationLog.slice(0, idx))
      if (idx >= stationLog.length) {
        setLogComplete(true)
        clearInterval(timer)
      }
    }, 15)
    return () => clearInterval(timer)
  }, [stationLog])

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${!survived ? 'defeat-darken' : ''}`}>
      {/* Background effects */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {survived ? (
        <div className="absolute inset-0 victory-glow pointer-events-none" />
      ) : (
        <DefeatOverlay />
      )}

      {/* Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none scanline-overlay" />

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 bg-[#0a0e17]/95 border border-cyan-900/40 rounded-xl p-4 sm:p-6 max-w-lg w-full mx-4 shadow-2xl backdrop-blur-md"
        style={{
          borderColor: survived ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
          boxShadow: survived
            ? '0 0 40px rgba(255, 215, 0, 0.1), 0 4px 30px rgba(0, 0, 0, 0.4)'
            : '0 0 40px rgba(239, 68, 68, 0.1), 0 4px 30px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Victory particles */}
        {survived && <VictoryParticles />}

        {/* Header */}
        <div className="text-center mb-4 sm:mb-6 relative z-10">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', duration: 0.8, delay: 0.2 }}
            className={`text-4xl sm:text-5xl mb-3 ${survived ? '' : ''}`}
          >
            {survived ? '🛡️' : '💀'}
          </motion.div>
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className={`text-xl sm:text-2xl font-mono font-bold mb-1 ${
              survived ? 'text-green-400 text-glow-green' : 'text-red-400 text-glow-red'
            }`}
          >
            {survived ? 'STATION HELD' : 'STATION LOST'}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-slate-500 text-[10px] sm:text-xs font-mono"
          >
            {survived ? 'The doors held. We survived.' : 'The silence is complete now.'}
          </motion.p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6 relative z-10">
          {[
            { value: roundsPlayed, label: 'ROUNDS', color: 'text-cyan-400' },
            { value: roomsSaved, label: 'SAVED', color: 'text-green-400' },
            { value: roomsLost, label: 'LOST', color: 'text-red-400' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 + i * 0.1 }}
              className="bg-[#0d1220] border border-slate-800/40 rounded-lg p-2 sm:p-3 text-center"
            >
              <div className={`text-base sm:text-lg font-mono font-bold ${stat.color}`}>
                {stat.value}
              </div>
              <div className="text-[8px] sm:text-[10px] font-mono text-slate-500">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Crew */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mb-3 sm:mb-4 relative z-10"
        >
          <div className="text-[10px] font-mono text-slate-500 mb-1 uppercase">Crew</div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {players.map(p => (
              <span
                key={p.name}
                className="text-[10px] sm:text-xs font-mono text-cyan-300 bg-cyan-900/20 px-2 py-0.5 rounded"
              >
                {p.name}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Station Log - Terminal style */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="bg-[#060a12] border border-cyan-900/20 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 relative z-10"
        >
          <div className="text-[10px] font-mono text-cyan-700 mb-2 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-50" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
            </span>
            STATION LOG
          </div>
          <div className="terminal-text text-[10px] sm:text-xs whitespace-pre-wrap leading-relaxed max-h-40 sm:max-h-60 overflow-y-auto game-scroll">
            {displayedLog}
            {!logComplete && <span className="terminal-cursor" />}
          </div>
        </motion.div>

        {/* Actions */}
        <div className="flex gap-2 sm:gap-3 relative z-10">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onPlayAgain}
            className="flex-1 py-3 bg-cyan-900/30 hover:bg-cyan-800/40 text-cyan-300 font-mono text-xs sm:text-sm border border-cyan-800/40 rounded-lg transition-colors touch-target"
          >
            ▶ PLAY AGAIN
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              navigator.clipboard.writeText(stationLog)
            }}
            className="py-3 px-3 sm:px-4 bg-slate-800/30 hover:bg-slate-700/40 text-slate-400 font-mono text-xs sm:text-sm border border-slate-700/40 rounded-lg transition-colors touch-target"
          >
            📋
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}
