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

// Ambient background stars
interface Star {
  x: number
  y: number
  size: number
  alpha: number
  twinkleSpeed: number
  twinkleOffset: number
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
  const starsRef = useRef<Star[]>([])
  const sacrificeAnimsRef = useRef<Map<string, { startTime: number; duration: number }>>(new Map())
  const prevSacrificedRef = useRef<Set<string>>(new Set())

  // Initialize background stars
  useEffect(() => {
    const stars: Star[] = []
    for (let i = 0; i < 60; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        size: 0.5 + Math.random() * 1.5,
        alpha: 0.2 + Math.random() * 0.5,
        twinkleSpeed: 1 + Math.random() * 3,
        twinkleOffset: Math.random() * Math.PI * 2,
      })
    }
    starsRef.current = stars
  }, [])

  // Track newly sacrificed rooms for dissolve animation
  useEffect(() => {
    const currentSacrificed = new Set(
      stationMap.filter(r => r.status === 'sacrificed').map(r => r.id)
    )
    // Find newly sacrificed rooms
    for (const id of currentSacrificed) {
      if (!prevSacrificedRef.current.has(id)) {
        sacrificeAnimsRef.current.set(id, {
          startTime: Date.now(),
          duration: 1500,
        })
      }
    }
    prevSacrificedRef.current = currentSacrificed
  }, [stationMap])

  const drawParticles = useCallback((ctx: CanvasRenderingContext2D, W: number, H: number) => {
    const particles = particlesRef.current
    const now = Date.now()

    const spawnRate = Math.floor(panicLevel / 20) + 1
    for (let i = 0; i < spawnRate; i++) {
      if (particles.length < 120 && Math.random() < 0.3) {
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
    const now = Date.now()

    // Scale room dimensions based on canvas size for responsiveness
    const scale = Math.min(W / 800, H / 560)
    const roomW = Math.max(70, 110 * scale)
    const roomH = Math.max(36, 56 * scale)

    // Clear with dark background
    ctx.fillStyle = '#0a0e17'
    ctx.fillRect(0, 0, W, H)

    // Draw background stars
    for (const star of starsRef.current) {
      const twinkle = Math.sin(now / 1000 * star.twinkleSpeed + star.twinkleOffset) * 0.3 + 0.7
      const alpha = star.alpha * twinkle
      ctx.fillStyle = `rgba(200, 220, 255, ${alpha})`
      ctx.beginPath()
      ctx.arc(star.x * W, star.y * H, star.size, 0, Math.PI * 2)
      ctx.fill()
    }

    // Draw grid pattern with subtle pulsing
    const gridAlpha = 0.02 + Math.sin(now / 3000) * 0.005
    ctx.strokeStyle = `rgba(0, 212, 255, ${gridAlpha})`
    ctx.lineWidth = 1
    const gridSize = 40 * scale
    for (let x = 0; x < W; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, H)
      ctx.stroke()
    }
    for (let y = 0; y < H; y += gridSize) {
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
          // Pulsing connection to active sector
          const connPulse = 0.4 + Math.sin(now / 500) * 0.2
          ctx.strokeStyle = `rgba(239, 68, 68, ${connPulse})`
          ctx.lineWidth = 2.5
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
    for (const room of stationMap) {
      const rx = (room.x / 800) * W - roomW / 2
      const ry = (room.y / 560) * H - roomH / 2
      const cx = (room.x / 800) * W
      const cy = (room.y / 560) * H

      if (room.status === 'sacrificed') {
        // Check for dissolve animation
        const anim = sacrificeAnimsRef.current.get(room.id)
        let dissolveProgress = 1
        if (anim) {
          dissolveProgress = Math.min(1, (now - anim.startTime) / anim.duration)
          if (dissolveProgress >= 1) {
            sacrificeAnimsRef.current.delete(room.id)
          }
        }

        const dissolveAlpha = Math.max(0.08, 0.8 * (1 - dissolveProgress * 0.9))
        const dissolveBlur = dissolveProgress * 4

        ctx.save()
        if (dissolveBlur > 0.5) {
          ctx.filter = `blur(${dissolveBlur}px)`
        }

        ctx.fillStyle = `rgba(30, 30, 40, ${dissolveAlpha})`
        ctx.strokeStyle = `rgba(100, 100, 100, ${dissolveAlpha * 0.3})`
        ctx.lineWidth = 1
        roundRect(ctx, rx, ry, roomW, roomH, 6 * scale)
        ctx.fill()
        ctx.stroke()

        // X mark with dissolve
        if (dissolveProgress < 0.8) {
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.4 * (1 - dissolveProgress)})`
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(rx + 10, ry + 10)
          ctx.lineTo(rx + roomW - 10, ry + roomH - 10)
          ctx.moveTo(rx + roomW - 10, ry + 10)
          ctx.lineTo(rx + 10, ry + roomH - 10)
          ctx.stroke()
        }

        ctx.filter = 'none'
        ctx.restore()

        ctx.fillStyle = `rgba(100, 100, 100, ${0.5 * (1 - dissolveProgress * 0.8)})`
        ctx.font = `${Math.max(9, 11 * scale)}px monospace`
        ctx.textAlign = 'center'
        ctx.fillText(room.name, cx, cy + 4)
        continue
      }

      const isActive = room.id === activeSector
      const isCurrent = room.id === currentRoom
      const isDamaged = room.status === 'damaged'

      // Glow effects for active/damaged rooms
      if (isActive) {
        const pulse = 0.3 + Math.sin(now / 300) * 0.15
        ctx.shadowColor = '#ef4444'
        ctx.shadowBlur = 20 * pulse + 12
      } else if (isCurrent) {
        ctx.shadowColor = '#00d4ff'
        ctx.shadowBlur = 12
      } else if (isDamaged) {
        // Damaged rooms pulse with amber warning
        const dmgPulse = 0.2 + Math.sin(now / 800) * 0.1
        ctx.shadowColor = '#f59e0b'
        ctx.shadowBlur = 8 * dmgPulse + 4
      }

      // Room fill
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

      roundRect(ctx, rx, ry, roomW, roomH, 6 * scale)
      ctx.fill()
      ctx.stroke()

      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0

      // Room label
      ctx.fillStyle = isActive ? '#fca5a5' : isDamaged ? '#fbbf24' : '#94a3b8'
      ctx.font = isActive ? `bold ${Math.max(10, 12 * scale)}px monospace` : `${Math.max(9, 11 * scale)}px monospace`
      ctx.textAlign = 'center'
      ctx.fillText(room.name, cx, cy - 4 * scale)

      // Status text
      if (isActive) {
        ctx.fillStyle = '#ef4444'
        ctx.font = `${Math.max(7, 9 * scale)}px monospace`
        ctx.fillText('⚠ UNDER ATTACK', cx, cy + 12 * scale)
      } else if (room.status === 'repairing') {
        ctx.fillStyle = '#22c55e'
        ctx.font = `${Math.max(7, 9 * scale)}px monospace`
        const repairPulse = Math.sin(now / 600) > 0
        ctx.fillText(repairPulse ? '⟳ REPAIRING' : '  REPAIRING', cx, cy + 12 * scale)
      }

      // Task progress
      if (room.repairTasks.length > 0) {
        const taskY = cy + 22 * scale
        const completed = room.repairTasks.filter(t => t.completed).length
        ctx.fillStyle = '#64748b'
        ctx.font = `${Math.max(6, 8 * scale)}px monospace`
        ctx.fillText(`Tasks: ${completed}/${room.repairTasks.length}`, cx, taskY)
      }
    }

    // Draw player tokens with glow
    for (const player of players) {
      const room = stationMap.find(r => r.id === player.currentRoom)
      if (!room || room.status === 'sacrificed') continue

      const pIdx = players.indexOf(player)
      const offsetX = (pIdx % 2) * 24 * scale - 12 * scale
      const offsetY = Math.floor(pIdx / 2) * 24 * scale - 12 * scale

      const px = (room.x / 800) * W + offsetX
      const py = (room.y / 560) * H + 38 * scale + offsetY

      const color = ROLE_COLORS[player.role] || '#ffffff'

      // Player token glow
      ctx.shadowColor = color
      ctx.shadowBlur = 6

      ctx.beginPath()
      ctx.arc(px, py, 8 * scale, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = '#0a0e17'
      ctx.lineWidth = 1.5
      ctx.stroke()

      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0

      ctx.fillStyle = color
      ctx.font = `${Math.max(7, 8 * scale)}px monospace`
      ctx.textAlign = 'center'
      ctx.fillText(player.name.slice(0, 6), px, py - 12 * scale)
    }

    // Draw disaster particles
    drawParticles(ctx, W, H)

    // Vignette effect on canvas
    const vignette = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.7)
    vignette.addColorStop(0, 'transparent')
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.3)')
    ctx.fillStyle = vignette
    ctx.fillRect(0, 0, W, H)

  }, [stationMap, players, activeSector, currentRoom, drawParticles, panicLevel])

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const container = canvas.parentElement
      if (container) {
        const dpr = window.devicePixelRatio || 1
        const displayWidth = container.clientWidth
        const displayHeight = container.clientHeight
        canvas.width = displayWidth * dpr
        canvas.height = displayHeight * dpr
        canvas.style.width = `${displayWidth}px`
        canvas.style.height = `${displayHeight}px`
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.scale(dpr, dpr)
        }
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

    const W = rect.width
    const H = rect.height

    const scale = Math.min(W / 800, H / 560)
    const roomW = Math.max(70, 110 * scale)
    const roomH = Math.max(36, 56 * scale)

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

  // Touch handler for mobile
  const handleTouch = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const touch = e.touches[0]
    if (!touch) return

    const rect = canvas.getBoundingClientRect()
    const mx = touch.clientX - rect.left
    const my = touch.clientY - rect.top

    const W = rect.width
    const H = rect.height

    const scale = Math.min(W / 800, H / 560)
    const roomW = Math.max(70, 110 * scale)
    const roomH = Math.max(36, 56 * scale)

    for (const room of stationMap) {
      if (room.status === 'sacrificed') continue
      const rx = (room.x / 800) * W - roomW / 2
      const ry = (room.y / 560) * H - roomH / 2

      // Expanded hit area for touch (add 10px padding)
      const pad = 10
      if (mx >= rx - pad && mx <= rx + roomW + pad && my >= ry - pad && my <= ry + roomH + pad) {
        onRoomClick(room.id)
        break
      }
    }
  }, [stationMap, onRoomClick])

  return (
    <div className="canvas-container scanline-overlay scanline-beam">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onTouchStart={handleTouch}
        className="w-full h-full cursor-pointer"
        style={{ imageRendering: 'auto', touchAction: 'manipulation' }}
      />
    </div>
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
