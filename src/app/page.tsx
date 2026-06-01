'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { io, Socket } from 'socket.io-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import GameCanvas from '@/components/game/GameCanvas'
import AIDialogue from '@/components/game/AIDialogue'
import PlayerPanel from '@/components/game/PlayerPanel'
import PuzzleUI from '@/components/game/PuzzleUI'
import VoteScreen from '@/components/game/VoteScreen'
import GameOverScreen from '@/components/game/GameOverScreen'
import {
  GameState, Player, ChatMessage, RoomNode,
  ROLE_COLORS, ROLE_ICONS, THEME_COLORS,
} from '@/components/game/types'

type View = 'lobby' | 'game' | 'gameover'

export default function HoldTheDoor() {
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [view, setView] = useState<View>('lobby')
  const [playerName, setPlayerName] = useState('')
  const [roomId, setRoomId] = useState('station-1')
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [aiMessages, setAiMessages] = useState<string[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [error, setError] = useState('')
  const [stationLog, setStationLog] = useState('')
  const [survived, setSurvived] = useState(false)
  const [isJoined, setIsJoined] = useState(false)

  // Derive myPlayer from gameState and myPlayerId
  const myPlayer = useMemo(() => {
    if (!gameState || !myPlayerId) return null
    return gameState.players.find(p => p.id === myPlayerId) || null
  }, [gameState, myPlayerId])

  // Connect socket
  useEffect(() => {
    // Connect directly to game server on port 3030
    // (Caddy proxy on port 81 is optional for production)
    const gameServerUrl = process.env.NEXT_PUBLIC_GAME_SERVER_URL || 'http://localhost:3030'
    const s = io(gameServerUrl, {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
    })

    s.on('connect', () => {
      setConnected(true)
    })

    s.on('disconnect', () => {
      setConnected(false)
    })

    s.on('error-message', (data: { message: string }) => {
      setError(data.message)
      setTimeout(() => setError(''), 4000)
    })

    s.on('player-joined', (data: { player: Player; roomId: string }) => {
      setMyPlayerId(data.player.id)
      setIsJoined(true)
    })

    s.on('game-state', (state: GameState) => {
      setGameState(state)
      // Auto-switch view
      if (state.phase === 'lobby') setView('lobby')
      else if (state.phase === 'gameover') setView('gameover')
      else setView('game')
    })

    s.on('ai-dialogue', (data: { text: string; emotionalState: string }) => {
      setAiMessages(prev => [...prev, data.text])
    })

    s.on('phase-change', () => {
      // Phase change handled via game-state
    })

    s.on('chat-message', (data: ChatMessage) => {
      setChatMessages(prev => [...prev.slice(-50), data])
    })

    s.on('sacrifice-result', () => {
      // Result handled via game-state
    })

    s.on('station-log', (data: { log: string; survived: boolean }) => {
      setStationLog(data.log)
      setSurvived(data.survived)
    })

    socketRef.current = s

    return () => {
      s.disconnect()
      socketRef.current = null
    }
  }, [])

  // ---- HANDLERS ----
  const handleJoin = () => {
    if (!socketRef.current || !playerName.trim() || !roomId.trim()) return
    setError('')
    socketRef.current.emit('join-game', { playerName: playerName.trim(), roomId: roomId.trim() })
  }

  const handleStartGame = () => {
    if (!socketRef.current || !roomId.trim()) return
    socketRef.current.emit('start-game', { roomId: roomId.trim() })
  }

  const handleRoomClick = (targetRoom: string) => {
    if (!socketRef.current || !roomId.trim()) return
    socketRef.current.emit('player-move', { roomId: roomId.trim(), targetRoom })
  }

  const handleInteract = (taskId: string) => {
    if (!socketRef.current || !roomId.trim()) return
    socketRef.current.emit('player-interact', { roomId: roomId.trim(), taskId })
  }

  const handlePuzzleInput = (taskId: string, puzzleData: any) => {
    if (!socketRef.current || !roomId.trim()) return
    socketRef.current.emit('puzzle-input', { roomId: roomId.trim(), taskId, puzzleData })
  }

  const handleVoteSave = () => {
    if (!socketRef.current || !roomId.trim()) return
    socketRef.current.emit('vote-save', { roomId: roomId.trim() })
  }

  const handleVoteSacrifice = () => {
    if (!socketRef.current || !roomId.trim()) return
    socketRef.current.emit('vote-sacrifice', { roomId: roomId.trim() })
  }

  const handleChat = () => {
    if (!socketRef.current || !roomId.trim() || !chatInput.trim()) return
    socketRef.current.emit('chat-message', { roomId: roomId.trim(), message: chatInput.trim() })
    setChatInput('')
  }

  const handlePlayAgain = () => {
    setView('lobby')
    setGameState(null)
    setAiMessages([])
    setChatMessages([])
    setStationLog('')
    setMyPlayerId(null)
    setIsJoined(false)
  }

  const activeSector = gameState?.stationMap.find(r => r.id === gameState.activeSector) || null

  // ---- RENDER ----
  return (
    <div className="min-h-screen bg-[#0a0e17] text-slate-100 flex flex-col">
      {/* ---- LOBBY ---- */}
      {view === 'lobby' && (
        <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
          {/* Background image */}
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'url(/game-bg.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(2px)',
          }} />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0e17]/60 via-transparent to-[#0a0e17]/80" />
          <div className="max-w-md w-full relative z-10">
            {/* Title */}
            <div className="text-center mb-8">
              <h1 className="text-5xl md:text-6xl font-mono font-bold tracking-wider mb-2 text-glow-cyan">
                <span className="text-cyan-400">HOLD</span>{' '}
                <span className="text-slate-300">THE</span>{' '}
                <span className="text-cyan-400">DOOR</span>
              </h1>
              <div className="h-0.5 w-48 mx-auto bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent mb-3" />
              <p className="text-slate-500 text-sm font-mono">A cooperative survival game on a dying space station</p>
            </div>

            {/* Connection status */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-xs font-mono text-slate-500">
                {connected ? 'Connected to Station' : 'Connecting...'}
              </span>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-800/40 rounded-lg text-red-400 text-xs font-mono text-center">
                {error}
              </div>
            )}

            {/* Join form */}
            {!isJoined ? (
              <div className="bg-[#0d1220] border border-cyan-900/30 rounded-xl p-6 space-y-4">
                <div>
                  <label className="text-xs font-mono text-slate-500 mb-1 block">CALLSIGN</label>
                  <Input
                    value={playerName}
                    onChange={e => setPlayerName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleJoin()}
                    placeholder="Enter your name..."
                    maxLength={12}
                    className="bg-slate-900/50 border-slate-700/50 text-cyan-200 font-mono placeholder:text-slate-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono text-slate-500 mb-1 block">STATION ID</label>
                  <Input
                    value={roomId}
                    onChange={e => setRoomId(e.target.value)}
                    placeholder="Room ID..."
                    className="bg-slate-900/50 border-slate-700/50 text-cyan-200 font-mono placeholder:text-slate-700"
                  />
                </div>
                <Button
                  onClick={handleJoin}
                  disabled={!connected || !playerName.trim()}
                  className="w-full bg-cyan-900/40 hover:bg-cyan-800/50 text-cyan-300 font-mono border border-cyan-800/40"
                >
                  ▶ JOIN STATION
                </Button>
              </div>
            ) : (
              <div className="bg-[#0d1220] border border-cyan-900/30 rounded-xl p-6">
                {/* Player info */}
                {myPlayer && (
                  <div className="flex items-center gap-3 mb-4 p-3 bg-slate-900/30 rounded-lg border border-slate-800/40">
                    <span className="text-2xl">{ROLE_ICONS[myPlayer.role]}</span>
                    <div>
                      <div className="text-sm font-mono font-bold" style={{ color: ROLE_COLORS[myPlayer.role] }}>
                        {myPlayer.name}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 uppercase">{myPlayer.role}</div>
                    </div>
                    {myPlayer.isHost && (
                      <span className="ml-auto text-[10px] font-mono text-amber-400 bg-amber-900/20 px-2 py-0.5 rounded">HOST</span>
                    )}
                  </div>
                )}

                {/* Connected players */}
                <div className="mb-4">
                  <div className="text-[10px] font-mono text-slate-500 mb-2 uppercase">
                    Crew ({gameState?.players.length || 0}/4)
                  </div>
                  <div className="space-y-1.5">
                    {gameState?.players.map(p => (
                      <div key={p.id} className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/30 rounded border border-slate-800/30">
                        <span className="text-sm">{ROLE_ICONS[p.role]}</span>
                        <span className="text-xs font-mono" style={{ color: ROLE_COLORS[p.role] }}>{p.name}</span>
                        <span className="text-[9px] font-mono text-slate-600 uppercase ml-auto">{p.role}</span>
                        {p.isHost && <span className="text-[9px] font-mono text-amber-500">★</span>}
                      </div>
                    ))}
                    {(!gameState || gameState.players.length < 4) && (
                      <div className="text-xs font-mono text-slate-700 text-center py-2 border border-dashed border-slate-800 rounded">
                        Waiting for crew members...
                      </div>
                    )}
                  </div>
                </div>

                {/* Start button */}
                {myPlayer?.isHost && (
                  <Button
                    onClick={handleStartGame}
                    disabled={!gameState || gameState.players.length < 1}
                    className="w-full bg-green-900/30 hover:bg-green-800/40 text-green-300 font-mono border border-green-800/40"
                  >
                    ▶ START GAME ({gameState?.players.length || 0}/4)
                  </Button>
                )}

                {!myPlayer?.isHost && (
                  <div className="text-center text-xs font-mono text-slate-500 py-2">
                    Waiting for host to start the game...
                  </div>
                )}

                {gameState && gameState.players.length < 1 && (
                  <p className="text-xs font-mono text-amber-400/50 text-center mt-2">
                    Need at least 2 players to start
                  </p>
                )}
              </div>
            )}

            {/* Game description */}
            <div className="mt-6 text-center space-y-2">
              <p className="text-[10px] font-mono text-slate-600 leading-relaxed max-w-sm mx-auto">
                The station is dying. Systems are failing. ARIA, the station AI, is losing its memories.
                Work together with your crew to repair sectors, make impossible choices, and hold the door.
              </p>
              <div className="flex justify-center gap-4 text-[10px] font-mono text-slate-700">
                <span>🔧 Engineer</span>
                <span>💊 Medic</span>
                <span>⭐ Captain</span>
                <span>💻 SysOp</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---- GAME ---- */}
      {view === 'game' && gameState && myPlayer && (
        <>
          {/* Top Bar */}
          <div className="h-12 bg-[#0d1220] border-b border-cyan-900/30 flex items-center px-4 gap-4 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 font-mono text-sm font-bold">ROUND</span>
              <span className="text-cyan-200 font-mono text-lg font-bold">{gameState.round}/5</span>
            </div>

            <div className="h-6 w-px bg-slate-800" />

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-mono text-xs uppercase">
                {gameState.phase === 'scramble' ? '⚡ SCRAMBLE' :
                 gameState.phase === 'hold' ? '🛡️ HOLD' :
                 gameState.phase === 'escape' ? '🚪 DECIDE' : gameState.phase.toUpperCase()}
              </span>
            </div>

            <div className="h-6 w-px bg-slate-800" />

            {/* Timer */}
            <div className="flex items-center gap-1">
              <span className={`font-mono text-lg font-bold ${
                gameState.phaseTimer <= 10 ? 'text-red-400 animate-pulse' : 'text-cyan-300'
              }`}>
                {Math.floor(gameState.phaseTimer / 60)}:{(gameState.phaseTimer % 60).toString().padStart(2, '0')}
              </span>
            </div>

            <div className="flex-1" />

            {/* Disaster theme */}
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{
                backgroundColor: THEME_COLORS[gameState.disasterTheme]?.primary || '#00d4ff'
              }} />
              <span className="text-[10px] font-mono text-slate-500 uppercase">{gameState.disasterTheme}</span>
            </div>

            <div className="h-6 w-px bg-slate-800" />

            {/* Panic level */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-slate-500">PANIC</span>
              <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    gameState.panicLevel > 70 ? 'bg-red-500' : gameState.panicLevel > 40 ? 'bg-amber-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${gameState.panicLevel}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-slate-500">{gameState.panicLevel}%</span>
            </div>

            <div className="h-6 w-px bg-slate-800" />

            {/* Repair progress */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-slate-500">REPAIR</span>
              <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full transition-all"
                  style={{ width: `${gameState.repairProgress}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-cyan-400">{gameState.repairProgress}%</span>
            </div>
          </div>

          {/* Main game area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left panel - Player info */}
            <div className="w-48 border-r border-cyan-900/20 bg-[#0a0e17] p-2 overflow-y-auto shrink-0 hidden md:block">
              <PlayerPanel player={myPlayer} allPlayers={gameState.players} />

              {/* Active sector info */}
              {activeSector && (
                <div className="mt-3 p-2 bg-red-900/10 border border-red-900/30 rounded-lg">
                  <div className="text-[10px] font-mono text-red-400/70 uppercase mb-1">Active Sector</div>
                  <div className="text-xs font-mono text-red-300 font-bold">{activeSector.name}</div>
                  <div className="text-[10px] font-mono text-slate-500 mt-1">
                    Tasks: {activeSector.repairTasks.filter(t => t.completed).length}/{activeSector.repairTasks.length}
                  </div>
                </div>
              )}
            </div>

            {/* Center - Canvas */}
            <div className="flex-1 relative min-h-0">
              <GameCanvas
                stationMap={gameState.stationMap}
                players={gameState.players}
                activeSector={gameState.activeSector}
                currentRoom={myPlayer.currentRoom}
                onRoomClick={handleRoomClick}
                panicLevel={gameState.panicLevel}
                disasterTheme={gameState.disasterTheme}
              />

              {/* Repair progress bar overlay (bottom) */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0a0e17] to-transparent pt-8 pb-2 px-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-500 shrink-0">REPAIR</span>
                  <div className="flex-1 h-2 bg-slate-800/80 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full transition-all duration-500"
                      style={{ width: `${gameState.repairProgress}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-cyan-400 shrink-0">{gameState.repairProgress}%</span>
                </div>
              </div>

              {/* Phase-specific overlay */}
              {gameState.phase === 'scramble' && activeSector && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-red-900/30 border border-red-800/40 rounded-lg px-4 py-2 backdrop-blur-sm">
                  <span className="text-xs font-mono text-red-300 animate-pulse">
                    ⚡ Navigate to <strong>{activeSector.name}</strong>!
                  </span>
                </div>
              )}

              {gameState.phase === 'hold' && myPlayer.currentRoom !== gameState.activeSector && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-amber-900/30 border border-amber-800/40 rounded-lg px-4 py-2 backdrop-blur-sm">
                  <span className="text-xs font-mono text-amber-300">
                    → Move to the active sector to help repair!
                  </span>
                </div>
              )}
            </div>

            {/* Right panel - AI + Puzzles + Chat */}
            <div className="w-72 border-l border-cyan-900/20 bg-[#0a0e17] flex flex-col shrink-0 hidden lg:flex">
              {/* AI Dialogue */}
              <div className="p-2 border-b border-cyan-900/20">
                <AIDialogue
                  messages={aiMessages}
                  emotionalState={gameState.aiMemory?.emotionalState || 'confused'}
                />
              </div>

              {/* Puzzle UI */}
              {gameState.phase === 'hold' && activeSector && myPlayer.currentRoom === gameState.activeSector && (
                <div className="p-2 border-b border-cyan-900/20 max-h-64 overflow-y-auto">
                  <div className="text-[10px] font-mono text-slate-500 uppercase mb-1">Repair Tasks</div>
                  <PuzzleUI
                    room={activeSector}
                    player={myPlayer}
                    onPuzzleInput={handlePuzzleInput}
                    onInteract={handleInteract}
                  />
                </div>
              )}

              {/* Chat */}
              <div className="flex-1 flex flex-col min-h-0 p-2">
                <div className="text-[10px] font-mono text-slate-500 uppercase mb-1">Crew Comms</div>
                <div className="flex-1 overflow-y-auto space-y-1 mb-2 min-h-0" style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(0, 212, 255, 0.2) transparent',
                }}>
                  {chatMessages.map((msg, i) => (
                    <div key={i} className="text-xs font-mono">
                      <span className="text-cyan-400/70">{msg.playerName}:</span>{' '}
                      <span className="text-slate-400">{msg.message}</span>
                    </div>
                  ))}
                  {chatMessages.length === 0 && (
                    <div className="text-xs font-mono text-slate-700 italic">No messages yet</div>
                  )}
                </div>
                <div className="flex gap-1">
                  <Input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleChat()}
                    placeholder="Type message..."
                    className="h-7 text-xs font-mono bg-slate-900/50 border-slate-700/50 text-cyan-200 placeholder:text-slate-700"
                  />
                  <Button
                    onClick={handleChat}
                    size="sm"
                    className="h-7 text-xs font-mono bg-cyan-900/30 hover:bg-cyan-800/40 text-cyan-300 border border-cyan-800/40"
                  >
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile bottom bar (visible on small screens) */}
          <div className="md:hidden bg-[#0d1220] border-t border-cyan-900/30 p-2 space-y-2">
            <MobileBottomPanel
              gameState={gameState}
              myPlayer={myPlayer}
              activeSector={activeSector}
              aiMessages={aiMessages}
              chatMessages={chatMessages}
              chatInput={chatInput}
              setChatInput={setChatInput}
              onChat={handleChat}
              onInteract={handleInteract}
              onPuzzleInput={handlePuzzleInput}
            />
          </div>

          {/* Vote overlay */}
          {gameState.phase === 'escape' && activeSector && (
            <VoteScreen
              player={myPlayer}
              votes={gameState.votes}
              players={gameState.players}
              timer={gameState.phaseTimer}
              roomName={activeSector.name}
              onVoteSave={handleVoteSave}
              onVoteSacrifice={handleVoteSacrifice}
            />
          )}

          {/* Game Over overlay */}
          {gameState.phase === 'gameover' && (
            <GameOverScreen
              stationLog={stationLog}
              survived={survived}
              players={gameState.players.map(p => ({ name: p.name, role: p.role }))}
              roomsSaved={gameState.aiMemory.roomsSaved.length}
              roomsLost={gameState.aiMemory.roomsSacrificed.length}
              roundsPlayed={gameState.round}
              onPlayAgain={handlePlayAgain}
            />
          )}
        </>
      )}

      {/* ---- GAMEOVER (fallback) ---- */}
      {view === 'gameover' && !gameState && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-slate-500 font-mono">Game ended.</p>
            <Button onClick={handlePlayAgain} className="mt-4 bg-cyan-900/30 text-cyan-300 font-mono">
              Play Again
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---- MOBILE BOTTOM PANEL ----
function MobileBottomPanel({
  gameState,
  myPlayer,
  activeSector,
  aiMessages,
  chatMessages,
  chatInput,
  setChatInput,
  onChat,
  onInteract,
  onPuzzleInput,
}: {
  gameState: GameState
  myPlayer: Player
  activeSector: RoomNode | null
  aiMessages: string[]
  chatMessages: ChatMessage[]
  chatInput: string
  setChatInput: (v: string) => void
  onChat: () => void
  onInteract: (id: string) => void
  onPuzzleInput: (id: string, data: any) => void
}) {
  const [tab, setTab] = useState<'puzzle' | 'ai' | 'chat'>('puzzle')

  return (
    <div>
      <div className="flex gap-1 mb-2">
        {(['puzzle', 'ai', 'chat'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1 text-[10px] font-mono rounded border transition-colors ${
              tab === t
                ? 'bg-cyan-900/30 border-cyan-800/40 text-cyan-300'
                : 'bg-slate-900/30 border-slate-800/30 text-slate-500'
            }`}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="max-h-40 overflow-y-auto">
        {tab === 'puzzle' && activeSector && (
          <PuzzleUI room={activeSector} player={myPlayer} onPuzzleInput={onPuzzleInput} onInteract={onInteract} />
        )}
        {tab === 'ai' && (
          <div className="space-y-1">
            {aiMessages.slice(-10).map((msg, i) => (
              <div key={i} className="text-xs font-mono text-cyan-200/70">{msg}</div>
            ))}
          </div>
        )}
        {tab === 'chat' && (
          <div>
            <div className="space-y-0.5 mb-2 max-h-24 overflow-y-auto">
              {chatMessages.slice(-10).map((msg, i) => (
                <div key={i} className="text-xs font-mono">
                  <span className="text-cyan-400/70">{msg.playerName}:</span>{' '}
                  <span className="text-slate-400">{msg.message}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-1">
              <Input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && onChat()}
                placeholder="Chat..."
                className="h-7 text-xs font-mono bg-slate-900/50 border-slate-700/50 text-cyan-200"
              />
              <Button onClick={onChat} size="sm" className="h-7 text-xs font-mono bg-cyan-900/30 text-cyan-300">
                Send
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
