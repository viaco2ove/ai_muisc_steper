import { createContext, useContext, useState, ReactNode } from 'react'

type Locale = 'zh' | 'en'

const translations: Record<Locale, Record<string, string>> = {
  zh: {
    // Common
    'app.title': 'AI音乐工程工作台',
    'common.save': '保存',
    'common.cancel': '取消',
    'common.delete': '删除',
    'common.edit': '编辑',
    'common.loading': '加载中...',
    'common.error': '错误',
    'common.success': '成功',
    // Project
    'project.select': '选择工程',
    'project.new': '新建工程',
    'project.delete': '删除工程',
    'project.rename': '重命名',
    'project.name': '工程名称',
    'project.style': '风格',
    'project.bpm': 'BPM',
    'project.key': '调性',
    // Track
    'track.add': '添加轨道',
    'track.delete': '删除轨道',
    'track.name': '轨道名称',
    'track.type': '轨道类型',
    'track.role': '轨道角色',
    // Chat
    'chat.placeholder': '输入消息... (Enter发送)',
    'chat.send': '发送',
    'chat.thinking': 'AI 思考中...',
    'chat.processing': 'AI 处理中...',
    'chat.start': '开始对话吧！',
    'chat.hint': 'AI会帮你完成音乐工程',
    // Skills
    'skills.title': '技能面板',
    'skills.run': '执行',
    'skills.running': '执行中...',
    // Tabs
    'tab.project': '工程',
    'tab.tracks': '分轨',
    'tab.files': '文件',
    'tab.skills': '技能',
    // Export
    'export.title': '导出',
    'export.audio': '音频播放',
    'export.download': '导出工程',
  },
  en: {
    // Common
    'app.title': 'AI Music Engineering Workbench',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    // Project
    'project.select': 'Select Project',
    'project.new': 'New Project',
    'project.delete': 'Delete Project',
    'project.rename': 'Rename',
    'project.name': 'Project Name',
    'project.style': 'Style',
    'project.bpm': 'BPM',
    'project.key': 'Key',
    // Track
    'track.add': 'Add Track',
    'track.delete': 'Delete Track',
    'track.name': 'Track Name',
    'track.type': 'Track Type',
    'track.role': 'Track Role',
    // Chat
    'chat.placeholder': 'Type a message... (Enter to send)',
    'chat.send': 'Send',
    'chat.thinking': 'AI thinking...',
    'chat.processing': 'AI processing...',
    'chat.start': 'Start chatting!',
    'chat.hint': 'AI will help you complete your music project',
    // Skills
    'skills.title': 'Skills Panel',
    'skills.run': 'Run',
    'skills.running': 'Running...',
    // Tabs
    'tab.project': 'Project',
    'tab.tracks': 'Tracks',
    'tab.files': 'Files',
    'tab.skills': 'Skills',
    // Export
    'export.title': 'Export',
    'export.audio': 'Audio Playback',
    'export.download': 'Export Project',
  },
}

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextType>({
  locale: 'zh',
  setLocale: () => {},
  t: (key) => key,
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('zh')

  const t = (key: string): string => {
    return translations[locale][key] || key
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}

// 语言切换按钮组件
export function LocaleSwitch() {
  const { locale, setLocale } = useI18n()
  return (
    <button
      onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition"
      title={locale === 'zh' ? 'Switch to English' : '切换到中文'}
    >
      {locale === 'zh' ? 'EN' : '中文'}
    </button>
  )
}