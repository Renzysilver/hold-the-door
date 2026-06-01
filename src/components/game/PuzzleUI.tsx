'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { RoomNode, Player, RepairTask } from './types'

interface PuzzleUIProps {
  room: RoomNode | null
  player: Player | null
  onPuzzleInput: (taskId: string, puzzleData: any) => void
  onInteract: (taskId: string) => void
}

export default function PuzzleUI({ room, player, onPuzzleInput, onInteract }: PuzzleUIProps) {
  if (!room || !player) return null

  const activeTasks = room.repairTasks.filter(t => !t.completed)
  if (activeTasks.length === 0) {
    return (
      <div className="text-center text-cyan-400/60 font-mono text-xs sm:text-sm py-4">
        All repair tasks completed in this sector. ✓
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {activeTasks.map((task, idx) => (
        <motion.div
          key={task.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1, duration: 0.3 }}
          className="bg-[#0d1220] border border-cyan-900/30 rounded-lg p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-cyan-300 font-mono text-[10px] sm:text-xs font-bold uppercase">{task.type}</span>
              <span className="text-slate-600 font-mono text-[9px] sm:text-[10px]">
                needs: {task.requiredRole}
              </span>
              {task.requiredRole === player.role && (
                <span className="text-[8px] font-mono text-amber-400 bg-amber-900/20 px-1.5 py-0.5 rounded">
                  ROLE BONUS
                </span>
              )}
            </div>
            <span className="text-cyan-400/60 font-mono text-[10px] sm:text-xs">{task.progress}%</span>
          </div>
          <p className="text-slate-400 text-[10px] sm:text-xs mb-2">{task.description}</p>

          {/* Progress bar with shimmer */}
          <div className="w-full h-2 bg-slate-800 rounded-full mb-3 overflow-hidden progress-bar-glow">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full transition-all duration-300"
              style={{ width: `${task.progress}%` }}
            />
          </div>

          {/* Puzzle-specific UI */}
          {task.type === 'wiring' && task.puzzleData && (
            <WiringPuzzle task={task} player={player} onPuzzleInput={onPuzzleInput} onInteract={onInteract} />
          )}
          {task.type === 'diagnostic' && task.puzzleData && (
            <DiagnosticPuzzle task={task} player={player} onPuzzleInput={onPuzzleInput} onInteract={onInteract} />
          )}
          {task.type === 'override' && task.puzzleData && (
            <OverridePuzzle task={task} player={player} onPuzzleInput={onPuzzleInput} onInteract={onInteract} />
          )}
          {task.type === 'routing' && task.puzzleData && (
            <RoutingPuzzle task={task} player={player} onPuzzleInput={onPuzzleInput} onInteract={onInteract} />
          )}

          {/* Quick interact button - touch-friendly */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onInteract(task.id)}
            className="mt-2 w-full py-2.5 sm:py-1.5 text-xs font-mono bg-cyan-900/30 hover:bg-cyan-800/40 text-cyan-300 border border-cyan-800/40 rounded-lg transition-colors touch-target"
          >
            {task.requiredRole === player.role ? '⟳ REPAIR (Role Bonus)' : '⟳ ASSIST'}
          </motion.button>
        </motion.div>
      ))}
    </div>
  )
}

// ---- WIRING PUZZLE ----
function WiringPuzzle({ task, player, onPuzzleInput, onInteract }: {
  task: RepairTask; player: Player; onPuzzleInput: (id: string, data: any) => void; onInteract: (id: string) => void
}) {
  const [selectedNode, setSelectedNode] = useState<number | null>(null)
  const pd = task.puzzleData

  const handleNodeClick = (nodeId: number) => {
    if (selectedNode === null) {
      setSelectedNode(nodeId)
    } else {
      if (selectedNode !== nodeId) {
        onPuzzleInput(task.id, { connection: [selectedNode, nodeId] })
      }
      setSelectedNode(null)
    }
  }

  return (
    <div>
      <p className="text-[10px] text-slate-500 mb-1.5 font-mono">Connect the nodes to match the target pattern.</p>
      {player.role === 'engineer' && (
        <p className="text-[10px] text-amber-400/70 mb-2 font-mono">
          Target: {pd.targetConnections.map(([a, b]: [number, number]) => `N${a}→N${b}`).join(', ')}
        </p>
      )}
      <div className="flex gap-2 flex-wrap">
        {pd.nodes.map((node: { id: number; label: string }) => (
          <motion.button
            key={node.id}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleNodeClick(node.id)}
            className={`puzzle-btn border text-xs font-mono ${
              selectedNode === node.id
                ? 'border-cyan-400 bg-cyan-900/50 text-cyan-300 shadow-[0_0_10px_rgba(0,212,255,0.3)]'
                : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-cyan-700'
            }`}
          >
            {node.label}
          </motion.button>
        ))}
      </div>
      {pd.playerConnections?.length > 0 && (
        <div className="mt-2 text-[10px] text-cyan-400/60 font-mono">
          Connected: {pd.playerConnections.map(([a, b]: [number, number]) => `N${a}-N${b}`).join(', ')}
        </div>
      )}
    </div>
  )
}

