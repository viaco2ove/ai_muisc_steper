import { useEffect, useState, useCallback } from 'react'
import { listSkills, runSkill, type SkillInfo } from '../../services/api'

// 参数元数据接口
export interface ParamSchema {
  type?: 'string' | 'number' | 'boolean' | 'array'  // 参数类型，默认 string
  description?: string  // 参数描述
  placeholder?: string  // 占位符文本
  required?: boolean    // 是否必填
  default?: any         // 默认值
  options?: string[]    // 用于 array 或 enum 类型的选项列表
  min?: number          // 用于 number 类型的最小值
  max?: number          // 用于 number 类型的最大值
  step?: number         // 用于 number 类型的步进值
  tags?: boolean        // 用于 array 类型，true 为标签输入模式，false 为多选框
}

// 统一的参数配置类型（兼容旧格式 string）
export type ParamConfig = ParamSchema | string

interface RunResult {
  status: string
  logs?: string[]
  files?: string[]
  error?: string | null
  tool?: string
}

// 类型推断辅助函数
type InferType = 'string' | 'number' | 'boolean' | 'array'

function inferParamType(key: string, config: ParamConfig): InferType {
  // 显式指定类型
  if (typeof config === 'object' && config.type) {
    return config.type
  }

  // 从 placeholder/description 推断
  const hint = typeof config === 'string' ? config : (config.description || config.placeholder || '')
  const keyLower = key.toLowerCase()

  // 从 key 名推断
  if (keyLower.includes('enable') || keyLower.includes('disabled') ||
      keyLower.includes('visible') || keyLower.includes('active') ||
      keyLower.includes('flag') || keyLower.includes('toggle') ||
      keyLower.includes('是/否') || keyLower.includes('是否')) {
    return 'boolean'
  }

  if (keyLower.includes('count') || keyLower.includes('num') ||
      keyLower.includes('size') || keyLower.includes('limit') ||
      keyLower.includes('timeout') || keyLower.includes('duration') ||
      keyLower.includes('端口') || keyLower.includes('数量') || keyLower.includes('次数')) {
    return 'number'
  }

  if (keyLower.includes('list') || keyLower.includes('tags') ||
      keyLower.includes('array') || keyLower.includes('items') ||
      keyLower.includes('列表') || keyLower.includes('标签')) {
    return 'array'
  }

  // 从值推断（placeholder/description 中包含数字）
  if (typeof config === 'string') {
    if (/^(true|false|是|否|enable|disable)$/i.test(config.trim())) {
      return 'boolean'
    }
    if (/^\d+(\.\d+)?$/.test(config.trim())) {
      return 'number'
    }
    if (config.includes(',') && !config.includes(' ')) {
      return 'array'
    }
  }

  return 'string'
}

// 解析参数配置为统一格式
function parseParamConfig(config: ParamConfig | undefined): ParamSchema {
  if (!config) return {}
  if (typeof config === 'string') return { placeholder: config }
  return config
}

// 参数值类型
type ParamValue = string | number | boolean | string[]

// 参数渲染组件 Props
interface ParamInputProps {
  keyName: string
  config: ParamConfig | undefined
  value: ParamValue | undefined
  onChange: (value: ParamValue) => void
}

// 参数标签组件（显示必填/可选标记）
function ParamLabel({ name, config }: { name: string; config: ParamSchema }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="font-mono">{name}</span>
      {config.required ? (
        <span className="text-red-500 text-[10px]" title="必填">*</span>
      ) : (
        <span className="text-gray-400 text-[10px]" title="可选">(可选)</span>
      )}
    </span>
  )
}

// 字符串输入控件
function StringInput({ config, value, onChange }: { config: ParamSchema; value: string | undefined; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={config.placeholder || '输入文本...'}
      className="border rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 w-full"
    />
  )
}

