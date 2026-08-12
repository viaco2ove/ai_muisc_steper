import { useEffect, useRef, useCallback, useState } from 'react'
import { Note, velocityColor, midiToName, isBlackKey, snapBeat } from '../../utils/noteModel'

interface PianoRollProps {
  notes: Note[]
  totalBars?: number
  selectedId?: string | null
  onSelect?: (note: Note | null) => void
  onNoteUpdate?: (id: string, patch: Partial<Note>) => void
  onNoteAdd?: (note: Note) => void
  onNoteDelete?: (id: string) => void
  onNoteSplit?: (id: string) => void
  onNoteQuantize?: (id: string, snap: number) => void
  onSnapChange?: (snap: number) => void
  snap?: number // 量化步长(拍)，默认 0.25
  playheadBeat?: number | null // E4 走带播放头（拍）
  readOnly?: boolean
  dark?: boolean // E5 深色主题
}

// B4 右键菜单状态
interface ContextMenu {
  x: number
  y: number
  noteId: string | null
}

const PX_PER_BEAT = 30
const ROW_H = 11
const PAD_LEFT = 44
const PAD_TOP = 22

type DragState = {
  id: string
  mode: 'move' | 'resize'
  startX: number
  startY: number
  origStart: number
  origMidi: number
  origDur: number
}

/**
 * Canvas 钢琴卷帘（B1+B2）。
 * - 点击选中；拖动音符体改音高+起拍；拖右边缘改时值；双击空白加音符；量化吸附。
 * 真实数据由后端 notes 接口（A1）提供，当前 genDemoNotes 演示。
 */
