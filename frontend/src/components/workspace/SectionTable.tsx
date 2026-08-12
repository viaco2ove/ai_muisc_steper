import { useState } from 'react'
import { useToast } from '../common/Toast'

export interface SectionItem {
  name?: string
  section?: string
  label?: string
  bars?: string
  bar?: string
  measures?: number[]
  chords?: string | string[]
  chord?: string | string[]
  [k: string]: any
}

interface SectionTableProps {
  sections: SectionItem[]
  onSectionsChange?: (sections: SectionItem[]) => void
  editable?: boolean
}

const SECTION_TYPES = ['前奏', '主歌', '预副歌', '副歌', '间奏', '桥段', '尾奏', '过渡', '独奏', '和声']
const CHORD_OPTIONS = ['C', 'Cm', 'C7', 'Cmaj7', 'Cm7', 'C9', 'Cadd9', 'C6', 'Cdim', 'Caug',
  'Db', 'Dbm', 'D', 'Dm', 'D7', 'Dmaj7', 'Dm7', 'D9', 'Dadd9', 'D6',
  'Eb', 'Ebm', 'E', 'Em', 'E7', 'Emaj7', 'Em7', 'E9',
  'F', 'Fm', 'F7', 'Fmaj7', 'Fm7', 'F9', 'Fadd9', 'F6',
  'Gb', 'Gbm', 'G', 'Gm', 'G7', 'Gmaj7', 'Gm7', 'G9', 'Gadd9',
  'Ab', 'Abm', 'A', 'Am', 'A7', 'Amaj7', 'Am7', 'A9', 'Aadd9',
  'Bb', 'Bbm', 'B', 'Bm', 'B7', 'Bmaj7', 'Bm7', 'B9',
  'N/C']

interface EditableSection {
  name: string
  bars: string
  chords: string
}

function SectionRow({
  section,
  index,
  editable,
  draggable,
  onEdit,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragOver,
}: {
  section: EditableSection
  index: number
  editable: boolean
  draggable: boolean
  onEdit: (idx: number, field: keyof EditableSection, value: string) => void
  onDelete: (idx: number) => void
  onDragStart: (e: React.DragEvent, idx: number) => void
  onDragOver: (e: React.DragEvent, idx: number) => void
  onDrop: (e: React.DragEvent, idx: number) => void
  onDragEnd: () => void
  isDragOver: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(section.name)
  const [editBars, setEditBars] = useState(section.bars)
  const [editChords, setEditChords] = useState(section.chords)

  const handleSave = () => {
    onEdit(index, 'name', editName)
    onEdit(index, 'bars', editBars)
    onEdit(index, 'chords', editChords)
    setEditing(false)
  }

  const handleCancel = () => {
    setEditName(section.name)
    setEditBars(section.bars)
    setEditChords(section.chords)
    setEditing(false)
  }

  const rowClass = `border-b last:border-0 transition-colors ${
    isDragOver ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
  }`

  return (
    <tr
      className={rowClass}
      draggable={draggable && !editing}
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
    >
      <td className="py-2 px-2">
        {editable && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="mr-1 text-blue-500 hover:text-blue-700 text-xs"
            title="编辑"
          >
            ✏️
          </button>
        )}
        {draggable && !editing && (
          <span className="text-gray-300 cursor-grab mr-1" title="拖拽排序">⋮⋮</span>
        )}
        {editing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-20 border rounded px-1 py-0.5 text-xs"
            placeholder="段落名"
            list="section-types"
          />
        ) : (
          <span className="font-medium text-sm">{section.name || '-'}</span>
        )}
        <datalist id="section-types">
          {SECTION_TYPES.map((t) => <option key={t} value={t} />)}
        </datalist>
      </td>
      <td className="py-2 px-2">
        {editing ? (
          <input
            type="text"
            value={editBars}
            onChange={(e) => setEditBars(e.target.value)}
            className="w-16 border rounded px-1 py-0.5 text-xs"
            placeholder="如 1-8"
          />
        ) : (
          <span className="text-gray-600 dark:text-gray-400 text-sm">{section.bars}</span>
        )}
      </td>
      <td className="py-2 px-2">
        {editing ? (
          <input
            type="text"
            value={editChords}
            onChange={(e) => setEditChords(e.target.value)}
            className="w-24 border rounded px-1 py-0.5 text-xs"
            placeholder="多个和弦用空格分隔"
            list="chord-options"
          />
        ) : (
          <span className="text-gray-600 dark:text-gray-400 text-sm">{section.chords}</span>
        )}
        <datalist id="chord-options">
          {CHORD_OPTIONS.map((c) => <option key={c} value={c} />)}
        </datalist>
      </td>
      {editable && (
        <td className="py-2 px-2">
          {editing ? (
            <>
              <button onClick={handleSave} className="text-green-500 hover:text-green-700 mr-1" title="保存">✓</button>
              <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600 mr-1" title="取消">✕</button>
            </>
          ) : (
            <button onClick={() => onDelete(index)} className="text-red-400 hover:text-red-600 text-xs" title="删除">🗑</button>
          )}
        </td>
      )}
    </tr>
  )
}