// 数字输入控件
function NumberInput({ config, value, onChange }: { config: ParamSchema; value: number | undefined; onChange: (v: number) => void }) {
  const numValue = value !== undefined ? String(value) : ''
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    if (v === '') {
      onChange(NaN as any)
      return
    }
    const n = parseFloat(v)
    if (!isNaN(n)) onChange(n)
  }

  return (
    <input
      type="number"
      value={numValue}
      onChange={handleChange}
      placeholder={config.placeholder || String(config.default ?? '')}
      min={config.min}
      max={config.max}
      step={config.step || 'any'}
      className="border rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 w-full"
    />
  )
}

// 布尔值输入控件（开关样式）
function BooleanInput({ config, value, onChange }: { config: ParamSchema; value: boolean | undefined; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div className="relative">
        <input
          type="checkbox"
          checked={value ?? config.default ?? false}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-2 peer-focus:outline-blue-500 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-500 peer-checked:bg-blue-500"></div>
      </div>
      <span className="text-xs text-gray-600 dark:text-gray-300">
        {value ? '是' : '否'}
      </span>
    </label>
  )
}

// 数组输入控件（多选框或标签输入）
function ArrayInput({ config, value, onChange }: { config: ParamSchema; value: string[] | undefined; onChange: (v: string[]) => void }) {
  const [tagInput, setTagInput] = useState('')

  // 如果有预定义选项，渲染为多选框
  if (config.options && config.options.length > 0) {
    const selected = value ?? []
    const toggleOption = (opt: string) => {
      if (selected.includes(opt)) {
        onChange(selected.filter((s) => s !== opt))
      } else {
        onChange([...selected, opt])
      }
    }
    return (
      <div className="flex flex-wrap gap-1.5">
        {config.options.map((opt) => (
          <label
            key={opt}
            className={`px-2 py-0.5 rounded text-xs cursor-pointer border transition-colors ${
              selected.includes(opt)
                ? 'bg-blue-100 border-blue-400 text-blue-700 dark:bg-blue-900 dark:border-blue-600 dark:text-blue-200'
                : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 hover:border-gray-400'
            }`}
          >
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => toggleOption(opt)}
              className="sr-only"
            />
            {opt}
          </label>
        ))}
      </div>
    )
  }

  // 否则渲染为标签输入模式
  const tags = value ?? []
  const addTag = () => {
    const tag = tagInput.trim()
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag])
    }
    setTagInput('')
  }
  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag))
  }
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag()
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5 p-1.5 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 min-h-[36px]">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs dark:bg-blue-900 dark:text-blue-200"
        >
          {tag}
          <button
            onClick={() => removeTag(tag)}
            className="hover:text-blue-900 dark:hover:text-blue-100 font-bold"
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={tagInput}
        onChange={(e) => setTagInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder={tags.length === 0 ? (config.placeholder || '输入标签后按回车添加...') : ''}
        className="flex-1 min-w-[100px] bg-transparent border-none outline-none text-sm dark:text-gray-100 placeholder:text-gray-400"
      />
    </div>
  )
}

// 统一的参数输入组件
function ParamInput({ keyName, config, value, onChange }: ParamInputProps) {
  const parsed = parseParamConfig(config)
  const paramType = inferParamType(keyName, config)

  const handleStringChange = useCallback((v: string) => onChange(v), [onChange])
  const handleNumberChange = useCallback((v: number) => onChange(v), [onChange])
  const handleBooleanChange = useCallback((v: boolean) => onChange(v), [onChange])
  const handleArrayChange = useCallback((v: string[]) => onChange(v), [onChange])

  return (
    <div className="flex flex-col gap-1">
      <ParamLabel name={keyName} config={parsed} />
      {parsed.description && (
        <span className="text-[10px] text-gray-400">{parsed.description}</span>
      )}
      {paramType === 'string' && (
        <StringInput config={parsed} value={value as string | undefined} onChange={handleStringChange} />
      )}
      {paramType === 'number' && (
        <NumberInput config={parsed} value={value as number | undefined} onChange={handleNumberChange} />
      )}
      {paramType === 'boolean' && (
        <BooleanInput config={parsed} value={value as boolean | undefined} onChange={handleBooleanChange} />
      )}
      {paramType === 'array' && (
        <ArrayInput config={parsed} value={value as string[] | undefined} onChange={handleArrayChange} />
      )}
    </div>
  )
}

