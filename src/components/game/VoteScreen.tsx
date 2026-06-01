'use client'

import { useState } from 'react'
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0a0e17] border border-cyan-900/40 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl shadow-cyan-900/20">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-amber-400 text-sm font-mono mb-1 animate-pulse">⚠ CRITICAL DECISION ⚠</div>
          <h2 className="text-xl font-mono font-bold text-cyan-300 mb-1">{roomName}</h2>
          <p className="text-slate-400 text-xs font-mono">Vote to save or abandon this sector</p>
        </div>

        {/* Timer */}
        <div className="text-center mb-6">
          <div className={`text-3xl font-mono font-bold ${timer <= 10 ? 'text-red-400 animate-pulse' : 'text-cyan-400'}`}>
            {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
          </div>
        </div>

        {/* Vote buttons */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={onVoteSave}
            disabled={hasVoted}
            className={`py-4 px-3 rounded-lg border-2 font-mono text-sm transition-all ${
              votedSave
                ? 'border-green-500 bg-green-900/30 text-green-300'
                : hasVoted
                  ? 'border-slate-700 bg-slate-900/30 text-slate-600'
                  : 'border-green-700/50 bg-green-900/10 text-green-400 hover:bg-green-900/20 hover:border-green-500'
            }`}
          >
            <div className="text-2xl mb-1">🛡️</div>
            <div className="font-bold">SAVE</div>
            <div className="text-[10px] mt-1">Hold the door</div>
          </button>

          <button
            onClick={onVoteSacrifice}
            disabled={hasVoted}
            className={`py-4 px-3 rounded-lg border-2 font-mono text-sm transition-all ${
              votedSacrifice
                ? 'border-red-500 bg-red-900/30 text-red-300'
                : hasVoted
                  ? 'border-slate-700 bg-slate-900/30 text-slate-600'
                  : 'border-red-700/50 bg-red-900/10 text-red-400 hover:bg-red-900/20 hover:border-red-500'
            }`}
          >
            <div className="text-2xl mb-1">🚪</div>
            <div className="font-bold">ABANDON</div>
            <div className="text-[10px] mt-1">Let it go</div>
          </button>
        </div>

        {/* Vote count */}
        <div className="flex justify-center gap-6 text-xs font-mono">
          <div className="flex items-center gap-1">
            <span className="text-green-400">🛡️ Save:</span>
            <span className="text-green-300">{votes.save.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-red-400">🚪 Abandon:</span>
            <span className="text-red-300">{votes.sacrifice.length}</span>
          </div>
        </div>

        {/* Player votes */}
        <div className="mt-4 space-y-1">
          {players.map(p => {
            const pVotedSave = votes.save.includes(p.id)
            const pVotedSacrifice = votes.sacrifice.includes(p.id)
            return (
              <div key={p.id} className="flex items-center gap-2 text-xs font-mono">
                <span style={{ color: ROLE_COLORS[p.role] }}>{ROLE_ICONS[p.role]} {p.name}</span>
                <span className="ml-auto">
                  {pVotedSave && <span className="text-green-400">→ SAVE</span>}
                  {pVotedSacrifice && <span className="text-red-400">→ ABANDON</span>}
                  {!pVotedSave && !pVotedSacrifice && <span className="text-slate-600">waiting...</span>}
                </span>
              </div>
            )
          })}
        </div>

        {/* AI reaction */}
        {hasVoted && (
          <div className="mt-4 text-center text-xs font-mono text-cyan-400/60 italic">
            ARIA watches in silence...
          </div>
        )}
      </div>
    </div>
  )
}
