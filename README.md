# HOLD THE DOOR

A 4-player cooperative survival game set on a dying space station. The station AI, ARIA, is losing its memories — and the station is forgetting how to function. Work together with your crew to repair sectors, make impossible choices, and **hold the door**.

## Game Overview

- **Genre:** Co-op Survival / Puzzle
- **Players:** 2–4 (online multiplayer)
- **Session Length:** ~15–20 minutes (5 rounds)
- **Round Structure:** 3 phases per round:
  1. **Scramble** (30s) — Navigate to the failing sector
  2. **Hold** (120s) — Complete role-based repair puzzles
  3. **Escape/Save** (45s) — Vote: save the sector or sacrifice it

### Roles

| Role | Icon | Specialty |
|------|------|-----------|
| Engineer | 🔧 | Wiring & routing tasks (2x contribution) |
| Medic | 💊 | Diagnostic & override tasks (2x contribution) |
| Captain | ⭐ | Coordination & override tasks (2x contribution) |
| SysOp | 💻 | Override & diagnostic tasks (2x contribution) |

### Disaster Themes

Each run features a random disaster theme that affects the station atmosphere:
- **Water** — Flooding, hull breaches
- **Sound** — Resonance cascades, noise interference
- **Light** — Power fluctuations, darkness
- **Gravity** — Gravity shifts, spatial distortion

### Sacrifice Mechanic

Between rounds, players vote to either save or sacrifice the damaged sector. Sacrificed rooms are permanently lost — the map shrinks, panic increases, and ARIA grieves. Lose 4+ rooms and the station dies.

---

## Tech Stack

- **Frontend:** Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui
- **Game Server:** Socket.io (Node.js / Bun)
- **Rendering:** HTML5 Canvas
- **Runtime:** Bun (recommended) or Node.js 18+

---

## Quick Start (Linux)

### Prerequisites

```bash
# Option 1: Install Bun (recommended)
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc  # or restart your terminal

# Option 2: Install Node.js 18+ via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

### Clone and Install

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/hold-the-door.git
cd hold-the-door

# Install frontend dependencies
bun install

# Install game server dependencies
cd mini-services/game-server
bun install
cd ../..
```

### Run the Game

You need **two terminals** — one for the game server and one for the web frontend.

**Terminal 1 — Game Server (Socket.io on port 3030):**
```bash
cd mini-services/game-server
bun run dev
```

You should see:
```
Hold The Door - Game Server running on port 3030
```

**Terminal 2 — Next.js Frontend (port 3000):**
```bash
bun run dev
```

You should see:
```
✓ Ready on http://localhost:3000
```

### Play

1. Open **http://localhost:3000** in your browser
2. Enter a callsign and station ID (e.g., `station-1`)
3. Share the same station ID with friends to join the same room
4. The host clicks **START GAME** when 2–4 players have joined
5. Work together to hold the door!

---

## Production Build

```bash
# Build the frontend
bun run build

# Start production frontend
bun run start

# Start game server (in another terminal)
cd mini-services/game-server
bun run dev
```

The production frontend runs on port 3000, game server on port 3030.

---

## Project Structure

```
hold-the-door/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main game page (lobby + game + game over)
│   │   ├── layout.tsx            # Root layout
│   │   └── globals.css           # Global styles (space theme)
│   ├── components/
│   │   ├── game/
│   │   │   ├── GameCanvas.tsx    # Canvas-based station map renderer
│   │   │   ├── AIDialogue.tsx    # ARIA AI dialogue panel
│   │   │   ├── PlayerPanel.tsx   # Player stats & role info
│   │   │   ├── PuzzleUI.tsx      # Interactive repair puzzles
│   │   │   ├── VoteScreen.tsx    # Save/sacrifice voting overlay
│   │   │   ├── GameOverScreen.tsx# End-game station log display
│   │   │   └── types.ts         # Shared TypeScript types
│   │   └── ui/                   # shadcn/ui components
│   ├── hooks/                    # React hooks
│   └── lib/                      # Utility functions
├── mini-services/
│   └── game-server/
│       ├── index.ts              # Socket.io game server (full game logic)
│       └── package.json          # Server dependencies
├── public/                       # Static assets (logo, backgrounds)
├── download/
│   └── Hold_The_Door_MVP_Design_Document.pdf  # Full GDD
├── prisma/                       # Database schema (future use)
├── package.json                  # Frontend dependencies
└── README.md                     # This file
```

---

## Game Server API (Socket.io Events)

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join-game` | `{ playerName, roomId }` | Join or create a game room |
| `start-game` | `{ roomId }` | Host starts the game (2+ players) |
| `player-move` | `{ roomId, targetRoom }` | Move to a connected room |
| `player-interact` | `{ roomId, taskId }` | Work on a repair task |
| `puzzle-input` | `{ roomId, taskId, puzzleData }` | Submit puzzle solution |
| `vote-save` | `{ roomId }` | Vote to save the sector |
| `vote-sacrifice` | `{ roomId }` | Vote to sacrifice the sector |
| `use-tool` | `{ roomId, taskId }` | Use a tool on a task |
| `chat-message` | `{ roomId, message }` | Send chat to crew |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `game-state` | `GameState` | Full game state update |
| `ai-dialogue` | `{ text, emotionalState }` | ARIA dialogue line |
| `phase-change` | `{ phase, round }` | Phase transition |
| `player-joined` | `{ player, roomId }` | Player joined confirmation |
| `sacrifice-result` | `{ saved, roomName }` | Vote result |
| `station-log` | `{ log, survived }` | End-game station log |
| `chat-message` | `ChatMessage` | Crew chat message |
| `error-message` | `{ message }` | Error notification |

---

## Running on a Linux Server (Headless / Remote)

If you want to host the game on a remote Linux server for friends to connect:

```bash
# 1. Install dependencies
sudo apt update
sudo apt install -y curl

# 2. Install Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# 3. Clone and install
git clone https://github.com/YOUR_USERNAME/hold-the-door.git
cd hold-the-door
bun install
cd mini-services/game-server && bun install && cd ../..

# 4. Build frontend
bun run build

# 5. Run with process manager (recommended)
# Install pm2
bun add -g pm2

# Start game server
pm2 start "bun run dev" --name htd-game-server --cwd ./mini-services/game-server

# Start frontend
pm2 start "bun run start" --name htd-frontend

# Save processes
pm2 save
pm2 startup  # Follow the output to enable auto-start on boot

# 6. Open firewall
sudo ufw allow 3000/tcp  # Frontend
sudo ufw allow 3030/tcp  # Game server (WebSocket)
```

Players connect at: `http://YOUR_SERVER_IP:3000`

> **Note:** The Next.js frontend proxies WebSocket connections to port 3030 via the `XTransformPort` header in the Socket.io client configuration. If you're using a reverse proxy (Nginx/Caddy), make sure WebSocket upgrade headers are forwarded.

---

## Development

```bash
# Lint
bun run lint

# Type check
npx tsc --noEmit

# Database (future)
bun run db:push
bun run db:generate
```

---

## License

MIT

---

*"The station is dying. Systems are failing. ARIA is losing its memories. Work together, hold the door, and don't let the silence win."*