export default function SectionTable({ sections, onSectionsChange, editable = true }: SectionTableProps) {
  const toast = useToast()

  // 将 SectionItem 转换为 EditableSection
  const toEditableSection = (s: SectionItem): EditableSection => {
    let chordStr = ''
    const chordsVal = s.chords
    if (Array.isArray(chordsVal)) {
      chordStr = chordsVal.join(' ')
    } else if (chordsVal) {
      chordStr = String(chordsVal)
    } else if (s.chord) {
      chordStr = Array.isArray(s.chord) ? s.chord.join(' ') : String(s.chord)
    }
    return {
      name: s.name || s.section || s.label || '',
      bars: s.bars || s.bar || (s.measures ? `${s.measures[0]}-${s.measures[s.measures.length - 1]}` : ''),
      chords: chordStr,
    }
  }

  const [editableSections, setEditableSections] = useState<EditableSection[]>(() =>
    sections.map(toEditableSection)
  )
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // 同步外部变化
  if (
    sections.length !== editableSections.length ||
    sections.some((s, i) => {
      const es = editableSections[i]
      const newEs = toEditableSection(s)
      return (
        newEs.name !== es.name ||
        newEs.bars !== es.bars ||
        newEs.chords !== es.chords
      )
    })
  ) {
    // 外部数据已更新，重置内部状态
    setEditableSections(sections.map(toEditableSection))
  }

  const handleEdit = (idx: number, field: keyof EditableSection, value: string) => {
    const newSections = [...editableSections]
    newSections[idx] = { ...newSections[idx], [field]: value }
    setEditableSections(newSections)
    onSectionsChange?.(newSections.map((s) => ({ ...s, chords: s.chords.split(' ') })))
  }

  const handleDelete = (idx: number) => {
    const newSections = editableSections.filter((_, i) => i !== idx)
    setEditableSections(newSections)
    onSectionsChange?.(newSections.map((s) => ({ ...s, chords: s.chords.split(' ') })))
    toast.info('已删除段落')
  }

  const handleAdd = () => {
    const newSections = [...editableSections, { name: '', bars: '', chords: '' }]
    setEditableSections(newSections)
    onSectionsChange?.(newSections.map((s) => ({ ...s, chords: s.chords.split(' ') })))
    toast.info('已添加段落')
  }

  // 拖拽排序
  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDragIndex(idx)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(idx))
  }

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragIndex !== null && idx !== dragIndex) {
      setDragOverIndex(idx)
    }
  }

  const handleDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (dragIndex !== null && dragIndex !== idx) {
      const newSections = [...editableSections]
      const [moved] = newSections.splice(dragIndex, 1)
      newSections.splice(idx, 0, moved)
      setEditableSections(newSections)
      onSectionsChange?.(newSections.map((s) => ({ ...s, chords: s.chords.split(' ') })))
      toast.success('段落顺序已调整')
    }
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    setDragOverIndex(null)
  }

  if (!sections || sections.length === 0) {
    return (
      <div className="border rounded-lg p-4">
        <h3 className="font-medium text-gray-700 dark:text-gray-200 mb-3">段落与和弦</h3>
        {editable && (
          <button
            onClick={handleAdd}
            className="px-3 py-1.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
          >
            + 添加段落
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-700 dark:text-gray-200">段落与和弦</h3>
        {editable && (
          <button
            onClick={handleAdd}
            className="px-3 py-1.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
          >
            + 添加段落
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium text-gray-600 dark:text-gray-400">段落</th>
              <th className="text-left py-2 font-medium text-gray-600 dark:text-gray-400">小节</th>
              <th className="text-left py-2 font-medium text-gray-600 dark:text-gray-400">和弦</th>
              {editable && <th className="w-16"></th>}
            </tr>
          </thead>
          <tbody>
            {editableSections.map((sec, idx) => (
              <SectionRow
                key={idx}
                section={sec}
                index={idx}
                editable={editable}
                draggable={editable}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                isDragOver={dragOverIndex === idx}
              />
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-2">提示：拖拽行首可调整段落顺序</p>
    </div>
  )
}