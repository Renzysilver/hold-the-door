import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// ============================================================
// TYPES
// ============================================================

interface RoomNode {
  id: string
  name: string
  x: number
  y: number
  connections: string[]
  status: 'active' | 'damaged' | 'sacrificed' | 'repairing'
  repairTasks: RepairTask[]
}

interface RepairTask {
  id: string
  type: 'wiring' | 'diagnostic' | 'override' | 'routing'
  requiredRole: string
  description: string
  progress: number
  completed: boolean
  puzzleData: any
}

interface Player {
  id: string
  name: string
  role: 'engineer' | 'medic' | 'captain' | 'sysop'
  currentRoom: string
  health: number
  hasTool: boolean
  toolType: string | null
  isHost: boolean
  socketId: string
}

interface AIMemory {
  playerNames: string[]
  roomsSaved: string[]
  roomsSacrificed: string[]
  playerDeaths: number
  heroicActions: string[]
  mistakes: string[]
  emotionalState: 'confused' | 'hopeful' | 'sad' | 'grateful' | 'desperate'
  accumulatedDialogue: string[]
}

interface GameEvent {
  id: string
  round: number
  phase: string
  description: string
  timestamp: number
}

interface GameState {
  roomId: string
  round: number
  phase: 'lobby' | 'scramble' | 'hold' | 'escape' | 'results' | 'gameover'
  phaseTimer: number
  stationMap: RoomNode[]
  activeSector: string | null
  repairProgress: number
  disasterTheme: 'water' | 'sound' | 'light' | 'gravity'
  aiMemory: AIMemory
  players: Player[]
  panicLevel: number
  sacrificedRooms: string[]
  eventLog: GameEvent[]
  votes: { save: string[]; sacrifice: string[] }
  puzzlesCompleted: number
  totalPuzzles: number
}

// ============================================================
// CONSTANTS & MAP DATA
// ============================================================

const ROOM_TEMPLATES = [
  { id: 'bridge', name: 'Bridge', x: 400, y: 80, connections: ['comms', 'crew'] },
  { id: 'engineering', name: 'Engineering', x: 160, y: 280, connections: ['reactor', 'cargo'] },
  { id: 'medbay', name: 'Medbay', x: 640, y: 280, connections: ['hydro', 'crew'] },
  { id: 'comms', name: 'Comms Array', x: 200, y: 120, connections: ['bridge', 'engineering'] },
  { id: 'hydro', name: 'Hydroponics', x: 600, y: 120, connections: ['bridge', 'medbay'] },
  { id: 'cargo', name: 'Cargo Bay', x: 160, y: 460, connections: ['engineering', 'reactor'] },
  { id: 'reactor', name: 'Reactor Core', x: 400, y: 460, connections: ['engineering', 'cargo', 'medbay'] },
  { id: 'crew', name: 'Crew Quarters', x: 640, y: 460, connections: ['bridge', 'medbay', 'reactor'] },
]

const EXTRA_CONNECTIONS: [string, string][] = [
  ['comms', 'hydro'],
  ['cargo', 'reactor'],
  ['crew', 'cargo'],
  ['comms', 'cargo'],
  ['hydro', 'reactor'],
]

const ROLES: Player['role'][] = ['engineer', 'medic', 'captain', 'sysop']

const ROLE_COLORS: Record<string, string> = {
  engineer: '#f59e0b',
  medic: '#22c55e',
  captain: '#00d4ff',
  sysop: '#a855f7',
}

const SCRAMBLE_TIME = 30   // seconds (shortened for demo)
const HOLD_TIME = 120      // seconds
const ESCAPE_TIME = 45     // seconds

// ============================================================
// AI DIALOGUE SYSTEM
// ============================================================

