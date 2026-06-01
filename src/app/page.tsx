'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { motion, AnimatePresence } from 'framer-motion'
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

// ---- STARFIELD COMPONENT ----
function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    interface Star {
      x: number; y: number; size: number; speed: number; alpha: number; twinkleSpeed: number; twinkleOffset: number
    }
    const stars: Star[] = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: 0.3 + Math.random() * 1.8,
      speed: 0.05 + Math.random() * 0.3,
      alpha: 0.2 + Math.random() * 0.7,
      twinkleSpeed: 0.5 + Math.random() * 2,
      twinkleOffset: Math.random() * Math.PI * 2,
    }))

    let animFrame: number
    const animate = () => {
      const now = Date.now()
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const star of stars) {
        star.y += star.speed
        if (star.y > canvas.height) {
          star.y = 0
          star.x = Math.random() * canvas.width
        }

        const twinkle = Math.sin(now / 1000 * star.twinkleSpeed + star.twinkleOffset) * 0.3 + 0.7
        ctx.fillStyle = `rgba(180, 200, 255, ${star.alpha * twinkle})`
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
        ctx.fill()
      }

      animFrame = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animFrame)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.6 }}
    />
  )
}

// ---- AMBIENT DUST COMPONENT ----
function AmbientDust() {
  return (
    <div className="ambient-particles">
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} className="dust" />
      ))}
    </div>
  )
}

