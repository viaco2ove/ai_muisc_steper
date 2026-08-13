// SingerPanel.tsx - 人声轨道音色配置面板
// 参考: md/currdesign/track/singer.track.md
import { useState } from 'react'

export interface VoiceConf {
  // 基础参数
  gender: number
  expr: number
  breathiness: number
  voicing: number
  tension: number
  velocity: number

  // 动态响度/能量
  dynamics: number
  energy_balance: number

  // 共振峰/明亮度/开口度
  brightness: number
  opening: number
  nasal: number

  // 颤音
  vib_depth: number
  vib_rate: number
  vib_delay: number

  // 滑音/转音
  portamento: number
  pitch_smooth: number

  // 起音/尾音包络
  attack: number
  release: number
  breath_tail: number

  // 演唱模式
  falsetto: number
  mix_balance: number

  // 咬字
  consonant_strength: number
  soft_palate: number

  // 音高
  pitch_offset: number
  pitch_tolerance: number

  // 渲染层
  noise_soften: number
  variance_weight: number
}

export interface SingerJson {
  input_mid: string
  input_lyrics: string
  singer: string
  output_mid: string
  output_lyrics: string
  output_ustx_json: string
  output_wav: string
  voice_conf: VoiceConf
  style_preset: string
  auto_breath_insert: boolean
  breath_volume: number
}

export const DEFAULT_VOICE_CONF: VoiceConf = {
  gender: 0.0,
  expr: 1.0,
  breathiness: 0.0,
  voicing: 0.0,
  tension: 0.0,
  velocity: 1.0,
  dynamics: 1.0,
  energy_balance: 0.0,
  brightness: 0.0,
  opening: 1.0,
  nasal: 0.0,
  vib_depth: 0.2,
  vib_rate: 5.0,
  vib_delay: 0.3,
  portamento: 0.4,
  pitch_smooth: 0.6,
  attack: 0.2,
  release: 0.3,
  breath_tail: 0.5,
  falsetto: 0.0,
  mix_balance: 0.0,
  consonant_strength: 1.0,
  soft_palate: 0.0,
  pitch_offset: 0.0,
  pitch_tolerance: 0.15,
  noise_soften: 0.1,
  variance_weight: 1.0,
}

export const STYLE_PRESETS: Record<string, Partial<VoiceConf>> = {
  ballad: { dynamics: 1.0, breathiness: 0.1, vib_depth: 0.3, release: 0.4, portamento: 0.6 },
  pop: { dynamics: 1.2, breathiness: 0.0, vib_depth: 0.15, release: 0.2, portamento: 0.3 },
  rock: { dynamics: 1.5, breathiness: 0.0, tension: 0.3, attack: 0.05, release: 0.15 },
  folk: { dynamics: 0.9, breathiness: 0.2, opening: 0.9, nasal: 0.1, release: 0.5 },
  ancient: { dynamics: 0.8, breathiness: 0.3, brightness: -0.2, opening: 0.8, nasal: 0.2 },
  rap: { dynamics: 1.3, consonant_strength: 1.4, attack: 0.0, release: 0.1 },
}

interface SingerPanelProps {
  projectName: string
  trackId: string
  initial?: Partial<SingerJson>
  onSave: (data: SingerJson) => Promise<void>
}

