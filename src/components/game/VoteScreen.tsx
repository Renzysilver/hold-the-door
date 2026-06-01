'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Player } from './types'
import { ROLE_COLORS, ROLE_ICONS } from './types'

interface VoteScreenProps {
  player: Player
  votes: { save: string[]; sacrifice: string[] }
  players: Player[]
  timer: number
  roomName: string
  onVoteSave: () => void
  onVoteSacrifice: () => void
}

export default function VoteScreen({
  player,
  votes,
  players,
  timer,
  roomName,
  onVoteSave,
  onVoteSacrifice,
}: VoteScreenProps) {
  const hasVoted = votes.save.includes(player.id) || votes.sacrifice.includes(player.id)
  const votedSave = votes.save.includes(player.id)
  const votedSacrifice = votes.sacrifice.includes(player.id)
  const isUrgent = timer <= 10

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Dark backdrop with split lighting */}
      <div className="absolute inset-0">
        {/* Left half - green tint */}
        <div className="absolute inset-y-0 left-0 w-1/2 bg-green-900/10" />
        {/* Right half - red tint */}
        <div className="absolute inset-y-0 right-0 w-1/2 bg-red-900/10" />
        {/* Center divider glow */}
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent" />
        {/* Overall dark overlay */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      </div>

      {/* Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none scanline-overlay" />

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 bg-[#0a0e17]/95 border border-cyan-900/40 rounded-xl p-4 sm:p-6 max-w-lg w-full mx-4 shadow-2xl shadow-cyan-900/20 backdrop-blur-md"
      >
        {/* Header */}
        <div className="text-center mb-4 sm:mb-6">
          <motion.div
            animate={isUrgent ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            <div className={`text-sm font-mono mb-1 ${isUrgent ? 'text-red-400' : 'text-amber-400'}`}>
              ⚠ CRITICAL DECISION ⚠
            </div>
          </motion.div>
          <h2 className="text-lg sm:text-xl font-mono font-bold text-cyan-300 mb-1">{roomName}</h2>
          <p className="text-slate-400 text-[10px] sm:text-xs font-mono">Vote to save or abandon this sector</p>
        </div>

        {/* Timer */}
        <div className="text-center mb-4 sm:mb-6">
          <motion.div
            animate={isUrgent ? {
              scale: [1, 1.15, 1],
              color: timer <= 5 ? ['#ef4444', '#fca5a5', '#ef4444'] : ['#f59e0b', '#fde68a', '#f59e0b'],
            } : {}}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
            className={`text-3xl sm:text-4xl font-mono font-bold ${isUrgent ? 'text-red-400' : 'text-cyan-400'}`}
          >
            {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
          </motion.div>
          {isUrgent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[10px] font-mono text-red-400 mt-1"
            >
              TIME IS RUNNING OUT
            </motion.div>
          )}
        </div>

        {/* Vote buttons - dramatic split */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {/* SAVE button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onVoteSave}
            disabled={hasVoted}
            className={`relative py-4 sm:py-6 px-2 sm:px-3 rounded-lg border-2 font-mono text-sm transition-all touch-target overflow-hidden ${
              votedSave
                ? 'border-green-500 bg-green-900/30 text-green-300'
                : hasVoted
                  ? 'border-slate-700 bg-slate-900/30 text-slate-600'
                  : 'border-green-700/50 bg-green-900/10 text-green-400 hover:bg-green-900/20 hover:border-green-500'
            }`}
            style={votedSave ? { animation: 'vote-save-glow 2s ease-in-out infinite' } : {}}
          >
            {/* Background glow effect */}
            {!hasVoted && (
              <div className="absolute inset-0 bg-gradient-to-t from-green-900/20 to-transparent opacity-50" />
            )}
            <div className="relative z-10">
              <div className="text-2xl sm:text-3xl mb-1">🛡️</div>
              <div className="font-bold text-sm sm:text-base">SAVE</div>
              <div className="text-[9px] sm:text-[10px] mt-1 opacity-70">Hold the door</div>
            </div>
          </motion.button>

          {/* SACRIFICE button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onVoteSacrifice}
            disabled={hasVoted}
            className={`relative py-4 sm:py-6 px-2 sm:px-3 rounded-lg border-2 font-mono text-sm transition-all touch-target overflow-hidden ${
              votedSacrifice
                ? 'border-red-500 bg-red-900/30 text-red-300'
                : hasVoted
                  ? 'border-slate-700 bg-slate-900/30 text-slate-600'
                  : 'border-red-700/50 bg-red-900/10 text-red-400 hover:bg-red-900/20 hover:border-red-500'
            }`}
            style={votedSacrifice ? { animation: 'vote-sacrifice-glow 2s ease-in-out infinite' } : {}}
          >
            {!hasVoted && (
              <div className="absolute inset-0 bg-gradient-to-t from-red-900/20 to-transparent opacity-50" />
            )}
            <div className="relative z-10">
              <div className="text-2xl sm:text-3xl mb-1">🚪</div>
              <div className="font-bold text-sm sm:text-base">ABANDON</div>
              <div className="text-[9px] sm:text-[10px] mt-1 opacity-70">Let it go</div>
            </div>
          </motion.button>
        </div>

        {/* Vote count */}
        <div className="flex justify-center gap-4 sm:gap-6 text-xs font-mono mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-green-400">🛡️</span>
            <span className="text-green-300 font-bold">{votes.save.length}</span>
          </div>
          <div className="w-px h-4 bg-slate-700" />
          <div className="flex items-center gap-1.5">
            <span className="text-red-400">🚪</span>
            <span className="text-red-300 font-bold">{votes.sacrifice.length}</span>
          </div>
        </div>

        {/* Player votes with animations */}
        <div className="space-y-1">
          <AnimatePresence>
            {players.map((p, i) => {
              const pVotedSave = votes.save.includes(p.id)
              const pVotedSacrifice = votes.sacrifice.includes(p.id)
              const hasPVoted = pVotedSave || pVotedSacrifice
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className="flex items-center gap-2 text-xs font-mono py-1"
                >
                  <span style={{ color: ROLE_COLORS[p.role] }}>
                    {ROLE_ICONS[p.role]} {p.name}
                  </span>
                  <span className="ml-auto">
                    {pVotedSave && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-green-400 font-bold"
                      >
                        → SAVE
                      </motion.span>
                    )}
                    {pVotedSacrifice && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-red-400 font-bold"
                      >
                        → ABANDON
                      </motion.span>
                    )}
                    {!hasPVoted && (
                      <span className="text-slate-600">
                        <motion.span
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          waiting...
                        </motion.span>
                      </span>
                    )}
                  </span>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {/* AI reaction */}
        {hasVoted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-4 text-center text-xs font-mono text-cyan-400/60 italic"
          >
            ARIA watches in silence...
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
