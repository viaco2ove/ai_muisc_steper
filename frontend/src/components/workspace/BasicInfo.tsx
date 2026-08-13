import { useState } from 'react'
import { updateProject } from '../../services/api'
import { useToast } from '../common/Toast'

interface BasicInfoProps {
  projectName?: string
  bpm?: string | number
  keySig?: string  // 'key' is reserved prop, use 'keySig'
  style?: string
  mood?: string
  time_signature?: string
  language?: string
}

interface EditableFieldProps {
  label: string
  value: string | number | undefined
  editValue: string
  onChange: (v: string) => void
  options?: string[]
  type?: 'text' | 'number'
  min?: number
  max?: number
  editing: boolean
  setEditing: (v: boolean) => void
  onSave: () => void
  onCancel: () => void
}

function EditableField({ label, value, editValue, onChange, options, type = 'text', min, max, editing, setEditing, onSave, onCancel }: EditableFieldProps) {
  if (!editing) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-gray-500 dark:text-gray-400">{label}: </span>
        <span className="font-medium dark:text-gray-100">{value || '-'}</span>
        <button
          onClick={() => setEditing(true)}
          className="ml-1 text-blue-500 hover:text-blue-700 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
          title="编辑"
        >
          ✏️
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-gray-500 dark:text-gray-400">{label}: </span>
      {options ? (
        <select
          value={editValue}
          onChange={(e) => onChange(e.target.value)}
          className="border rounded px-1 py-0.5 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
          autoFocus
        >
          <option value="">-</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : type === 'number' ? (
        <input
          type="number"
          value={editValue}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          className="w-20 border rounded px-1 py-0.5 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
          autoFocus
        />
      ) : (
        <input
          type="text"
          value={editValue}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 border rounded px-1 py-0.5 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
          autoFocus
        />
      )}
      <button onClick={onSave} className="text-green-500 hover:text-green-700 text-xs">✓</button>
      <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
    </div>
  )
}

const KEY_OPTIONS = ['C', 'C#/Db', 'D', 'D#/Eb', 'E', 'F', 'F#/Gb', 'G', 'G#/Ab', 'A', 'A#/Bb', 'B', 'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm']
const STYLE_OPTIONS = ['流行', '摇滚', '民谣', '电子', '爵士', '古典', 'R&B', 'Hip-Hop', 'Lo-Fi', '沙发小曲', '蓝调', '乡村', '拉丁', '新世纪', '金属', '朋克', '其他']
const TIME_SIG_OPTIONS = ['4/4', '3/4', '6/8', '2/4', '5/4', '7/8', '12/8']
const MOOD_OPTIONS = ['欢快', '忧伤', '平静', '激烈', '浪漫', '神秘', '怀旧', '力量', '梦幻', '焦虑']

export default function BasicInfo({ projectName, bpm, keySig, style, mood, time_signature, language }: BasicInfoProps) {
  const toast = useToast()
  const [editingBpm, setEditingBpm] = useState(false)
  const [editingKey, setEditingKey] = useState(false)
  const [editingStyle, setEditingStyle] = useState(false)
  const [editingMood, setEditingMood] = useState(false)
  const [editingTimeSig, setEditingTimeSig] = useState(false)
  const [editingLang, setEditingLang] = useState(false)

  const [editBpm, setEditBpm] = useState(String(bpm || ''))
  const [editKey, setEditKey] = useState(keySig || '')
  const [editStyle, setEditStyle] = useState(style || '')
  const [editMood, setEditMood] = useState(mood || '')
  const [editTimeSig, setEditTimeSig] = useState(time_signature || '4/4')
  const [editLang, setEditLang] = useState(language || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async (field: string, value: string | number) => {
    if (!projectName) return
    setSaving(true)
    try {
      const data: Record<string, string | number> = {}
      // 只更新单个字段
      switch (field) {
        case 'bpm': data.bpm = typeof value === 'string' ? parseInt(value) || 0 : value; break
        case 'key': data.key = String(value); break
        case 'style': data.style = String(value); break
        case 'mood': data.mood = String(value); break
        case 'time_signature': data.time_signature = String(value); break
        case 'language': data.language = String(value); break
      }
      await updateProject(projectName, data)
      toast.success('基本信息已更新')
      // 关闭编辑状态
      setEditingBpm(false)
      setEditingKey(false)
      setEditingStyle(false)
      setEditingMood(false)
      setEditingTimeSig(false)
      setEditingLang(false)
    } catch (e: any) {
      toast.error(`保存失败：${e?.message || e}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-medium text-gray-700 mb-3 dark:text-gray-200">基本信息</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm group">
        <EditableField
          label="调性"
          value={keySig}
          editValue={editKey}
          onChange={setEditKey}
          options={KEY_OPTIONS}
          editing={editingKey}
          setEditing={setEditingKey}
          onSave={() => handleSave("key", editKey)}
          onCancel={() => { setEditKey(keySig || ''); setEditingKey(false) }}
        />
        <EditableField
          label="BPM"
          value={bpm}
          editValue={editBpm}
          onChange={setEditBpm}
          type="number"
          min={20}
          max={300}
          editing={editingBpm}
          setEditing={setEditingBpm}
          onSave={() => handleSave('bpm', editBpm)}
          onCancel={() => { setEditBpm(String(bpm || '')); setEditingBpm(false) }}
        />
        <EditableField
          label="拍号"
          value={time_signature}
          editValue={editTimeSig}
          onChange={setEditTimeSig}
          options={TIME_SIG_OPTIONS}
          editing={editingTimeSig}
          setEditing={setEditingTimeSig}
          onSave={() => handleSave('time_signature', editTimeSig)}
          onCancel={() => { setEditTimeSig(time_signature || '4/4'); setEditingTimeSig(false) }}
        />
        <EditableField
          label="风格"
          value={style}
          editValue={editStyle}
          onChange={setEditStyle}
          options={STYLE_OPTIONS}
          editing={editingStyle}
          setEditing={setEditingStyle}
          onSave={() => handleSave('style', editStyle)}
          onCancel={() => { setEditStyle(style || ''); setEditingStyle(false) }}
        />
        <EditableField
          label="情绪"
          value={mood}
          editValue={editMood}
          onChange={setEditMood}
          options={MOOD_OPTIONS}
          editing={editingMood}
          setEditing={setEditingMood}
          onSave={() => handleSave('mood', editMood)}
          onCancel={() => { setEditMood(mood || ''); setEditingMood(false) }}
        />
        <EditableField
          label="语言"
          value={language}
          editValue={editLang}
          onChange={setEditLang}
          editing={editingLang}
          setEditing={setEditingLang}
          onSave={() => handleSave('language', editLang)}
          onCancel={() => { setEditLang(language || ''); setEditingLang(false) }}
        />
      </div>
      {saving && <div className="text-xs text-blue-500 mt-2">保存中...</div>}
    </div>
  )
}