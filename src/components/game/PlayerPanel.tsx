'use client'

import { Player } from './types'
import { ROLE_COLORS, ROLE_ICONS } from './types'

interface PlayerPanelProps {
  player: Player
  allPlayers: Player[]
}

export default function PlayerPanel({ player, allPlayers }: PlayerPanelProps) {
  return (
    <div className="space-y-2">
      {/* Current player */}
      <div className="bg-[#0d1220] border border-cyan-900/30 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{ROLE_ICONS[player.role]}</span>
          <div>
            <div className="text-sm font-mono font-bold" style={{ color: ROLE_COLORS[player.role] }}>
              {player.name}
            </div>
            <div className="text-[10px] font-mono text-slate-500 uppercase">{player.role}</div>
          </div>
        </div>

        {/* Health bar */}
        <div className="mb-2">
          <div className="flex justify-between text-[10px] font-mono mb-0.5">
            <span className="text-slate-500">HEALTH</span>
            <span className={player.health > 50 ? 'text-green-400' : player.health > 25 ? 'text-amber-400' : 'text-red-400'}>
              {player.health}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                player.health > 50 ? 'bg-green-500' : player.health > 25 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${player.health}%` }}
            />
          </div>
        </div>

        {/* Tool */}
        {player.hasTool && (
          <div className="text-[10px] font-mono text-amber-400/70 bg-amber-900/20 rounded px-2 py-0.5 inline-block">
            🔧 {player.toolType || 'Tool'} equipped
          </div>
        )}
      </div>

      {/* Other players */}
      <div className="space-y-1">
        {allPlayers
          .filter(p => p.id !== player.id)
          .map(p => (
            <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 bg-[#0d1220]/60 border border-slate-800/30 rounded">
              <span className="text-sm">{ROLE_ICONS[p.role]}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono truncate" style={{ color: ROLE_COLORS[p.role] }}>
                  {p.name}
                </div>
                <div className="text-[9px] font-mono text-slate-600 uppercase">{p.role}</div>
              </div>
              <div className="w-12">
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${p.health > 50 ? 'bg-green-500/50' : p.health > 25 ? 'bg-amber-500/50' : 'bg-red-500/50'}`}
                    style={{ width: `${p.health}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
