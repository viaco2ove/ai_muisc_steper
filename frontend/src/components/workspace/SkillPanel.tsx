import { useEffect, useState } from 'react'
import { listSkills, runSkill, type SkillInfo } from '../../services/api'

interface RunResult {
  status: string
  logs?: string[]
  files?: string[]
  error?: string | null
  tool?: string
}

export default function SkillPanel() {
  const [skills, setSkills] = useState<SkillInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [openName, setOpenName] = useState<string | null>(null)
  const [args, setArgs] = useState<Record<string, string>>({})
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<RunResult | null>(null)

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
  }

  const doRun = async (s: SkillInfo) => {
    setRunning(true)
    setResult(null)
    try {
      // 把空串参数过滤掉，避免污染技能
      const clean: Record<string, any> = {}
      for (const [k, v] of Object.entries(args)) {
        if (v.trim() === '') continue
        clean[k] = v
      }
      const r = await runSkill(s.name, clean)
      setResult(r)
    } catch (e: any) {
      setResult({ status: 'error', error: String(e?.message || e) })
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

                  {result && (
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
