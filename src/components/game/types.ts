// Shared types for the game client

export interface RoomNode {
  id: string
  name: string
  x: number
  y: number
  connections: string[]
  status: 'active' | 'damaged' | 'sacrificed' | 'repairing'
  repairTasks: RepairTask[]
}

export interface RepairTask {
  id: string
  type: 'wiring' | 'diagnostic' | 'override' | 'routing'
  requiredRole: string
  description: string
  progress: number
  completed: boolean
  puzzleData: any
}

export interface Player {
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

export interface AIMemory {
  playerNames: string[]
  roomsSaved: string[]
  roomsSacrificed: string[]
  playerDeaths: number
  heroicActions: string[]
  mistakes: string[]
  emotionalState: 'confused' | 'hopeful' | 'sad' | 'grateful' | 'desperate'
  accumulatedDialogue: string[]
}

export interface GameEvent {
  id: string
  round: number
  phase: string
  description: string
  timestamp: number
}

export interface GameState {
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

export interface ChatMessage {
  playerName: string
  message: string
  timestamp: number
}

export const ROLE_COLORS: Record<string, string> = {
  engineer: '#f59e0b',
  medic: '#22c55e',
  captain: '#00d4ff',
  sysop: '#a855f7',
}

export const ROLE_ICONS: Record<string, string> = {
  engineer: '🔧',
  medic: '💊',
  captain: '⭐',
  sysop: '💻',
}

export const THEME_COLORS: Record<string, { primary: string; secondary: string; particle: string }> = {
  water: { primary: '#0ea5e9', secondary: '#38bdf8', particle: '#7dd3fc' },
  sound: { primary: '#f59e0b', secondary: '#fbbf24', particle: '#fde68a' },
  light: { primary: '#eab308', secondary: '#facc15', particle: '#fef08a' },
  gravity: { primary: '#a855f7', secondary: '#c084fc', particle: '#e9d5ff' },
}