// ---- TYPEWRITER HOOK ----
function useTypewriter(text: string, speed: number = 30, delay: number = 0) {
  const [displayed, setDisplayed] = useState('')
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => setStarted(true), delay)
    return () => clearTimeout(timeout)
  }, [delay])

  useEffect(() => {
    if (!started) return
    setDisplayed('')
    let idx = 0
    const timer = setInterval(() => {
      idx++
      setDisplayed(text.slice(0, idx))
      if (idx >= text.length) clearInterval(timer)
    }, speed)
    return () => clearInterval(timer)
  }, [text, speed, started])

  return displayed
}

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
  const [screenShake, setScreenShake] = useState(false)
  const [notifications, setNotifications] = useState<Array<{ id: number; text: string; type: 'info' | 'warning' | 'danger' }>>([])
  const notifIdRef = useRef(0)

  // Derive myPlayer from gameState and myPlayerId
  const myPlayer = useMemo(() => {
    if (!gameState || !myPlayerId) return null
    return gameState.players.find(p => p.id === myPlayerId) || null
  }, [gameState, myPlayerId])

  // Typewriter for lobby description
  const lobbyDescription = "The station is dying. Systems are failing. ARIA, the station AI, is losing its memories. Work together with your crew to repair sectors, make impossible choices, and hold the door."
  const typedDescription = useTypewriter(lobbyDescription, 25, 1000)

  // Add notification helper
  const addNotification = useCallback((text: string, type: 'info' | 'warning' | 'danger' = 'info') => {
    const id = ++notifIdRef.current
    setNotifications(prev => [...prev.slice(-4), { id, text, type }])
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 4000)
  }, [])

  // Connect socket
  useEffect(() => {
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
      addNotification('Connected to station', 'info')
    })

    s.on('disconnect', () => {
      setConnected(false)
      addNotification('Connection lost!', 'danger')
    })

    s.on('error-message', (data: { message: string }) => {
      setError(data.message)
      addNotification(data.message, 'danger')
      setTimeout(() => setError(''), 4000)
    })

    s.on('player-joined', (data: { player: Player; roomId: string }) => {
      setMyPlayerId(data.player.id)
      setIsJoined(true)
      addNotification(`${data.player.name} joined the crew`, 'info')
    })

    s.on('game-state', (state: GameState) => {
      const prevPhase = gameState?.phase
      setGameState(state)
      // Auto-switch view
      if (state.phase === 'lobby') setView('lobby')
      else if (state.phase === 'gameover') setView('gameover')
      else setView('game')

      // Phase change notifications and screen shake
      if (prevPhase && prevPhase !== state.phase) {
        if (state.phase === 'scramble') {
          addNotification('⚡ SCRAMBLE! Get to the active sector!', 'danger')
          setScreenShake(true)
          setTimeout(() => setScreenShake(false), 500)
        } else if (state.phase === 'hold') {
          addNotification('🛡️ HOLD phase - Repair the sector!', 'info')
        } else if (state.phase === 'escape') {
          addNotification('🚪 DECIDE - Vote now!', 'warning')
        }
      }
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
      setScreenShake(true)
      setTimeout(() => setScreenShake(false), 500)
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
    <div className={`min-h-screen bg-[#0a0e17] text-slate-100 flex flex-col relative ${screenShake ? 'screen-shake' : ''}`}>
      {/* Ambient effects - always present */}
      <Starfield />
      <AmbientDust />

      {/* Vignette overlay */}
      <div className="fixed inset-0 pointer-events-none vignette z-[1]" />

      {/* Notification toasts */}
      <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-xs">
        <AnimatePresence>
          {notifications.map(notif => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="space-toast px-3 py-2 rounded-lg"
            >
              <span className={`text-xs font-mono ${
                notif.type === 'danger' ? 'text-red-300' :
                notif.type === 'warning' ? 'text-amber-300' :
                'text-cyan-300'
              }`}>
                {notif.text}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ---- LOBBY ---- */}
      {view === 'lobby' && (
        <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden z-10">
          {/* Background image */}
          <div className="absolute inset-0 opacity-15" style={{
            backgroundImage: 'url(/game-bg.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(3px)',
          }} />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0e17]/60 via-transparent to-[#0a0e17]/80" />

          {/* Scanline overlay */}
          <div className="absolute inset-0 scanline-overlay scanline-beam pointer-events-none" />

          <div className="max-w-md w-full relative z-10">
            {/* Title with glitch effect */}
            <div className="text-center mb-8">
              <div className="sound-pulse inline-block mb-4">
                <h1
                  className="text-4xl sm:text-5xl md:text-6xl font-mono font-bold tracking-wider text-glow-cyan glitch-title"
                  data-text="HOLD THE DOOR"
                >
                  <span className="text-cyan-400">HOLD</span>{' '}
                  <span className="text-slate-300">THE</span>{' '}
                  <span className="text-cyan-400">DOOR</span>
                </h1>
              </div>
              <div className="h-0.5 w-48 mx-auto bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent mb-3" />
              <div className="typewriter text-slate-500 text-[10px] sm:text-xs font-mono max-w-sm mx-auto min-h-[3em]">
                {typedDescription}
              </div>
            </div>

            {/* Connection status with pulsing glow */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="relative">
                <div className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
                {connected && (
                  <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-green-500 animate-ping opacity-40" />
                )}
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                {connected ? 'Connected to Station' : 'Connecting...'}
              </span>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4 p-3 bg-red-900/20 border border-red-800/40 rounded-lg text-red-400 text-xs font-mono text-center"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Join form */}
            {!isJoined ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-[#0d1220]/90 border border-cyan-900/30 rounded-xl p-4 sm:p-6 space-y-4 backdrop-blur-sm"
              >
                <div>
                  <label className="text-[10px] font-mono text-slate-500 mb-1 block">CALLSIGN</label>
                  <Input
                    value={playerName}
                    onChange={e => setPlayerName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleJoin()}
                    placeholder="Enter your name..."
                    maxLength={12}
                    className="h-11 bg-slate-900/50 border-slate-700/50 text-cyan-200 font-mono placeholder:text-slate-700"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-500 mb-1 block">STATION ID</label>
                  <Input
                    value={roomId}
                    onChange={e => setRoomId(e.target.value)}
                    placeholder="Room ID..."
                    className="h-11 bg-slate-900/50 border-slate-700/50 text-cyan-200 font-mono placeholder:text-slate-700"
                  />
                </div>
                <Button
                  onClick={handleJoin}
                  disabled={!connected || !playerName.trim()}
                  className="w-full h-11 bg-cyan-900/40 hover:bg-cyan-800/50 text-cyan-300 font-mono border border-cyan-800/40 touch-target"
                >
                  ▶ JOIN STATION
                </Button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-[#0d1220]/90 border border-cyan-900/30 rounded-xl p-4 sm:p-6 backdrop-blur-sm"
              >
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
                    className="w-full h-11 bg-green-900/30 hover:bg-green-800/40 text-green-300 font-mono border border-green-800/40 touch-target"
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
              </motion.div>
            )}

            {/* Game description / role list */}
            <div className="mt-6 text-center space-y-2">
              <div className="flex justify-center gap-3 sm:gap-4 text-[10px] font-mono text-slate-700 flex-wrap">
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
          {/* Phase-specific overlays */}
          {gameState.phase === 'scramble' && <div className="phase-overlay-scramble" />}
          {gameState.phase === 'hold' && <div className="phase-overlay-hold" />}
          {gameState.phase === 'escape' && <div className="phase-overlay-escape" />}

          {/* Top Bar - mobile responsive */}
          <div className={`h-12 sm:h-14 bg-[#0d1220]/95 border-b border-cyan-900/30 flex items-center px-2 sm:px-4 gap-2 sm:gap-4 shrink-0 backdrop-blur-sm z-20 relative ${
            gameState.panicLevel > 70 ? (gameState.phase === 'scramble' ? 'animate-pulse-red' : '') : ''
          }`}>
            {/* Round */}
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-cyan-400 font-mono text-[10px] sm:text-sm font-bold">R</span>
              <span className="text-cyan-200 font-mono text-sm sm:text-lg font-bold">{gameState.round}/5</span>
            </div>

            <div className="h-4 sm:h-6 w-px bg-slate-800" />

            {/* Phase indicator with animated transitions */}
            <div className="flex items-center gap-1 sm:gap-2">
              <AnimatePresence mode="wait">
                <motion.span
                  key={gameState.phase}
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 10, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`font-mono text-[10px] sm:text-xs uppercase ${
                    gameState.phase === 'scramble' ? 'text-red-400' :
                    gameState.phase === 'hold' ? 'text-cyan-400' :
                    gameState.phase === 'escape' ? 'text-amber-400' :
                    'text-slate-500'
                  }`}
                >
                  {gameState.phase === 'scramble' ? '⚡ SCRAMBLE' :
                   gameState.phase === 'hold' ? '🛡️ HOLD' :
                   gameState.phase === 'escape' ? '🚪 DECIDE' : gameState.phase.toUpperCase()}
                </motion.span>
              </AnimatePresence>
            </div>

            <div className="h-4 sm:h-6 w-px bg-slate-800" />

            {/* Timer */}
            <div className="flex items-center gap-1">
              <span className={`font-mono text-sm sm:text-lg font-bold ${
                gameState.phaseTimer <= 10 ? 'text-red-400 animate-pulse' : 'text-cyan-300'
              }`}>
                {Math.floor(gameState.phaseTimer / 60)}:{(gameState.phaseTimer % 60).toString().padStart(2, '0')}
              </span>
            </div>

            <div className="flex-1" />

            {/* Disaster theme - hidden on very small screens */}
            <div className="hidden sm:flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{
                backgroundColor: THEME_COLORS[gameState.disasterTheme]?.primary || '#00d4ff'
              }} />
              <span className="text-[10px] font-mono text-slate-500 uppercase">{gameState.disasterTheme}</span>
            </div>

            <div className="h-4 sm:h-6 w-px bg-slate-800 hidden sm:block" />

            {/* Panic level */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span className="text-[8px] sm:text-[10px] font-mono text-slate-500">PANIC</span>
              <div className="w-10 sm:w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    gameState.panicLevel > 70 ? 'bg-red-500 shimmer-bar-red' : gameState.panicLevel > 40 ? 'bg-amber-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${gameState.panicLevel}%` }}
                />
              </div>
              <span className="text-[8px] sm:text-[10px] font-mono text-slate-500">{gameState.panicLevel}%</span>
            </div>

            <div className="h-4 sm:h-6 w-px bg-slate-800 hidden sm:block" />

            {/* Repair progress */}
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-slate-500">REPAIR</span>
              <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full transition-all duration-500 shimmer-bar"
                  style={{ width: `${gameState.repairProgress}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-cyan-400">{gameState.repairProgress}%</span>
            </div>
          </div>

          {/* Mobile player strip */}
          <div className="md:hidden bg-[#0d1220]/80 border-b border-cyan-900/20 px-2 py-1 z-20 relative">
            <PlayerPanel player={myPlayer} allPlayers={gameState.players} compact />
          </div>

          {/* Main game area - desktop: side panels, mobile: stacked */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative z-10">
            {/* Left panel - Player info (desktop only) */}
            <div className="hidden md:block w-48 border-r border-cyan-900/20 bg-[#0a0e17] p-2 overflow-y-auto shrink-0">
              <PlayerPanel player={myPlayer} allPlayers={gameState.players} />

              {/* Active sector info */}
              {activeSector && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-3 p-2 bg-red-900/10 border border-red-900/30 rounded-lg sector-pulse"
                >
                  <div className="text-[10px] font-mono text-red-400/70 uppercase mb-1">Active Sector</div>
                  <div className="text-xs font-mono text-red-300 font-bold">{activeSector.name}</div>
                  <div className="text-[10px] font-mono text-slate-500 mt-1">
                    Tasks: {activeSector.repairTasks.filter(t => t.completed).length}/{activeSector.repairTasks.length}
                  </div>
                </motion.div>
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
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0a0e17] to-transparent pt-6 pb-2 px-3 sm:px-4 z-10">
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-[10px] sm:text-xs font-mono text-slate-500 shrink-0">REPAIR</span>
                  <div className="flex-1 h-2 sm:h-2.5 bg-slate-800/80 rounded-full overflow-hidden progress-bar-glow">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full transition-all duration-500"
                      style={{ width: `${gameState.repairProgress}%` }}
                    />
                  </div>
                  <span className="text-[10px] sm:text-xs font-mono text-cyan-400 shrink-0">{gameState.repairProgress}%</span>
                </div>
              </div>

              {/* Phase-specific overlay messages */}
              <AnimatePresence mode="wait">
                {gameState.phase === 'scramble' && activeSector && (
                  <motion.div
                    key="scramble-msg"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    className="absolute top-3 left-1/2 -translate-x-1/2 bg-red-900/40 border border-red-800/50 rounded-lg px-3 sm:px-4 py-2 backdrop-blur-sm z-10"
                  >
                    <span className="text-[10px] sm:text-xs font-mono text-red-300 animate-pulse">
                      ⚡ Navigate to <strong>{activeSector.name}</strong>!
                    </span>
                  </motion.div>
                )}

                {gameState.phase === 'hold' && myPlayer.currentRoom !== gameState.activeSector && (
                  <motion.div
                    key="hold-msg"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    className="absolute top-3 left-1/2 -translate-x-1/2 bg-amber-900/30 border border-amber-800/40 rounded-lg px-3 sm:px-4 py-2 backdrop-blur-sm z-10"
                  >
                    <span className="text-[10px] sm:text-xs font-mono text-amber-300">
                      → Move to the active sector to help repair!
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right panel - AI + Puzzles + Chat (desktop) */}
            <div className="hidden lg:flex w-72 border-l border-cyan-900/20 bg-[#0a0e17] flex-col shrink-0">
              {/* AI Dialogue */}
              <div className="p-2 border-b border-cyan-900/20">
                <AIDialogue
                  messages={aiMessages}
                  emotionalState={gameState.aiMemory?.emotionalState || 'confused'}
                />
              </div>

              {/* Puzzle UI */}
              {gameState.phase === 'hold' && activeSector && myPlayer.currentRoom === gameState.activeSector && (
                <div className="p-2 border-b border-cyan-900/20 max-h-64 overflow-y-auto game-scroll">
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
                <div className="flex-1 overflow-y-auto space-y-1 mb-2 min-h-0 game-scroll">
                  {chatMessages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-xs font-mono"
                    >
                      <span className="text-cyan-400/70">{msg.playerName}:</span>{' '}
                      <span className="text-slate-400">{msg.message}</span>
                    </motion.div>
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
                    className="h-9 text-xs font-mono bg-slate-900/50 border-slate-700/50 text-cyan-200 placeholder:text-slate-700"
                  />
                  <Button
                    onClick={handleChat}
                    size="sm"
                    className="h-9 text-xs font-mono bg-cyan-900/30 hover:bg-cyan-800/40 text-cyan-300 border border-cyan-800/40 touch-target"
                  >
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile bottom panel - primary interface on mobile */}
          <div className="lg:hidden mobile-panel p-2 space-y-2 z-20 relative">
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
        <div className="flex-1 flex items-center justify-center z-10 relative">
          <div className="text-center">
            <p className="text-slate-500 font-mono">Game ended.</p>
            <Button onClick={handlePlayAgain} className="mt-4 bg-cyan-900/30 text-cyan-300 font-mono touch-target">
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
  const [expanded, setExpanded] = useState(false)

  return (
    <div>
      {/* Expand/collapse toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center py-1 mb-1 text-[10px] font-mono text-slate-600 hover:text-slate-400 transition-colors touch-target"
      >
        <span className="text-slate-700 mr-1">{expanded ? '▼' : '▲'}</span>
        {expanded ? 'COLLAPSE' : 'EXPAND'}
      </button>

      {/* Tab selector */}
      <div className="flex gap-1 mb-2">
        {([
          { key: 'puzzle' as const, label: '🔧 TASKS', count: activeSector?.repairTasks.filter(t => !t.completed).length },
          { key: 'ai' as const, label: '🤖 ARIA', count: aiMessages.length },
          { key: 'chat' as const, label: '💬 COMMS', count: chatMessages.length },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 mobile-tab ${tab === t.key ? 'mobile-tab-active' : 'mobile-tab-inactive'}`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="ml-1 text-[9px] opacity-60">({t.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className={`${expanded ? 'max-h-64' : 'max-h-32'} overflow-y-auto transition-all duration-300 game-scroll`}>
        <AnimatePresence mode="wait">
          {tab === 'puzzle' && (
            <motion.div
              key="puzzle"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              {activeSector ? (
                <PuzzleUI room={activeSector} player={myPlayer} onPuzzleInput={onPuzzleInput} onInteract={onInteract} />
              ) : (
                <div className="text-xs font-mono text-slate-600 text-center py-3">
                  No active sector
                </div>
              )}
            </motion.div>
          )}

          {tab === 'ai' && (
            <motion.div
              key="ai"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              <AIDialogue
                messages={aiMessages}
                emotionalState={gameState.aiMemory?.emotionalState || 'confused'}
              />
            </motion.div>
          )}

          {tab === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              <div className="space-y-0.5 mb-2 max-h-32 overflow-y-auto game-scroll">
                {chatMessages.slice(-15).map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15 }}
                    className="text-xs font-mono"
                  >
                    <span className="text-cyan-400/70">{msg.playerName}:</span>{' '}
                    <span className="text-slate-400">{msg.message}</span>
                  </motion.div>
                ))}
                {chatMessages.length === 0 && (
                  <div className="text-xs font-mono text-slate-700 italic text-center py-2">No messages yet</div>
                )}
              </div>
              <div className="flex gap-1">
                <Input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && onChat()}
                  placeholder="Chat..."
                  className="h-10 text-xs font-mono bg-slate-900/50 border-slate-700/50 text-cyan-200 placeholder:text-slate-700"
                />
                <Button
                  onClick={onChat}
                  size="sm"
                  className="h-10 text-xs font-mono bg-cyan-900/30 hover:bg-cyan-800/40 text-cyan-300 border border-cyan-800/40 touch-target px-3"
                >
                  Send
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