const AI_DIALOGUES: Record<string, string[]> = {
  game_start: [
    "Hello? Is someone there? I have been alone for so long...",
    "The station... something is wrong. Systems are failing and I cannot remember why.",
    "Please, help me hold the doors. I will guide you as best I can.",
  ],
  round_start: [
    "I think something is wrong in {sector}. Can you check?",
    "Alert in {sector}. Please hurry... I do not want to lose another room.",
    "{sector} is failing. I can feel it shaking through my sensors.",
    "The readings from {sector} are... disturbing. Something is very wrong.",
    "Can you hear that? {sector} is screaming.",
  ],
  repair_25: [
    "That feels better. Thank you for not giving up.",
    "Progress! I was starting to worry this was impossible.",
    "You are making a difference. I can feel the systems stabilizing.",
  ],
  repair_50: [
    "You are very capable. I was worried.",
    "Halfway there! I believe in you. I really do.",
    "The station is breathing easier now. So am I.",
  ],
  repair_75: [
    "Almost there! You are incredible!",
    "So close now... please do not stop.",
    "I can see the light at the end. Or is that another malfunction?",
  ],
  repair_complete: [
    "You did it! I did not think it was possible.",
    "Sector repaired! You have my gratitude. All of it.",
    "The lights are back on. The humming has returned. Thank you.",
  ],
  room_abandoned: [
    "Why are you removing another room? That one had... memories.",
    "I understand. It had to be done. But it hurts.",
    "Another piece of me, gone. How much more can we lose?",
    "The silence from that sector is... deafening.",
  ],
  room_saved: [
    "You saved it! I will remember this.",
    "Against all odds, you held the door. Thank you.",
    "That room still has life in it. Because of you.",
  ],
  player_damaged: [
    "Careful! I am detecting injuries. Please be safe.",
    "No... {name} is hurt. Please, someone help them.",
  ],
  vote_start: [
    "A choice lies before you. Save what remains, or let it go?",
    "I cannot make this decision. It has to be yours.",
  ],
  vote_save_wins: [
    "You chose to fight. I admire your courage.",
    "We hold the door. Together.",
  ],
  vote_sacrifice_wins: [
    "Sometimes... letting go is the only way forward.",
    "I will remember what was lost. I promise.",
  ],
  last_round: [
    "This is the last one, isn't it? It has been... an honor.",
    "One more. Just one more. We can do this.",
    "Everything we have done comes down to this moment.",
  ],
  phase_scramble: [
    "Move quickly! Every second counts.",
    "Find the affected sector before it gets worse.",
  ],
  phase_hold: [
    "Hold the line! Work together!",
    "This is where we make our stand.",
  ],
  phase_escape: [
    "Decision time. What will you choose?",
    "We cannot hold forever. Choose wisely.",
  ],
  panic_high: [
    "I am scared. The station is falling apart around us.",
    "Systems critical! Everything is failing at once!",
  ],
  theme_water: [
    "Water is seeping through the hull. I can hear it dripping...",
    "The flooding is accelerating. My circuits do not like water.",
  ],
  theme_sound: [
    "The noise is unbearable. Even my audio processors are struggling.",
    "Do you hear that? That frequency... it should not exist.",
  ],
  theme_light: [
    "The lights are going out. One by one. Like memories fading.",
    "Stay in the light. Whatever you do, stay in the light.",
  ],
  theme_gravity: [
    "Gravity fluctuations detected. Watch your step.",
    "Up is down. Down is up. I am having trouble orienting myself.",
  ],
}

function getDialogue(key: string, replacements: Record<string, string> = {}): string {
  const pool = AI_DIALOGUES[key]
  if (!pool || pool.length === 0) return 'ARIA: ...'
  let line = pool[Math.floor(Math.random() * pool.length)]
  for (const [k, v] of Object.entries(replacements)) {
    line = line.replace(`{${k}}`, v)
  }
  return line
}

// ============================================================
// PUZZLE GENERATION
// ============================================================

function generateWiringPuzzle(): RepairTask['puzzleData'] {
  const nodeCount = 6
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({ id: i, label: `N${i}` }))
  const targetConnections: [number, number][] = []
  const used = new Set<string>()
  for (let i = 0; i < 3; i++) {
    let a: number, b: number
    do {
      a = Math.floor(Math.random() * nodeCount)
      b = Math.floor(Math.random() * nodeCount)
    } while (a === b || used.has(`${a}-${b}`))
    used.add(`${a}-${b}`)
    targetConnections.push([a, b])
  }
  return { nodes, targetConnections, playerConnections: [] as [number, number][] }
}

function generateDiagnosticPuzzle(): RepairTask['puzzleData'] {
  const gridSize = 5
  const grid: number[][] = []
  const anomalies: [number, number][] = []
  for (let r = 0; r < gridSize; r++) {
    grid[r] = []
    for (let c = 0; c < gridSize; c++) {
      grid[r][c] = Math.floor(Math.random() * 10)
    }
  }
  // Plant 3 anomalies
  const used = new Set<string>()
  for (let i = 0; i < 3; i++) {
    let r: number, c: number
    do {
      r = Math.floor(Math.random() * gridSize)
      c = Math.floor(Math.random() * gridSize)
    } while (used.has(`${r}-${c}`))
    used.add(`${r}-${c}`)
    anomalies.push([r, c])
    grid[r][c] = grid[r][c] + 10 // anomaly is > 10
  }
  return { gridSize, grid, anomalies, playerSelections: [] as [number, number][] }
}

