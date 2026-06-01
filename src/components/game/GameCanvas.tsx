'use client'

import { useEffect, useRef, useCallback } from 'react'
import { RoomNode, Player, ROLE_COLORS } from './types'

interface GameCanvasProps {
  stationMap: RoomNode[]
  players: Player[]
  activeSector: string | null
  currentRoom: string
  onRoomClick: (roomId: string) => void
  panicLevel: number
  disasterTheme: string
}

export default function GameCanvas({
  stationMap,
  players,
  activeSector,
  currentRoom,
  onRoomClick,
  panicLevel,
  disasterTheme,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number }>>([])

  // Draw particles - declared first since it's used by drawMap
  const drawParticles = useCallback((ctx: CanvasRenderingContext2D, W: number, H: number) => {
    const particles = particlesRef.current
    const now = Date.now()

    // Spawn new particles based on panic level
    const spawnRate = Math.floor(panicLevel / 20) + 1
    for (let i = 0; i < spawnRate; i++) {
      if (particles.length < 100 && Math.random() < 0.3) {
        let p
        if (disasterTheme === 'water') {
          p = { x: Math.random() * W, y: -5, vx: (Math.random() - 0.5) * 0.5, vy: 1 + Math.random() * 2, life: 0, maxLife: 100 + Math.random() * 100, size: 1 + Math.random() * 2 }
        } else if (disasterTheme === 'sound') {
          const angle = Math.random() * Math.PI * 2
          const speed = 0.5 + Math.random() * 1.5
          p = { x: W / 2, y: H / 2, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0, maxLife: 60 + Math.random() * 40, size: 1 + Math.random() }
        } else if (disasterTheme === 'light') {
          p = { x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0, life: 0, maxLife: 20 + Math.random() * 30, size: 2 + Math.random() * 4 }
        } else {
          p = { x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 1, vy: (Math.random() - 0.5) * 1 - 0.5, life: 0, maxLife: 80 + Math.random() * 60, size: 1 + Math.random() * 2 }
        }
        particles.push(p)
      }
    }

    const themeColors: Record<string, string> = {
      water: '100, 180, 255',
      sound: '255, 200, 50',
      light: '255, 255, 200',
      gravity: '200, 150, 255',
    }
    const colorBase = themeColors[disasterTheme] || '0, 212, 255'

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p.x += p.vx
      p.y += p.vy
      p.life++

      if (disasterTheme === 'gravity') {
        p.vy += 0.02 * Math.sin(now / 500 + i)
        p.vx += 0.01 * Math.cos(now / 700 + i)
      }

      const alpha = Math.max(0, 1 - p.life / p.maxLife) * 0.6
      ctx.fillStyle = `rgba(${colorBase}, ${alpha})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()

      if (p.life >= p.maxLife || p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10) {
        particles.splice(i, 1)
      }
    }
  }, [disasterTheme, panicLevel])

  const drawMap = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height

    // Clear with dark background
    ctx.fillStyle = '#0a0e17'
    ctx.fillRect(0, 0, W, H)

    // Draw grid pattern
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.03)'
    ctx.lineWidth = 1
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, H)
      ctx.stroke()
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(W, y)
      ctx.stroke()
    }

    // Draw connections (corridors)
    const drawnConnections = new Set<string>()
    for (const room of stationMap) {
      for (const connId of room.connections) {
        const key = [room.id, connId].sort().join('-')
        if (drawnConnections.has(key)) continue
        drawnConnections.add(key)
        const target = stationMap.find(r => r.id === connId)
        if (!target) continue

        const sx = (room.x / 800) * W
        const sy = (room.y / 560) * H
        const tx = (target.x / 800) * W
        const ty = (target.y / 560) * H

        const isConnectedToActive =
          (room.id === activeSector || target.id === activeSector) &&
          (room.status !== 'sacrificed' && target.status !== 'sacrificed')

        if (room.status === 'sacrificed' || target.status === 'sacrificed') {
          ctx.strokeStyle = 'rgba(100, 100, 100, 0.15)'
          ctx.lineWidth = 1
          ctx.setLineDash([4, 8])
        } else if (isConnectedToActive) {
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)'
          ctx.lineWidth = 2
          ctx.setLineDash([])
        } else {
          ctx.strokeStyle = 'rgba(0, 212, 255, 0.25)'
          ctx.lineWidth = 1.5
          ctx.setLineDash([])
        }

        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(tx, ty)
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    // Draw rooms
    const roomW = 110
    const roomH = 56
    for (const room of stationMap) {
      const rx = (room.x / 800) * W - roomW / 2
      const ry = (room.y / 560) * H - roomH / 2
      const cx = (room.x / 800) * W
      const cy = (room.y / 560) * H

      if (room.status === 'sacrificed') {
        ctx.fillStyle = 'rgba(30, 30, 40, 0.8)'
        ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)'
        ctx.lineWidth = 1
        roundRect(ctx, rx, ry, roomW, roomH, 6)
        ctx.fill()
        ctx.stroke()

        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(rx + 10, ry + 10)
        ctx.lineTo(rx + roomW - 10, ry + roomH - 10)
        ctx.moveTo(rx + roomW - 10, ry + 10)
        ctx.lineTo(rx + 10, ry + roomH - 10)
        ctx.stroke()

        ctx.fillStyle = 'rgba(100, 100, 100, 0.5)'
        ctx.font = '11px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(room.name, cx, cy + 4)
        continue
      }

      const isActive = room.id === activeSector
      const isCurrent = room.id === currentRoom
      const isDamaged = room.status === 'damaged'

      if (isActive) {
        const pulse = 0.3 + Math.sin(Date.now() / 300) * 0.15
        ctx.shadowColor = '#ef4444'
        ctx.shadowBlur = 20 * pulse + 10
      } else if (isCurrent) {
        ctx.shadowColor = '#00d4ff'
        ctx.shadowBlur = 12
      }

      if (isActive) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.15)'
      } else if (isDamaged) {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.1)'
      } else {
        ctx.fillStyle = 'rgba(0, 212, 255, 0.05)'
      }

      ctx.strokeStyle = isActive
        ? '#ef4444'
        : isCurrent
          ? '#00d4ff'
          : isDamaged
            ? '#f59e0b'
            : 'rgba(0, 212, 255, 0.3)'
      ctx.lineWidth = isActive ? 2.5 : isCurrent ? 2 : 1.5

      roundRect(ctx, rx, ry, roomW, roomH, 6)
      ctx.fill()
      ctx.stroke()

      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0

      ctx.fillStyle = isActive ? '#fca5a5' : isDamaged ? '#fbbf24' : '#94a3b8'
      ctx.font = isActive ? 'bold 12px monospace' : '11px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(room.name, cx, cy - 4)

      if (isActive) {
        ctx.fillStyle = '#ef4444'
        ctx.font = '9px monospace'
        ctx.fillText('⚠ UNDER ATTACK', cx, cy + 12)
      } else if (room.status === 'repairing') {
        ctx.fillStyle = '#22c55e'
        ctx.font = '9px monospace'
        ctx.fillText('⟳ REPAIRING', cx, cy + 12)
      }

      if (room.repairTasks.length > 0) {
        const taskY = cy + 22
        const completed = room.repairTasks.filter(t => t.completed).length
        ctx.fillStyle = '#64748b'
        ctx.font = '8px monospace'
        ctx.fillText(`Tasks: ${completed}/${room.repairTasks.length}`, cx, taskY)
      }
    }

    // Draw player tokens
    for (const player of players) {
      const room = stationMap.find(r => r.id === player.currentRoom)
      if (!room || room.status === 'sacrificed') continue

      const pIdx = players.indexOf(player)
      const offsetX = (pIdx % 2) * 24 - 12
      const offsetY = Math.floor(pIdx / 2) * 24 - 12

      const px = (room.x / 800) * W + offsetX
      const py = (room.y / 560) * H + 38 + offsetY

      const color = ROLE_COLORS[player.role] || '#ffffff'

      ctx.beginPath()
      ctx.arc(px, py, 8, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = '#0a0e17'
      ctx.lineWidth = 1.5
      ctx.stroke()

      ctx.fillStyle = color
      ctx.font = '8px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(player.name.slice(0, 6), px, py - 12)
    }

    // Draw disaster particles
    drawParticles(ctx, W, H)

  }, [stationMap, players, activeSector, currentRoom, drawParticles])

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const container = canvas.parentElement
      if (container) {
        canvas.width = container.clientWidth
        canvas.height = container.clientHeight
      }
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const animate = () => {
      drawMap()
      animFrameRef.current = requestAnimationFrame(animate)
    }
    animFrameRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [drawMap])

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    const W = canvas.width
    const H = canvas.height

    const roomW = 110
    const roomH = 56

    for (const room of stationMap) {
      if (room.status === 'sacrificed') continue
      const rx = (room.x / 800) * W - roomW / 2
      const ry = (room.y / 560) * H - roomH / 2

      if (mx >= rx && mx <= rx + roomW && my >= ry && my <= ry + roomH) {
        onRoomClick(room.id)
        break
      }
    }
  }

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      className="w-full h-full cursor-pointer"
      style={{ imageRendering: 'auto' }}
    />
  )
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