// ---- DIAGNOSTIC PUZZLE ----
function DiagnosticPuzzle({ task, player, onPuzzleInput, onInteract }: {
  task: RepairTask; player: Player; onPuzzleInput: (id: string, data: any) => void; onInteract: (id: string) => void
}) {
  const [selected, setSelected] = useState<Array<[number, number]>>([])
  const pd = task.puzzleData

  const handleCellClick = (r: number, c: number) => {
    const exists = selected.some(([sr, sc]) => sr === r && sc === c)
    if (exists) {
      onPuzzleInput(task.id, { selection: [r, c] })
    } else {
      setSelected(prev => [...prev, [r, c]])
      onPuzzleInput(task.id, { selection: [r, c] })
    }
  }

  return (
    <div>
      <p className="text-[10px] text-slate-500 mb-1.5 font-mono">Find anomalies in the grid (values &gt; 10).</p>
      {player.role === 'medic' && (
        <p className="text-[10px] text-green-400/70 mb-2 font-mono">You can see the full data. Guide others!</p>
      )}
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${pd.gridSize}, 1fr)` }}>
        {pd.grid.map((row: number[], r: number) =>
          row.map((val: number, c: number) => {
            const isSelected = selected.some(([sr, sc]) => sr === r && sc === c)
            return (
              <motion.button
                key={`${r}-${c}`}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleCellClick(r, c)}
                className={`puzzle-btn border text-xs font-mono ${
                  isSelected
                    ? 'border-amber-500 bg-amber-900/30 text-amber-300'
                    : val > 10
                      ? 'border-slate-600 bg-slate-800/50 text-red-400'
                      : 'border-slate-700 bg-slate-800/30 text-slate-500 hover:border-slate-600'
                }`}
              >
                {val}
              </motion.button>
            )
          })
        )}
      </div>
    </div>
  )
}

// ---- OVERRIDE PUZZLE ----
function OverridePuzzle({ task, player, onPuzzleInput, onInteract }: {
  task: RepairTask; player: Player; onPuzzleInput: (id: string, data: any) => void; onInteract: (id: string) => void
}) {
  const [code, setCode] = useState<number[]>([])
  const [power, setPower] = useState(task.puzzleData.powerLevel || 50)
  const pd = task.puzzleData

  const handleDigit = (d: number) => {
    if (code.length < 4) {
      const newCode = [...code, d]
      setCode(newCode)
      if (newCode.length === 4) {
        onPuzzleInput(task.id, { code: newCode, powerLevel: power })
      }
    }
  }

  const handleClear = () => {
    setCode([])
  }

  return (
    <div>
      {player.role === 'engineer' && (
        <p className="text-[10px] text-amber-400/70 mb-1 font-mono">Code: {pd.code.join(' - ')}</p>
      )}
      <p className="text-[10px] text-slate-500 mb-2 font-mono">
        Input 4-digit code. Power needed: {pd.requiredPower}%
      </p>

      {/* Code display */}
      <div className="flex gap-2 mb-2 justify-center">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`w-10 h-12 border rounded-lg flex items-center justify-center text-cyan-300 font-mono text-base transition-colors ${
              code[i] !== undefined
                ? 'border-cyan-600 bg-cyan-900/30'
                : 'border-slate-700 bg-slate-900/50'
            }`}
          >
            {code[i] !== undefined ? code[i] : '_'}
          </div>
        ))}
      </div>

      {/* Number pad - large touch-friendly buttons */}
      <div className="grid grid-cols-5 gap-1.5 mb-2">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
          <motion.button
            key={d}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleDigit(d)}
            className="puzzle-btn bg-slate-800/50 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700/50 hover:border-cyan-700 transition-colors font-mono"
          >
            {d}
          </motion.button>
        ))}
      </div>

      <button
        onClick={handleClear}
        className="text-[10px] text-red-400/70 font-mono hover:text-red-300 touch-target"
      >
        ✕ Clear
      </button>

      {/* Power slider (Captain) */}
      {player.role === 'captain' && (
        <div className="mt-2">
          <label className="text-[10px] text-slate-400 font-mono">Power Level: {power}%</label>
          <input
            type="range"
            min={0}
            max={100}
            value={power}
            onChange={e => {
              const v = parseInt(e.target.value)
              setPower(v)
              onPuzzleInput(task.id, { powerLevel: v })
            }}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 mt-1"
          />
        </div>
      )}
    </div>
  )
}

// ---- ROUTING PUZZLE ----
function RoutingPuzzle({ task, player, onPuzzleInput, onInteract }: {
  task: RepairTask; player: Player; onPuzzleInput: (id: string, data: any) => void; onInteract: (id: string) => void
}) {
  const pd = task.puzzleData

  return (
    <div>
      <p className="text-[10px] text-slate-500 mb-2 font-mono">Select the correct power route (1-4).</p>
      <div className="flex gap-2 justify-center">
        {[1, 2, 3, 4].map(route => (
          <motion.button
            key={route}
            whileTap={{ scale: 0.9 }}
            onClick={() => onPuzzleInput(task.id, { selectedRoute: route })}
            className={`puzzle-btn border text-sm font-mono ${
              pd.selectedRoute === route
                ? 'border-green-500 bg-green-900/30 text-green-300 shadow-[0_0_10px_rgba(34,197,94,0.3)]'
                : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-cyan-700'
            }`}
          >
            R{route}
          </motion.button>
        ))}
      </div>
    </div>
  )
}