export default function PianoRoll({
  notes,
  totalBars = 52,
  selectedId,
  onSelect,
  onNoteUpdate,
  onNoteAdd,
  onNoteDelete,
  onNoteSplit,
  onNoteQuantize,
  onSnapChange,
  snap = 0.25,
  playheadBeat = null,
  readOnly = false,
  dark = false,
}: PianoRollProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const drag = useRef<DragState | null>(null)
  const veloRef = useRef<HTMLCanvasElement>(null)

  // B3: 量化工具条状态
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [activeSnap, setActiveSnap] = useState(snap ?? 0.25)

  // B4: 右键菜单状态
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)

  // B5: 力度通道高度
  const VELO_H = 60

  const lo = notes.length ? Math.min(...notes.map((n) => n.midi)) - 2 : 48
  const hi = notes.length ? Math.max(...notes.map((n) => n.midi)) + 2 : 72
  const range = hi - lo + 1
  const beats = totalBars * 4
  const W = PAD_LEFT + beats * PX_PER_BEAT
  const H = PAD_TOP + range * ROW_H

  const layout = useCallback(
    (n: Note) => {
      const x = PAD_LEFT + n.startBeat * PX_PER_BEAT
      const w = Math.max(4, n.durBeats * PX_PER_BEAT - 2)
      const y = PAD_TOP + (hi - n.midi) * ROW_H + 1
      const h = ROW_H - 2
      return { x, y, w, h }
    },
    [hi],
  )

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.style.width = W + 'px'
    canvas.style.height = H + 'px'
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)

    // E3：视口裁剪边界（只画可见区内的音符，52 小节多轨不卡）
    const wrap = wrapRef.current
    let beatStart = -1
    let beatEnd = beats + 1
    if (wrap) {
      const viewLeft = wrap.scrollLeft
      const viewW = wrap.clientWidth
      beatStart = (viewLeft - PAD_LEFT) / PX_PER_BEAT - 1
      beatEnd = (viewLeft - PAD_LEFT + viewW) / PX_PER_BEAT + 1
    }

    // E5 深色主题调色板
    const C = dark
      ? { bg: '#0f172a', blackKey: '#1e293b', barLine: '#334155', minor: '#1e293b', barLabel: '#94a3b8', keyLabel: (black: boolean) => (black ? '#cbd5e1' : '#94a3b8'), axis: '#334155' }
      : { bg: '#ffffff', blackKey: '#eef1f5', barLine: '#cbd5e1', minor: '#eef2f7', barLabel: '#94a3b8', keyLabel: (black: boolean) => (black ? '#475569' : '#64748b'), axis: '#e2e8f0' }

    ctx.fillStyle = C.bg
    ctx.fillRect(0, 0, W, H)
    for (let m = lo; m <= hi; m++) {
      const y = PAD_TOP + (hi - m) * ROW_H
      if (isBlackKey(m)) {
        ctx.fillStyle = C.blackKey
        ctx.fillRect(PAD_LEFT, y, W - PAD_LEFT, ROW_H)
      }
    }

    ctx.font = '10px ui-monospace, monospace'
    ctx.textBaseline = 'middle'
    for (let b = 0; b <= beats; b++) {
      const x = PAD_LEFT + b * PX_PER_BEAT
      const barLine = b % 4 === 0
      ctx.strokeStyle = barLine ? C.barLine : C.minor
      ctx.lineWidth = barLine ? 1 : 0.5
      ctx.beginPath()
      ctx.moveTo(x, PAD_TOP)
      ctx.lineTo(x, H)
      ctx.stroke()
      if (barLine && b < beats) {
        ctx.fillStyle = C.barLabel
        ctx.fillText(`${(b / 4) + 1}`, x + 3, PAD_TOP / 2)
      }
    }

    ctx.textBaseline = 'middle'
    for (let m = lo; m <= hi; m++) {
      const y = PAD_TOP + (hi - m) * ROW_H + ROW_H / 2
      ctx.fillStyle = C.keyLabel(isBlackKey(m))
      ctx.fillText(midiToName(m), 4, y)
    }
    ctx.strokeStyle = C.axis
    ctx.beginPath()
    ctx.moveTo(PAD_LEFT, PAD_TOP)
    ctx.lineTo(PAD_LEFT, H)
    ctx.stroke()

    for (const n of notes) {
      if (n.startBeat > beatEnd || n.startBeat + n.durBeats < beatStart) continue
      const { x, y, w, h } = layout(n)
      ctx.fillStyle = n.color || velocityColor(n.velocity)
      ctx.globalAlpha = selectedId === n.id ? 1 : 0.92
      roundRect(ctx, x, y, w, h, 3)
      ctx.fill()

      // E2：人声 note 画音素边界（like_xstudio §3.1 mini phoneme track）
      if (n.phonemes && n.phonemes.length > 1 && n.phDurs && n.phDurs.length) {
        const sum = n.phDurs.reduce((a, b) => a + b, 0) || 1
        let cum = 0
        for (let i = 0; i < n.phonemes.length; i++) {
          const seg = (n.phDurs[i] || 1 / n.phonemes.length) / sum
          const segX0 = x + cum * w
          const segX1 = x + (cum + seg) * w
          cum += seg
          // 段内分隔竖线（白色）
          if (i < n.phonemes.length - 1) {
            ctx.strokeStyle = 'rgba(255,255,255,0.6)'
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(segX1, y + 1.5)
            ctx.lineTo(segX1, y + h - 1.5)
            ctx.stroke()
          }
          // 音素字母（段够宽才画）
          if (segX1 - segX0 > 7) {
            ctx.fillStyle = 'rgba(15,23,42,0.7)'
            ctx.font = '8px ui-monospace, monospace'
            ctx.textBaseline = 'middle'
            ctx.fillText(n.phonemes[i], segX0 + 2, y + h / 2)
          }
        }
      }

      if (selectedId === n.id) {
        ctx.globalAlpha = 1
        ctx.strokeStyle = '#1d4ed8'
        ctx.lineWidth = 2
        roundRect(ctx, x, y, w, h, 3)
        ctx.stroke()
        // 右边缘 resize 把手
        ctx.fillStyle = '#1d4ed8'
        ctx.fillRect(x + w - 3, y + h / 2 - 4, 3, 8)
      }
      ctx.globalAlpha = 1
    }

    // E4：走带播放头（红色竖线）
    if (playheadBeat != null) {
      const px = PAD_LEFT + playheadBeat * PX_PER_BEAT
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(px, PAD_TOP)
      ctx.lineTo(px, H)
      ctx.stroke()
      ctx.fillStyle = '#ef4444'
      ctx.beginPath()
      ctx.moveTo(px - 4, PAD_TOP - 6)
      ctx.lineTo(px + 4, PAD_TOP - 6)
      ctx.lineTo(px, PAD_TOP)
      ctx.closePath()
      ctx.fill()
    }
  }, [notes, W, H, lo, hi, selectedId, layout, playheadBeat, dark])

  useEffect(() => {
    draw()
  }, [draw])

  // E3：滚动时按视口裁剪重绘（rAF 节流）
  const drawRef = useRef(draw)
  drawRef.current = draw
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        drawRef.current()
      })
    }
    wrap.addEventListener('scroll', onScroll)
    return () => {
      wrap.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  const hitTest = useCallback(
    (px: number, py: number): { note: Note; edge: boolean } | null => {
      for (let i = notes.length - 1; i >= 0; i--) {
        const n = notes[i]
        const { x, y, w, h } = layout(n)
        if (px >= x && px <= x + w && py >= y && py <= y + h) {
          return { note: n, edge: px >= x + w - 6 }
        }
      }
      return null
    },
    [notes, layout],
  )

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      if (px < PAD_LEFT || py < PAD_TOP) {
        onSelect?.(null)
        return
      }
      const hit = hitTest(px, py)
      if (!hit) {
        onSelect?.(null)
        return
      }
      onSelect?.(hit.note)
      if (readOnly || !onNoteUpdate) return
      drag.current = {
        id: hit.note.id,
        mode: hit.edge ? 'resize' : 'move',
        startX: e.clientX,
        startY: e.clientY,
        origStart: hit.note.startBeat,
        origMidi: hit.note.midi,
        origDur: hit.note.durBeats,
      }
      const move = (ev: MouseEvent) => {
        const d = drag.current
        if (!d) return
        const dx = ev.clientX - d.startX
        const dy = ev.clientY - d.startY
        const dB = dx / PX_PER_BEAT
        const dM = Math.round(-dy / ROW_H)
        if (d.mode === 'move') {
          const newStart = Math.max(0, snapBeat(d.origStart + dB, snap))
          const newMidi = Math.max(lo, Math.min(hi, d.origMidi + dM))
          onNoteUpdate(d.id, { startBeat: newStart, midi: newMidi })
        } else {
          const newDur = Math.max(0.25, snapBeat(d.origDur + dB, snap))
          onNoteUpdate(d.id, { durBeats: newDur })
        }
      }
      const up = () => {
        drag.current = null
        window.removeEventListener('mousemove', move)
        window.removeEventListener('mouseup', up)
      }
      window.addEventListener('mousemove', move)
      window.addEventListener('mouseup', up)
    },
    [hitTest, onSelect, onNoteUpdate, readOnly, snap, lo, hi],
  )

  const onDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (readOnly || !onNoteAdd) return
      const rect = e.currentTarget.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      if (px < PAD_LEFT || py < PAD_TOP) return
      if (hitTest(px, py)) return // 双击已有音符不新增
      const beat = snapBeat((px - PAD_LEFT) / PX_PER_BEAT, snap)
      const midi = hi - Math.floor((py - PAD_TOP) / ROW_H)
      onNoteAdd({
        id: `n${Date.now()}${Math.floor(Math.random() * 1000)}`,
        midi,
        startBeat: Math.max(0, beat),
        durBeats: 1,
        velocity: 80,
      })
    },
    [hitTest, onNoteAdd, readOnly, snap, hi],
  )

  const onContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (readOnly) return
      e.preventDefault()
      const rect = e.currentTarget.getBoundingClientRect()
      const hit = hitTest(e.clientX - rect.left, e.clientY - rect.top)
      if (hit) {
        onSelect?.(hit.note)
        setContextMenu({ x: e.clientX, y: e.clientY, noteId: hit.note.id })
      } else {
        setContextMenu({ x: e.clientX, y: e.clientY, noteId: null })
      }
    },
    [hitTest, onSelect, readOnly],
  )

  // B4: 关闭右键菜单
  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [contextMenu])

  // B4: 右键菜单操作
  const handleMenuAction = (action: string) => {
    if (!contextMenu?.noteId) {
      setContextMenu(null)
      return
    }
    const noteId = contextMenu.noteId
    setContextMenu(null)
    switch (action) {
      case 'delete':
        onNoteDelete?.(noteId)
        break
      case 'split':
        onNoteSplit?.(noteId)
        break
      case 'quantize':
        onNoteQuantize?.(noteId, activeSnap)
        break
    }
  }

  // B5: 绘制力度包络画布
  const drawVelocityLane = useCallback(() => {
    const canvas = veloRef.current
    if (!canvas || !notes.length) return
    const dpr = window.devicePixelRatio || 1
    const wrapW = wrapRef.current?.clientWidth || W
    canvas.width = wrapW * dpr
    canvas.height = VELO_H * dpr
    canvas.style.width = wrapW + 'px'
    canvas.style.height = VELO_H + 'px'
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, wrapW, VELO_H)

    const bg = dark ? '#1e293b' : '#f8fafc'
    const grid = dark ? '#334155' : '#e2e8f0'
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, wrapW, VELO_H)

    // 力度参考线（25/50/75/100）
    const levels = [25, 50, 75, 100]
    ctx.font = '9px ui-monospace, monospace'
    ctx.textBaseline = 'middle'
    for (const lv of levels) {
      const y = VELO_H - (lv / 127) * VELO_H
      ctx.strokeStyle = grid
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(wrapW, y)
      ctx.stroke()
      ctx.fillStyle = dark ? '#64748b' : '#94a3b8'
      ctx.fillText(`${lv}`, 2, y - 4)
    }

    // 画每个音符的力度点
    notes.forEach((n) => {
      const x = PAD_LEFT + n.startBeat * PX_PER_BEAT
      const y = VELO_H - (n.velocity / 127) * VELO_H
      ctx.fillStyle = velocityColor(n.velocity)
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fill()
    })
  }, [notes, dark])

  // B5: 力度包络交互（拖动调整力度）
  const handleVeloMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (readOnly || !onNoteUpdate) return
      const rect = e.currentTarget.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      if (px < PAD_LEFT || py < 0 || py > VELO_H) return

      // 找最近的音符
      let closestNote: Note | null = null
      let closestDist = Infinity
      for (const n of notes) {
        const nx = PAD_LEFT + n.startBeat * PX_PER_BEAT
        const dist = Math.abs(nx - px)
        if (dist < closestDist) {
          closestDist = dist
          closestNote = n
        }
      }
      if (!closestNote || closestDist > 20) return

      const move = (ev: MouseEvent) => {
        const r = e.currentTarget.getBoundingClientRect()
        const vy = ev.clientY - r.top
        const newVel = Math.max(1, Math.min(127, Math.round((1 - vy / VELO_H) * 127)))
        onNoteUpdate(closestNote!.id, { velocity: newVel })
      }
      const up = () => {
        window.removeEventListener('mousemove', move)
        window.removeEventListener('mouseup', up)
      }
      window.addEventListener('mousemove', move)
      window.addEventListener('mouseup', up)
    },
    [notes, onNoteUpdate, readOnly],
  )

  useEffect(() => {
    drawVelocityLane()
  }, [drawVelocityLane])

  const SNAP_OPTIONS = [
    { label: '1/4', value: 1 },
    { label: '1/8', value: 0.5 },
    { label: '1/16', value: 0.25 },
    { label: '1/32', value: 0.125 },
  ]

  return (
    <div className="flex flex-col">
      {/* B3: 量化工具条 */}
      <div className="flex items-center gap-3 px-2 py-1 bg-gray-100 border-b dark:bg-gray-800 dark:border-gray-700 rounded-t">
        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <span>🧲</span>
          <span>量化</span>
        </span>
        <button
          onClick={() => { setSnapEnabled(!snapEnabled); onSnapChange?.(activeSnap) }}
          className={`w-8 h-6 text-xs rounded ${snapEnabled ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}
          title="吸附开关"
        >
          {snapEnabled ? '开' : '关'}
        </button>
        <div className="flex gap-1">
          {SNAP_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setActiveSnap(opt.value); setSnapEnabled(true); onSnapChange?.(opt.value) }}
              className={`px-2 py-0.5 text-xs rounded ${activeSnap === opt.value && snapEnabled ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 主画布区 */}
      <div ref={wrapRef} className="overflow-auto border-x border-b bg-white dark:bg-gray-900 dark:border-gray-700" style={{ maxHeight: 280 }}>
        <canvas
          ref={canvasRef}
          onMouseDown={onMouseDown}
          onDoubleClick={onDoubleClick}
          onContextMenu={onContextMenu}
          className={`block ${readOnly ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}
          title="拖动音符改音高/位置；拖右边缘改时值；双击空白加音符；右键菜单"
        />
      </div>

      {/* B5: 力度包络画布 */}
      <div className="border-x border-b rounded-b overflow-hidden" style={{ height: VELO_H }}>
        <canvas
          ref={veloRef}
          onMouseDown={handleVeloMouseDown}
          className={`block ${readOnly ? 'cursor-pointer' : 'cursor-ns-resize'}`}
          title="拖动力度点调整力度"
        />
      </div>

      {/* B4: 右键菜单 */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg shadow-xl py-1 min-w-32"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.noteId ? (
            <>
              <button
                onClick={() => handleMenuAction('split')}
                className="w-full px-3 py-1.5 text-xs text-left hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200"
              >
                ✂️ 分割
              </button>
              <button
                onClick={() => handleMenuAction('quantize')}
                className="w-full px-3 py-1.5 text-xs text-left hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200"
              >
                🧲 量化到当前步长
              </button>
              <div className="h-px bg-gray-200 dark:bg-gray-600 my-1" />
              <button
                onClick={() => handleMenuAction('delete')}
                className="w-full px-3 py-1.5 text-xs text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
              >
                🗑 删除
              </button>
            </>
          ) : (
            <div className="px-3 py-1.5 text-xs text-gray-400">无选中音符</div>
          )}
        </div>
      )}
    </div>
  )
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}