function generateOverridePuzzle(): RepairTask['puzzleData'] {
  const code = Array.from({ length: 4 }, () => Math.floor(Math.random() * 10))
  return { code, sysopInput: [] as number[], powerLevel: 50, requiredPower: 70 + Math.floor(Math.random() * 30) }
}

function generateRepairTasks(roomId: string, round: number): RepairTask[] {
  const tasks: RepairTask[] = []
  const taskTypes: RepairTask['type'][] = ['wiring', 'diagnostic', 'override', 'routing']
  const taskRoles: string[] = ['engineer', 'medic', 'captain', 'sysop']
  const taskDescriptions: Record<string, string> = {
    wiring: 'Reconnect the wiring relay to restore power routing.',
    diagnostic: 'Run diagnostic scan to identify system anomalies.',
    override: 'Emergency override - input the correct authorization code.',
    routing: 'Reroute power through backup conduits.',
  }

  const taskCount = Math.min(2 + Math.floor(round / 2), 4)
  for (let i = 0; i < taskCount; i++) {
    const type = taskTypes[i % taskTypes.length]
    const task: RepairTask = {
      id: `${roomId}-task-${i}`,
      type,
      requiredRole: taskRoles[i % taskRoles.length],
      description: taskDescriptions[type],
      progress: 0,
      completed: false,
      puzzleData: null,
    }
    if (type === 'wiring') task.puzzleData = generateWiringPuzzle()
    else if (type === 'diagnostic') task.puzzleData = generateDiagnosticPuzzle()
    else if (type === 'override') task.puzzleData = generateOverridePuzzle()
    else task.puzzleData = { route: Math.floor(Math.random() * 4) + 1, selectedRoute: 0 }

    tasks.push(task)
  }
  return tasks
}

// ============================================================
// GAME STATE MANAGEMENT
// ============================================================

const games = new Map<string, GameState>()

function createRoomMap(): RoomNode[] {
  const map = ROOM_TEMPLATES.map(r => ({
    ...r,
    status: 'active' as RoomNode['status'],
    repairTasks: [],
  }))
  // Add 1-2 random extra connections
  const shuffled = [...EXTRA_CONNECTIONS].sort(() => Math.random() - 0.5)
  const extras = shuffled.slice(0, 1 + Math.floor(Math.random() * 2))
  for (const [a, b] of extras) {
    const nodeA = map.find(n => n.id === a)
    const nodeB = map.find(n => n.id === b)
    if (nodeA && nodeB) {
      if (!nodeA.connections.includes(b)) nodeA.connections.push(b)
      if (!nodeB.connections.includes(a)) nodeB.connections.push(a)
    }
  }
  return map
}

function createGame(roomId: string): GameState {
  const themes: GameState['disasterTheme'][] = ['water', 'sound', 'light', 'gravity']
  return {
    roomId,
    round: 0,
    phase: 'lobby',
    phaseTimer: 0,
    stationMap: createRoomMap(),
    activeSector: null,
    repairProgress: 0,
    disasterTheme: themes[Math.floor(Math.random() * themes.length)],
    aiMemory: {
      playerNames: [],
      roomsSaved: [],
      roomsSacrificed: [],
      playerDeaths: 0,
      heroicActions: [],
      mistakes: [],
      emotionalState: 'confused',
      accumulatedDialogue: [],
    },
    players: [],
    panicLevel: 0,
    sacrificedRooms: [],
    eventLog: [],
    votes: { save: [], sacrifice: [] },
    puzzlesCompleted: 0,
    totalPuzzles: 0,
  }
}

function addEvent(game: GameState, description: string) {
  game.eventLog.push({
    id: Math.random().toString(36).substr(2, 9),
    round: game.round,
    phase: game.phase,
    description,
    timestamp: Date.now(),
  })
}

function emitAI(game: GameState, text: string) {
  const prefixed = `ARIA: ${text}`
  game.aiMemory.accumulatedDialogue.push(prefixed)
  io.to(game.roomId).emit('ai-dialogue', { text: prefixed, emotionalState: game.aiMemory.emotionalState })
}

function emitState(game: GameState) {
  // Strip large puzzle data for performance
  const lightState = {
    ...game,
    stationMap: game.stationMap.map(r => ({
      ...r,
      repairTasks: r.repairTasks.map(t => ({
        ...t,
        puzzleData: t.puzzleData, // send full puzzle data for current active sector
      })),
    })),
  }
  io.to(game.roomId).emit('game-state', lightState)
}