const SLIDER_FIELDS: { key: keyof VoiceConf; label: string; min: number; max: number; step: number }[] = [
  // 基础
  { key: 'gender', label: '性别', min: -1, max: 1, step: 0.1 },
  { key: 'expr', label: '表情', min: 0, max: 2, step: 0.1 },
  { key: 'breathiness', label: '气息感', min: 0, max: 1, step: 0.05 },
  { key: 'voicing', label: '声带振动', min: 0, max: 1, step: 0.05 },
  { key: 'tension', label: '紧张度', min: 0, max: 1, step: 0.05 },
  { key: 'velocity', label: '音量', min: 0, max: 2, step: 0.1 },
  // 动态
  { key: 'dynamics', label: '动态响度', min: 0, max: 2, step: 0.1 },
  { key: 'energy_balance', label: '能量均衡', min: -1, max: 1, step: 0.1 },
  // 共振峰
  { key: 'brightness', label: '明亮度', min: -1, max: 1, step: 0.05 },
  { key: 'opening', label: '开口度', min: 0, max: 1, step: 0.05 },
  { key: 'nasal', label: '鼻音', min: -1, max: 1, step: 0.05 },
  // 颤音
  { key: 'vib_depth', label: '颤音深度', min: 0, max: 0.8, step: 0.05 },
  { key: 'vib_rate', label: '颤音频率(Hz)', min: 1, max: 10, step: 0.5 },
  { key: 'vib_delay', label: '颤音延迟(s)', min: 0, max: 1, step: 0.05 },
  // 滑音
  { key: 'portamento', label: '滑音过渡', min: 0, max: 1, step: 0.05 },
  { key: 'pitch_smooth', label: '音高平滑', min: 0, max: 1, step: 0.05 },
  // 包络
  { key: 'attack', label: '起音', min: 0, max: 1, step: 0.05 },
  { key: 'release', label: '尾音', min: 0, max: 1, step: 0.05 },
  { key: 'breath_tail', label: '尾音气声', min: 0, max: 1, step: 0.05 },
  // 演唱模式
  { key: 'falsetto', label: '假声', min: 0, max: 1, step: 0.05 },
  { key: 'mix_balance', label: '混声平衡', min: -1, max: 1, step: 0.05 },
  // 咬字
  { key: 'consonant_strength', label: '辅音清晰度', min: 0.5, max: 1.5, step: 0.05 },
  { key: 'soft_palate', label: '软腭松弛度', min: -1, max: 1, step: 0.05 },
  // 音高
  { key: 'pitch_offset', label: '音高偏移(半音)', min: -1, max: 1, step: 0.05 },
  { key: 'pitch_tolerance', label: '音高宽容度', min: 0, max: 0.5, step: 0.01 },
  // 渲染
  { key: 'noise_soften', label: '噪声柔化', min: 0, max: 1, step: 0.05 },
  { key: 'variance_weight', label: '演唱方差权重', min: 0, max: 2, step: 0.1 },
]

const GROUPS: { title: string; keys: (keyof VoiceConf)[] }[] = [
  { title: '基础音色', keys: ['gender', 'expr', 'breathiness', 'voicing', 'tension', 'velocity'] },
  { title: '动态响度', keys: ['dynamics', 'energy_balance'] },
  { title: '共振峰/明亮度', keys: ['brightness', 'opening', 'nasal'] },
  { title: '颤音（长音抖动）', keys: ['vib_depth', 'vib_rate', 'vib_delay'] },
  { title: '滑音/音高过渡', keys: ['portamento', 'pitch_smooth'] },
  { title: '起音/尾音包络', keys: ['attack', 'release', 'breath_tail'] },
  { title: '演唱模式', keys: ['falsetto', 'mix_balance'] },
  { title: '咬字', keys: ['consonant_strength', 'soft_palate'] },
  { title: '音高偏移', keys: ['pitch_offset', 'pitch_tolerance'] },
  { title: '渲染层', keys: ['noise_soften', 'variance_weight'] },
]