export default function SkillPanel() {
  const [skills, setSkills] = useState<SkillInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [openName, setOpenName] = useState<string | null>(null)
  const [args, setArgs] = useState<Record<string, string>>({})
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<RunResult | null>(null)
  const [resultSkill, setResultSkill] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    listSkills()
      .then(setSkills)
      .catch((e) => setError(String(e?.message || e)))
      .finally(() => setLoading(false))
  }, [])

  const startRun = (s: SkillInfo) => {
    setOpenName(s.name)
    setArgs({})
    setResult(null)
    setResultSkill(null)
  }

  const doRun = async (s: SkillInfo) => {
    setRunning(true)
    setResult(null)
    setResultSkill(null)
    try {
      // 把空串参数过滤掉，避免污染技能
      const clean: Record<string, string> = {}
      for (const [k, v] of Object.entries(args)) {
        if (v.trim() === '') continue
        clean[k] = v
      }
      const r = await runSkill(s.name, clean)
      setResult(r)
      setResultSkill(s.name)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setResult({ status: 'error', error: msg })
      setResultSkill(s.name)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      {loading && <div className="text-sm text-gray-400">加载技能列表…</div>}
      {error && <div className="text-sm text-red-400">{error}</div>}
      {!loading && !error && skills.length === 0 && (
        <div className="text-sm text-gray-400">未扫描到技能（检查 .workbuddy/skills/*/SKILL.md）</div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {skills.map((s) => {
          const isOpen = openName === s.name
          const paramKeys = s.params ? Object.keys(s.params) : []
          return (
            <div
              key={s.name}
              className="border rounded-lg p-3 bg-white dark:bg-gray-800 dark:border-gray-700 flex flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-800 dark:text-gray-100">{s.name}</span>
                {s.executable ? (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-green-100 text-green-700 border border-green-300">
                    可执行
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-700 border border-amber-300">
                    纯提示词
                  </span>
                )}
              </div>
              {s.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3">{s.description}</p>
              )}
              {s.entry_script && (
                <p className="text-[10px] text-gray-400 font-mono truncate">↳ {s.entry_script}</p>
              )}

              {s.executable && (
                <button
                  onClick={() => (isOpen ? setOpenName(null) : startRun(s))}
                  className="self-start text-xs px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600"
                >
                  {isOpen ? '收起' : '运行'}
                </button>
              )}

              {isOpen && s.executable && (
                <div className="border-t pt-2 mt-1 flex flex-col gap-2">
                  {paramKeys.length > 0 ? (
                    paramKeys.map((k) => (
                      <label key={k} className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-300">
                        <span className="font-mono">{k}</span>
                        <input
                          value={args[k] || ''}
                          onChange={(e) => setArgs((a) => ({ ...a, [k]: e.target.value }))}
                          placeholder={String(s.params?.[k] ?? '')}
                          className="border rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                        />
                      </label>
                    ))
                  ) : (
                    <p className="text-[11px] text-gray-400">该技能无声明参数（将用默认配置运行）。</p>
                  )}
                  <button
                    onClick={() => doRun(s)}
                    disabled={running}
                    className="self-start text-xs px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {running ? '运行中…' : '执行'}
                  </button>

                  {result && resultSkill === s.name && (
                    <div className="text-[11px] border rounded p-2 bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={
                            result.status === 'ok' || result.status === 'success'
                              ? 'text-green-600'
                              : result.status === 'error'
                              ? 'text-red-500'
                              : 'text-gray-600'
                          }
                        >
                          状态：{result.status}
                        </span>
                      </div>
                      {result.error && <div className="text-red-500 mb-1">错误：{result.error}</div>}
                      {result.logs && result.logs.length > 0 && (
                        <pre className="text-[10px] text-gray-600 dark:text-gray-400 whitespace-pre-wrap max-h-32 overflow-auto">
                          {result.logs.join('\n')}
                        </pre>
                      )}
                      {result.files && result.files.length > 0 && (
                        <div className="text-gray-500">产物：{result.files.join('，')}</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
