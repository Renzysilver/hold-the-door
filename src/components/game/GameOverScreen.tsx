'use client'

interface GameOverScreenProps {
  stationLog: string
  survived: boolean
  players: Array<{ name: string; role: string }>
  roomsSaved: number
  roomsLost: number
  roundsPlayed: number
  onPlayAgain: () => void
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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0a0e17] border border-cyan-900/40 rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl shadow-cyan-900/20">
        {/* Header */}
        <div className="text-center mb-6">
          <div className={`text-4xl mb-3 ${survived ? 'animate-bounce' : ''}`}>
            {survived ? '🛡️' : '💀'}
          </div>
          <h1 className={`text-2xl font-mono font-bold mb-1 ${survived ? 'text-green-400' : 'text-red-400'}`}>
            {survived ? 'STATION HELD' : 'STATION LOST'}
          </h1>
          <p className="text-slate-500 text-xs font-mono">
            {survived ? 'The doors held. We survived.' : 'The silence is complete now.'}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[#0d1220] border border-slate-800/40 rounded-lg p-3 text-center">
            <div className="text-lg font-mono font-bold text-cyan-400">{roundsPlayed}</div>
            <div className="text-[10px] font-mono text-slate-500">ROUNDS</div>
          </div>
          <div className="bg-[#0d1220] border border-slate-800/40 rounded-lg p-3 text-center">
            <div className="text-lg font-mono font-bold text-green-400">{roomsSaved}</div>
            <div className="text-[10px] font-mono text-slate-500">SAVED</div>
          </div>
          <div className="bg-[#0d1220] border border-slate-800/40 rounded-lg p-3 text-center">
            <div className="text-lg font-mono font-bold text-red-400">{roomsLost}</div>
            <div className="text-[10px] font-mono text-slate-500">LOST</div>
          </div>
        </div>

        {/* Crew */}
        <div className="mb-4">
          <div className="text-[10px] font-mono text-slate-500 mb-1 uppercase">Crew</div>
          <div className="flex flex-wrap gap-2">
            {players.map(p => (
              <span key={p.name} className="text-xs font-mono text-cyan-300 bg-cyan-900/20 px-2 py-0.5 rounded">
                {p.name}
              </span>
            ))}
          </div>
        </div>

        {/* Station Log */}
        <div className="bg-[#060a12] border border-cyan-900/20 rounded-lg p-4 mb-6">
          <div className="text-[10px] font-mono text-cyan-700 mb-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
            STATION LOG
          </div>
          <pre className="text-xs font-mono text-cyan-200/70 whitespace-pre-wrap leading-relaxed">
            {stationLog}
          </pre>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onPlayAgain}
            className="flex-1 py-3 bg-cyan-900/30 hover:bg-cyan-800/40 text-cyan-300 font-mono text-sm border border-cyan-800/40 rounded-lg transition-colors"
          >
            ▶ PLAY AGAIN
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(stationLog)
            }}
            className="py-3 px-4 bg-slate-800/30 hover:bg-slate-700/40 text-slate-400 font-mono text-sm border border-slate-700/40 rounded-lg transition-colors"
          >
            📋 COPY LOG
          </button>
        </div>
      </div>
    </div>
  )
}