export default function SingerPanel({ projectName, trackId, initial, onSave }: SingerPanelProps) {
  const [singerPath, setSingerPath] = useState(initial?.singer || '')
  const [stylePreset, setStylePreset] = useState(initial?.style_preset || 'ballad')
  const [autoBreath, setAutoBreath] = useState(initial?.auto_breath_insert ?? true)
  const [breathVol, setBreathVol] = useState(initial?.breath_volume ?? 0.35)
  const [conf, setConf] = useState<VoiceConf>({ ...DEFAULT_VOICE_CONF, ...(initial?.voice_conf || {}) })
  const [saving, setSaving] = useState(false)

  // 应用风格预设
  const applyPreset = (preset: string) => {
    setStylePreset(preset)
    const ps = STYLE_PRESETS[preset]
    if (ps) {
      setConf((prev) => ({ ...prev, ...ps }))
    }
  }

  const update = (key: keyof VoiceConf, value: number) => {
    setConf((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    if (!projectName || !trackId) return
    setSaving(true)
    try {
      const projectRoot = `workspace/project/${projectName}`
      const singer: SingerJson = {
        input_mid: `${projectRoot}/song_engineer/track/${trackId}.mid`,
        input_lyrics: `${projectRoot}/song_engineer/track/${trackId.replace('主唱', 'lyrics').replace(/\d+_/, '')}.json`,
        singer: singerPath,
        output_mid: `${projectRoot}/song_engineer/track/singer/${trackId}.mid`,
        output_lyrics: `${projectRoot}/song_engineer/track/singer/${trackId}.lyrics.txt`,
        output_ustx_json: `${projectRoot}/song_engineer/track/singer/${trackId}.ustx.json`,
        output_wav: `${projectRoot}/song_engineer/track/singer/${trackId}.wav`,
        voice_conf: conf,
        style_preset: stylePreset,
        auto_breath_insert: autoBreath,
        breath_volume: breathVol,
      }
      await onSave(singer)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <h3 className="font-medium text-gray-700 dark:text-gray-200">🎤 人声轨道音色配置</h3>

      {/* 歌手声库 */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">歌手声库路径（zip）</label>
        <input
          type="text"
          value={singerPath}
          onChange={(e) => setSingerPath(e.target.value)}
          placeholder="D:\OpenUtau\Singers\...\xxx.zip"
          className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
        />
      </div>

      {/* 风格预设 */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500">风格预设:</label>
        <select
          value={stylePreset}
          onChange={(e) => applyPreset(e.target.value)}
          className="text-sm border rounded px-2 py-0.5 dark:bg-gray-700 dark:border-gray-600"
        >
          <option value="ballad">抒情 ballad</option>
          <option value="pop">流行 pop</option>
          <option value="rock">摇滚 rock</option>
          <option value="folk">民谣 folk</option>
          <option value="ancient">古风 ancient</option>
          <option value="rap">说唱 rap</option>
        </select>
        <button
          onClick={() => setConf({ ...DEFAULT_VOICE_CONF })}
          className="text-xs px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded dark:bg-gray-700"
        >
          重置
        </button>
      </div>

      {/* 参数分组 */}
      <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
        {GROUPS.map((group) => (
          <div key={group.title} className="space-y-1">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-300 border-b pb-0.5">
              {group.title}
            </div>
            {group.keys.map((key) => {
              const field = SLIDER_FIELDS.find((f) => f.key === key)!
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 dark:text-gray-300 w-24 shrink-0">
                    {field.label}
                  </span>
                  <input
                    type="range"
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    value={conf[key]}
                    onChange={(e) => update(key, parseFloat(e.target.value))}
                    className="flex-1 accent-purple-500"
                  />
                  <span className="text-xs text-gray-500 w-12 text-right tabular-nums">
                    {conf[key].toFixed(2)}
                  </span>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* 自动呼吸 */}
      <div className="border-t pt-3 space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={autoBreath}
            onChange={(e) => setAutoBreath(e.target.checked)}
          />
          <span>自动插入换气（句尾）</span>
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-24">呼吸音量</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={breathVol}
            onChange={(e) => setBreathVol(parseFloat(e.target.value))}
            className="flex-1 accent-purple-500"
          />
          <span className="text-xs text-gray-500 w-12 text-right tabular-nums">{breathVol.toFixed(2)}</span>
        </div>
      </div>

      {/* 保存按钮 */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full px-4 py-2 bg-purple-500 text-white rounded-md text-sm hover:bg-purple-600 disabled:opacity-50"
      >
        {saving ? '保存中...' : '💾 保存音色配置'}
      </button>
    </div>
  )
}