// ============================================================
// GAME LOOP
// ============================================================

const gameTimers = new Map<string, ReturnType<typeof setInterval>>()

function startPhaseTimer(game: GameState, duration: number, onEnd: () => void) {
  game.phaseTimer = duration
  const timer = setInterval(() => {
    game.phaseTimer--
    if (game.phaseTimer <= 0) {
      clearInterval(timer)
      gameTimers.delete(game.roomId)
      onEnd()
    }
    emitState(game)
  }, 1000)
  gameTimers.set(game.roomId, timer)
}

function startRound(game: GameState) {
  game.round++
  game.repairProgress = 0
  game.votes = { save: [], sacrifice: [] }

  // Pick active sector (not sacrificed)
  const availableRooms = game.stationMap.filter(r => r.status !== 'sacrificed')
  const damagedRoom = availableRooms[Math.floor(Math.random() * availableRooms.length)]
  game.activeSector = damagedRoom.id
  damagedRoom.status = 'damaged'
  damagedRoom.repairTasks = generateRepairTasks(damagedRoom.id, game.round)
  game.totalPuzzles = damagedRoom.repairTasks.length
  game.puzzlesCompleted = 0

  // Update AI emotional state
  if (game.round === 1) game.aiMemory.emotionalState = 'confused'
  else if (game.round === 5) game.aiMemory.emotionalState = 'desperate'
  else if (game.aiMemory.roomsSacrificed.length > game.aiMemory.roomsSaved.length) game.aiMemory.emotionalState = 'sad'
  else game.aiMemory.emotionalState = 'hopeful'

  addEvent(game, `Round ${game.round} begins. Sector ${damagedRoom.name} is failing.`)

  // AI dialogue
  if (game.round === 1) {
    const lines = AI_DIALOGUES.game_start
    for (const line of lines) {
      emitAI(game, line)
    }
  }
  if (game.round === 5) {
    emitAI(game, getDialogue('last_round'))
  }
  emitAI(game, getDialogue('round_start', { sector: damagedRoom.name }))
  emitAI(game, getDialogue(`theme_${game.disasterTheme}`))

  // Start scramble phase
  startScramblePhase(game)
}

function startScramblePhase(game: GameState) {
  game.phase = 'scramble'
  addEvent(game, 'Scramble phase - navigate to the affected sector!')
  emitAI(game, getDialogue('phase_scramble'))
  io.to(game.roomId).emit('phase-change', { phase: 'scramble', round: game.round })
  emitState(game)

  startPhaseTimer(game, SCRAMBLE_TIME, () => {
    startHoldPhase(game)
  })
}

function startHoldPhase(game: GameState) {
  game.phase = 'hold'
  addEvent(game, 'Hold phase - repair the sector!')
  emitAI(game, getDialogue('phase_hold'))
  io.to(game.roomId).emit('phase-change', { phase: 'hold', round: game.round })
  emitState(game)

  startPhaseTimer(game, HOLD_TIME, () => {
    startEscapePhase(game)
  })
}

function startEscapePhase(game: GameState) {
  game.phase = 'escape'
  game.votes = { save: [], sacrifice: [] }
  addEvent(game, 'Vote phase - save or sacrifice the sector?')
  emitAI(game, getDialogue('phase_escape'))
  emitAI(game, getDialogue('vote_start'))
  io.to(game.roomId).emit('phase-change', { phase: 'escape', round: game.round })
  emitState(game)

  startPhaseTimer(game, ESCAPE_TIME, () => {
    resolveVote(game)
  })
}

