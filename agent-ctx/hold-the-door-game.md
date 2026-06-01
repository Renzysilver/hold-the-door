# Task: Build "Hold The Door" Multiplayer Game Prototype

## Summary
Built a complete web-based multiplayer cooperative survival game called "Hold The Door" with:
- Socket.io game server (mini-service on port 3030)
- Next.js 16 frontend with HTML5 Canvas + DOM overlay
- Full game loop (5 rounds, 3 phases per round)
- AI dialogue system (ARIA)
- Puzzle mechanics, vote/sacrifice system
- Atmospheric dark space theme

## Architecture

### Game Server (`mini-services/game-server/`)
- **Tech**: Bun runtime with Socket.io
- **Port**: 3030
- **Entry**: `index.ts`
- **Start**: `bun run dev` (uses `--hot` flag)
- **Features**:
  - 8-room space station map (graph layout with connections)
  - 5-round game loop with Scramble → Hold → Escape phases
  - 4 disaster themes (water, sound, light, gravity)
  - AI dialogue system with 80+ hand-written lines
  - 4 puzzle types: Wiring Relay, Diagnostic Scan, Emergency Override, Power Routing
  - Vote/sacrifice mechanic
  - Station Log generator
  - Player roles: Engineer, Medic, Captain, SysOp

### Frontend (`src/app/page.tsx` + `src/components/game/`)
- **Tech**: Next.js 16, TypeScript, Tailwind CSS, shadcn/ui, HTML5 Canvas
- **Components**:
  - `page.tsx` - Main game client with state management
  - `GameCanvas.tsx` - Canvas rendering of station map with particles
  - `AIDialogue.tsx` - Terminal-style AI dialogue with typewriter effect
  - `PlayerPanel.tsx` - Player info display
  - `PuzzleUI.tsx` - Puzzle interfaces (4 types)
  - `VoteScreen.tsx` - Vote overlay for save/sacrifice decisions
  - `GameOverScreen.tsx` - End-game summary and station log
  - `types.ts` - Shared TypeScript types

### Key Implementation Details
- WebSocket: `io('/?XTransformPort=3030')` for Caddy gateway compatibility
- Server bound to `::` (dual-stack) for proper Caddy proxy support
- Canvas renders: rooms, corridors, player tokens, disaster particles
- Typewriter animation for AI dialogue
- Role-based puzzle interactions
- Responsive design with mobile bottom panel

## Files Created/Modified
- `mini-services/game-server/package.json`
- `mini-services/game-server/index.ts` (~1040 lines)
- `src/app/page.tsx` (~590 lines)
- `src/app/layout.tsx` (updated metadata)
- `src/app/globals.css` (added game-specific styles)
- `src/components/game/types.ts`
- `src/components/game/GameCanvas.tsx`
- `src/components/game/AIDialogue.tsx`
- `src/components/game/PlayerPanel.tsx`
- `src/components/game/PuzzleUI.tsx`
- `src/components/game/VoteScreen.tsx`
- `src/components/game/GameOverScreen.tsx`
- `public/game-bg.png` (generated game background)
- `public/game-over-bg.png` (generated game over background)

## How to Play
1. Open the app in 2-4 browser tabs
2. Each player enters a name and joins the same Station ID
3. Host clicks "Start Game" (needs 2+ players)
4. Navigate to affected sectors by clicking rooms on the map
5. Complete repair tasks during Hold phase
6. Vote to save or sacrifice sectors during Escape phase
7. Survive 5 rounds to win!
