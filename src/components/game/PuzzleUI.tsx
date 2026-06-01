'use client'

import { useState, useCallback } from 'react'
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
      <div className="text-center text-cyan-400/60 font-mono text-sm py-4">
        All repair tasks completed in this sector.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {activeTasks.map(task => (
        <div key={task.id} className="bg-[#0d1220] border border-cyan-900/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-cyan-300 font-mono text-xs font-bold uppercase">{task.type}</span>
              <span className="text-slate-500 font-mono text-xs ml-2">requires: {task.requiredRole}</span>
            </div>
            <span className="text-cyan-400/60 font-mono text-xs">{task.progress}%</span>
          </div>
          <p className="text-slate-400 text-xs mb-2">{task.description}</p>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-slate-800 rounded-full mb-3 overflow-hidden">
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

          {/* Quick interact button */}
          <button
            onClick={() => onInteract(task.id)}
            className="mt-2 w-full py-1.5 text-xs font-mono bg-cyan-900/30 hover:bg-cyan-800/40 text-cyan-300 border border-cyan-800/40 rounded transition-colors"
          >
            {task.requiredRole === player.role ? '⟳ REPAIR (Role Bonus)' : '⟳ ASSIST'}
          </button>
        </div>
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
      // Make connection
      if (selectedNode !== nodeId) {
        onPuzzleInput(task.id, { connection: [selectedNode, nodeId] })
      }
      setSelectedNode(null)
    }
  }

  return (
    <div>
      <p className="text-xs text-slate-500 mb-1 font-mono">Connect the nodes to match the target pattern.</p>
      {player.role === 'engineer' && (
        <p className="text-xs text-amber-400/70 mb-2 font-mono">Target: {pd.targetConnections.map(([a, b]: [number, number]) => `N${a}→N${b}`).join(', ')}</p>
      )}
      <div className="flex gap-2 flex-wrap">
        {pd.nodes.map((node: { id: number; label: string }) => (
          <button
            key={node.id}
            onClick={() => handleNodeClick(node.id)}
            className={`w-10 h-10 rounded border text-xs font-mono transition-all ${
              selectedNode === node.id
                ? 'border-cyan-400 bg-cyan-900/50 text-cyan-300'
                : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-cyan-700'
            }`}
          >
            {node.label}
          </button>
        ))}
      </div>
      {pd.playerConnections?.length > 0 && (
        <div className="mt-2 text-xs text-cyan-400/60 font-mono">
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
      <p className="text-xs text-slate-500 mb-1 font-mono">Find anomalies in the grid (values &gt; 10).</p>
      {player.role === 'medic' && (
        <p className="text-xs text-green-400/70 mb-2 font-mono">You can see the full data. Guide others!</p>
      )}
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${pd.gridSize}, 1fr)` }}>
        {pd.grid.map((row: number[], r: number) =>
          row.map((val: number, c: number) => {
            const isSelected = selected.some(([sr, sc]) => sr === r && sc === c)
            return (
              <button
                key={`${r}-${c}`}
                onClick={() => handleCellClick(r, c)}
                className={`w-8 h-8 text-xs font-mono rounded border transition-all ${
                  isSelected
                    ? 'border-amber-500 bg-amber-900/30 text-amber-300'
                    : val > 10
                      ? 'border-slate-600 bg-slate-800/50 text-red-400' // revealed anomaly
                      : 'border-slate-700 bg-slate-800/30 text-slate-500 hover:border-slate-600'
                }`}
              >
                {val}
              </button>
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
        <p className="text-xs text-amber-400/70 mb-1 font-mono">Code: {pd.code.join(' - ')}</p>
      )}
      <p className="text-xs text-slate-500 mb-2 font-mono">
        Input 4-digit code. Power needed: {pd.requiredPower}%
      </p>

      {/* Code display */}
      <div className="flex gap-2 mb-2">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="w-8 h-10 border border-cyan-800/50 rounded bg-slate-900/50 flex items-center justify-center text-cyan-300 font-mono text-sm">
            {code[i] !== undefined ? code[i] : '_'}
          </div>
        ))}
      </div>

      {/* Number pad */}
      <div className="grid grid-cols-5 gap-1 mb-2">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
          <button
            key={d}
            onClick={() => handleDigit(d)}
            className="h-7 text-xs font-mono bg-slate-800/50 border border-slate-700 rounded text-slate-300 hover:bg-slate-700/50 hover:border-cyan-700 transition-colors"
          >
            {d}
          </button>
        ))}
      </div>

      <button onClick={handleClear} className="text-xs text-red-400/70 font-mono hover:text-red-300">
        Clear
      </button>

      {/* Power slider (Captain) */}
      {player.role === 'captain' && (
        <div className="mt-2">
          <label className="text-xs text-slate-400 font-mono">Power Level: {power}%</label>
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
            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
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
      <p className="text-xs text-slate-500 mb-2 font-mono">Select the correct power route (1-4).</p>
      <div className="flex gap-2">
        {[1, 2, 3, 4].map(route => (
          <button
            key={route}
            onClick={() => onPuzzleInput(task.id, { selectedRoute: route })}
            className={`w-10 h-10 rounded border text-sm font-mono transition-all ${
              pd.selectedRoute === route
                ? 'border-green-500 bg-green-900/30 text-green-300'
                : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-cyan-700'
            }`}
          >
            R{route}
          </button>
        ))}
      </div>
    </div>
  )
}