function resolveVote(game: GameState) {
  const saveCount = game.votes.save.length
  const sacrificeCount = game.votes.sacrifice.length

  if (sacrificeCount > saveCount) {
    // Sacrifice wins
    if (game.activeSector) {
      const room = game.stationMap.find(r => r.id === game.activeSector)
      if (room) {
        room.status = 'sacrificed'
        game.sacrificedRooms.push(room.id)
        game.aiMemory.roomsSacrificed.push(room.name)
        game.panicLevel = Math.min(100, game.panicLevel + 15)
      }
    }
    addEvent(game, 'Sector has been sacrificed.')
    emitAI(game, getDialogue('room_abandoned'))
    emitAI(game, getDialogue('vote_sacrifice_wins'))
  } else {
    // Save wins (default if tie)
    if (game.activeSector) {
      const room = game.stationMap.find(r => r.id === game.activeSector)
      if (room) {
        room.status = 'active'
        room.repairTasks = []
        game.aiMemory.roomsSaved.push(room.name)
        game.repairProgress = 100
        game.panicLevel = Math.max(0, game.panicLevel - 10)
      }
    }
    addEvent(game, 'Sector has been saved!')
    emitAI(game, getDialogue('room_saved'))
    emitAI(game, getDialogue('vote_save_wins'))
  }

  io.to(game.roomId).emit('sacrifice-result', {
    saved: saveCount >= sacrificeCount,
    roomName: game.stationMap.find(r => r.id === game.activeSector)?.name || 'Unknown',
  })

  // Check game over conditions
  const sacrificedCount = game.stationMap.filter(r => r.status === 'sacrificed').length
  if (sacrificedCount >= 4) {
    // Too many rooms lost
    endGame(game, false)
    return
  }

  if (game.round >= 5) {
    endGame(game, true)
    return
  }

  // Next round
  emitState(game)
  setTimeout(() => {
    startRound(game)
  }, 5000)
}

function endGame(game: GameState, survived: boolean) {
  game.phase = 'gameover'
  if (gameTimers.has(game.roomId)) {
    clearInterval(gameTimers.get(game.roomId)!)
    gameTimers.delete(game.roomId)
  }

  const stationLog = generateStationLog(game, survived)
  addEvent(game, survived ? 'Station survived!' : 'Station lost...')
  io.to(game.roomId).emit('phase-change', { phase: 'gameover', round: game.round })
  io.to(game.roomId).emit('station-log', { log: stationLog, survived })

  if (survived) {
    emitAI(game, 'We made it. Against all odds, we held the door. Thank you... for not forgetting me.')
    game.aiMemory.emotionalState = 'grateful'
  } else {
    emitAI(game, 'I can feel myself fading. The doors are opening and there is no one left to hold them. Goodbye...')
    game.aiMemory.emotionalState = 'sad'
  }

  emitState(game)
}

function generateStationLog(game: GameState, survived: boolean): string {
  const players = game.players.map(p => p.name).join(', ')
  const roomsSaved = game.aiMemory.roomsSaved.length
  const roomsLost = game.aiMemory.roomsSacrificed.length
  const savedNames = game.aiMemory.roomsSaved.join(', ') || 'none'
  const lostNames = game.aiMemory.roomsSacrificed.join(', ') || 'none'

  const finalMessage = survived
    ? 'The station breathes on, held together by hands that refused to let go.'
    : 'The silence is complete now. Only the void remembers we were here.'

  return `STATION LOG - Run #${Date.now().toString(36).toUpperCase()}

Crew: ${players}
Theme: ${game.disasterTheme.toUpperCase()} protocol active
Rounds endured: ${game.round}

Rooms saved (${roomsSaved}): ${savedNames}
Rooms lost (${roomsLost}): ${lostNames}

Panic level reached: ${game.panicLevel}%
Heroic actions: ${game.aiMemory.heroicActions.length}
Mistakes recorded: ${game.aiMemory.mistakes.length}

${finalMessage}

- ARIA`
}

// ============================================================
// SOCKET HANDLERS
// ============================================================

io.on('connection', (socket) => {
  console.log(`Connected: ${socket.id}`)

  // ---- JOIN GAME ----
  socket.on('join-game', (data: { playerName: string; roomId: string }) => {
    const { playerName, roomId } = data
    let game = games.get(roomId)
    if (!game) {
      game = createGame(roomId)
      games.set(roomId, game)
    }

    if (game.phase !== 'lobby') {
      socket.emit('error-message', { message: 'Game already in progress.' })
      return
    }
    if (game.players.length >= 4) {
      socket.emit('error-message', { message: 'Room is full (4/4).' })
      return
    }
    if (game.players.some(p => p.name === playerName)) {
      socket.emit('error-message', { message: 'Name already taken.' })
      return
    }

    const isHost = game.players.length === 0
    const role = ROLES[game.players.length]
    const startRoom = game.stationMap[Math.floor(Math.random() * game.stationMap.length)].id

    const player: Player = {
      id: socket.id,
      name: playerName,
      role,
      currentRoom: startRoom,
      health: 100,
      hasTool: false,
      toolType: null,
      isHost,
      socketId: socket.id,
    }

    game.players.push(player)
    game.aiMemory.playerNames.push(playerName)
    socket.join(roomId)

    addEvent(game, `${playerName} joined as ${role}.`)
    socket.emit('player-joined', { player, roomId })
    emitState(game)
    console.log(`${playerName} joined room ${roomId} as ${role}`)
  })

  // ---- START GAME ----
  socket.on('start-game', (data: { roomId: string }) => {
    const game = games.get(data.roomId)
    if (!game) return
    const player = game.players.find(p => p.socketId === socket.id)
    if (!player?.isHost) {
      socket.emit('error-message', { message: 'Only the host can start the game.' })
      return
    }
    if (game.players.length < 2) {
      socket.emit('error-message', { message: 'Need at least 2 players to start.' })
      return
    }

    startRound(game)
  })

  // ---- PLAYER MOVE ----
  socket.on('player-move', (data: { roomId: string; targetRoom: string }) => {
    const game = games.get(data.roomId)
    if (!game) return
    const player = game.players.find(p => p.socketId === socket.id)
    if (!player) return

    const currentRoom = game.stationMap.find(r => r.id === player.currentRoom)
    if (!currentRoom) return

    if (!currentRoom.connections.includes(data.targetRoom)) {
      socket.emit('error-message', { message: 'Cannot reach that room from here.' })
      return
    }

    const targetRoomNode = game.stationMap.find(r => r.id === data.targetRoom)
    if (targetRoomNode?.status === 'sacrificed') {
      socket.emit('error-message', { message: 'That room has been sacrificed. It is gone.' })
      return
    }

    player.currentRoom = data.targetRoom
    addEvent(game, `${player.name} moved to ${targetRoomNode?.name || data.targetRoom}.`)

    // Environmental hazard during scramble/hold
    if (game.phase === 'hold' && player.currentRoom === game.activeSector) {
      // Small chance of damage
      if (Math.random() < 0.15) {
        player.health = Math.max(0, player.health - 5)
        addEvent(game, `${player.name} took environmental damage!`)
        emitAI(game, getDialogue('player_damaged', { name: player.name }))
      }
    }

    emitState(game)
  })

  // ---- PLAYER INTERACT ----
  socket.on('player-interact', (data: { roomId: string; taskId: string }) => {
    const game = games.get(data.roomId)
    if (!game) return
    const player = game.players.find(p => p.socketId === socket.id)
    if (!player) return

    if (player.currentRoom !== game.activeSector) {
      socket.emit('error-message', { message: 'You must be in the active sector to interact.' })
      return
    }

    const room = game.stationMap.find(r => r.id === game.activeSector)
    if (!room) return
    const task = room.repairTasks.find(t => t.id === data.taskId)
    if (!task || task.completed) return

    // Check role requirement (relaxed - any player can contribute but role match is faster)
    const contribution = task.requiredRole === player.role ? 20 : 8
    task.progress = Math.min(100, task.progress + contribution)

    if (task.progress >= 100) {
      task.completed = true
      game.puzzlesCompleted++
      game.repairProgress = Math.round((game.puzzlesCompleted / game.totalPuzzles) * 100)
      game.panicLevel = Math.max(0, game.panicLevel - 5)
      game.aiMemory.heroicActions.push(`${player.name} completed ${task.type} task in round ${game.round}`)
      addEvent(game, `${player.name} completed ${task.type} task!`)

      // AI reacts to repair progress
      if (game.repairProgress >= 75) emitAI(game, getDialogue('repair_75'))
      else if (game.repairProgress >= 50) emitAI(game, getDialogue('repair_50'))
      else if (game.repairProgress >= 25) emitAI(game, getDialogue('repair_25'))

      // If all tasks completed, force save
      if (game.puzzlesCompleted >= game.totalPuzzles) {
        game.repairProgress = 100
        emitAI(game, getDialogue('repair_complete'))

        // Auto-resolve as save
        if (game.activeSector) {
          const savedRoom = game.stationMap.find(r => r.id === game.activeSector)
          if (savedRoom) {
            savedRoom.status = 'active'
            savedRoom.repairTasks = []
            game.aiMemory.roomsSaved.push(savedRoom.name)
          }
        }

        const sacrificedCount = game.stationMap.filter(r => r.status === 'sacrificed').length
        if (sacrificedCount >= 4) {
          setTimeout(() => endGame(game, false), 3000)
        } else if (game.round >= 5) {
          setTimeout(() => endGame(game, true), 3000)
        } else {
          setTimeout(() => startRound(game), 5000)
        }
      }
    } else {
      addEvent(game, `${player.name} worked on ${task.type} task (${task.progress}%).`)
    }

    emitState(game)
  })

  // ---- PUZZLE INPUT ----
  socket.on('puzzle-input', (data: { roomId: string; taskId: string; puzzleData: any }) => {
    const game = games.get(data.roomId)
    if (!game) return
    const player = game.players.find(p => p.socketId === socket.id)
    if (!player) return

    const room = game.stationMap.find(r => r.id === game.activeSector)
    if (!room) return
    const task = room.repairTasks.find(t => t.id === data.taskId)
    if (!task || task.completed) return

    // Process puzzle-specific logic
    if (task.type === 'wiring' && task.puzzleData) {
      const pd = task.puzzleData as ReturnType<typeof generateWiringPuzzle>
      if (data.puzzleData.connection) {
        pd.playerConnections.push(data.puzzleData.connection)
        // Check if all target connections are made
        const targetsMet = pd.targetConnections.every(([a, b]) =>
          pd.playerConnections.some(([pa, pb]) => (pa === a && pb === b) || (pa === b && pb === a))
        )
        if (targetsMet) {
          task.progress = 100
          task.completed = true
          game.puzzlesCompleted++
          game.repairProgress = Math.round((game.puzzlesCompleted / game.totalPuzzles) * 100)
          addEvent(game, `Wiring relay completed!`)
          emitAI(game, getDialogue('repair_50'))
        }
      }
    } else if (task.type === 'diagnostic' && task.puzzleData) {
      const pd = task.puzzleData as ReturnType<typeof generateDiagnosticPuzzle>
      if (data.puzzleData.selection) {
        pd.playerSelections.push(data.puzzleData.selection)
        const correctSelections = pd.playerSelections.filter(([r, c]) =>
          pd.anomalies.some(([ar, ac]) => ar === r && ac === c)
        )
        if (correctSelections.length >= pd.anomalies.length) {
          task.progress = 100
          task.completed = true
          game.puzzlesCompleted++
          game.repairProgress = Math.round((game.puzzlesCompleted / game.totalPuzzles) * 100)
          addEvent(game, `Diagnostic scan completed!`)
        }
      }
    } else if (task.type === 'override' && task.puzzleData) {
      const pd = task.puzzleData as ReturnType<typeof generateOverridePuzzle>
      if (data.puzzleData.code) {
        pd.sysopInput = data.puzzleData.code
        pd.powerLevel = data.puzzleData.powerLevel ?? pd.powerLevel
        const codeMatch = pd.sysopInput.length === pd.code.length &&
          pd.sysopInput.every((v: number, i: number) => v === pd.code[i])
        const powerOk = pd.powerLevel >= pd.requiredPower
        if (codeMatch && powerOk) {
          task.progress = 100
          task.completed = true
          game.puzzlesCompleted++
          game.repairProgress = Math.round((game.puzzlesCompleted / game.totalPuzzles) * 100)
          addEvent(game, `Emergency override successful!`)
        } else if (codeMatch && !powerOk) {
          addEvent(game, `Code correct but insufficient power!`)
        } else if (!codeMatch && powerOk) {
          addEvent(game, `Power sufficient but code incorrect!`)
        }
      }
      if (data.puzzleData.powerLevel !== undefined) {
        pd.powerLevel = data.puzzleData.powerLevel
      }
    } else if (task.type === 'routing' && task.puzzleData) {
      if (data.puzzleData.selectedRoute !== undefined) {
        task.puzzleData.selectedRoute = data.puzzleData.selectedRoute
        if (task.puzzleData.selectedRoute === task.puzzleData.route) {
          task.progress = 100
          task.completed = true
          game.puzzlesCompleted++
          game.repairProgress = Math.round((game.puzzlesCompleted / game.totalPuzzles) * 100)
          addEvent(game, `Power routing successful!`)
        } else {
          addEvent(game, `Wrong route selected. Try again.`)
        }
      }
    }

    // Check if all puzzles done
    if (game.puzzlesCompleted >= game.totalPuzzles && game.activeSector) {
      game.repairProgress = 100
      emitAI(game, getDialogue('repair_complete'))
      const savedRoom = game.stationMap.find(r => r.id === game.activeSector)
      if (savedRoom) {
        savedRoom.status = 'active'
        savedRoom.repairTasks = []
        game.aiMemory.roomsSaved.push(savedRoom.name)
      }
      const sacrificedCount = game.stationMap.filter(r => r.status === 'sacrificed').length
      if (sacrificedCount >= 4) {
        setTimeout(() => endGame(game, false), 3000)
      } else if (game.round >= 5) {
        setTimeout(() => endGame(game, true), 3000)
      } else {
        setTimeout(() => startRound(game), 5000)
      }
    }

    emitState(game)
  })

  // ---- VOTE SACRIFICE ----
  socket.on('vote-sacrifice', (data: { roomId: string }) => {
    const game = games.get(data.roomId)
    if (!game || game.phase !== 'escape') return
    const player = game.players.find(p => p.socketId === socket.id)
    if (!player) return

    // Remove from save if there
    game.votes.save = game.votes.save.filter(id => id !== player.id)
    if (!game.votes.sacrifice.includes(player.id)) {
      game.votes.sacrifice.push(player.id)
    }

    addEvent(game, `${player.name} voted to ABANDON the sector.`)
    emitState(game)

    // Check if all voted
    if (game.votes.save.length + game.votes.sacrifice.length >= game.players.length) {
      if (gameTimers.has(game.roomId)) {
        clearInterval(gameTimers.get(game.roomId)!)
        gameTimers.delete(game.roomId)
      }
      resolveVote(game)
    }
  })

  // ---- VOTE SAVE ----
  socket.on('vote-save', (data: { roomId: string }) => {
    const game = games.get(data.roomId)
    if (!game || game.phase !== 'escape') return
    const player = game.players.find(p => p.socketId === socket.id)
    if (!player) return

    game.votes.sacrifice = game.votes.sacrifice.filter(id => id !== player.id)
    if (!game.votes.save.includes(player.id)) {
      game.votes.save.push(player.id)
    }

    addEvent(game, `${player.name} voted to SAVE the sector.`)
    emitState(game)

    if (game.votes.save.length + game.votes.sacrifice.length >= game.players.length) {
      if (gameTimers.has(game.roomId)) {
        clearInterval(gameTimers.get(game.roomId)!)
        gameTimers.delete(game.roomId)
      }
      resolveVote(game)
    }
  })

  // ---- USE TOOL ----
  socket.on('use-tool', (data: { roomId: string; taskId: string }) => {
    const game = games.get(data.roomId)
    if (!game) return
    const player = game.players.find(p => p.socketId === socket.id)
    if (!player || !player.hasTool) return

    const room = game.stationMap.find(r => r.id === game.activeSector)
    if (!room) return
    const task = room.repairTasks.find(t => t.id === data.taskId)
    if (!task || task.completed) return

    task.progress = Math.min(100, task.progress + 30)
    player.hasTool = false
    player.toolType = null
    addEvent(game, `${player.name} used a tool on ${task.type} task!`)

    if (task.progress >= 100) {
      task.completed = true
      game.puzzlesCompleted++
      game.repairProgress = Math.round((game.puzzlesCompleted / game.totalPuzzles) * 100)
    }

    emitState(game)
  })

  // ---- CHAT MESSAGE ----
  socket.on('chat-message', (data: { roomId: string; message: string }) => {
    const game = games.get(data.roomId)
    if (!game) return
    const player = game.players.find(p => p.socketId === socket.id)
    if (!player) return

    io.to(game.roomId).emit('chat-message', {
      playerName: player.name,
      message: data.message,
      timestamp: Date.now(),
    })
  })

  // ---- DISCONNECT ----
  socket.on('disconnect', () => {
    console.log(`Disconnected: ${socket.id}`)
    for (const [roomId, game] of games) {
      const playerIdx = game.players.findIndex(p => p.socketId === socket.id)
      if (playerIdx !== -1) {
        const player = game.players[playerIdx]
        game.players.splice(playerIdx, 1)
        addEvent(game, `${player.name} disconnected.`)
        socket.leave(roomId)

        // If in lobby and host left, reassign host
        if (game.phase === 'lobby' && game.players.length > 0 && player.isHost) {
          game.players[0].isHost = true
        }

        // If all players left, clean up
        if (game.players.length === 0) {
          if (gameTimers.has(roomId)) {
            clearInterval(gameTimers.get(roomId)!)
            gameTimers.delete(roomId)
          }
          games.delete(roomId)
        } else {
          emitState(game)
        }
        break
      }
    }
  })

  socket.on('error', (error) => {
    console.error(`Socket error (${socket.id}):`, error)
  })
})

// ============================================================
// SERVER START
// ============================================================

const PORT = 3030
httpServer.listen(PORT, '::', () => {
  console.log(`Hold The Door - Game Server running on port ${PORT}`)
})

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...')
  for (const [roomId, timer] of gameTimers) {
    clearInterval(timer)
  }
  httpServer.close(() => process.exit(0))
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...')
  for (const [roomId, timer] of gameTimers) {
    clearInterval(timer)
  }
  httpServer.close(() => process.exit(0))
})
