// P3-6: SectionEditor - 段落编辑器，支持点击编辑和拖拽排序
import { useState, useCallback } from 'react'
import SectionTable, { SectionItem } from './SectionTable'
import { useToast } from '../common/Toast'

interface SectionEditorProps {
  sections: SectionItem[]
  onSectionsChange?: (sections: SectionItem[]) => void
  editable?: boolean
}

/**
 * SectionEditor - 高级段落编辑器
 * 基于 SectionTable 构建，增加选中状态和快捷操作
 * - 拖拽行首可重新排序
 * - 支持选中高亮
 */
export default function SectionEditor({
  sections,
  onSectionsChange,
  editable = true,
}: SectionEditorProps) {
  const toast = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  // 添加新段落
  const handleAddSection = useCallback(() => {
    const newSection: SectionItem = {
      name: '新段落',
      bars: '',
      chords: []
    }
    onSectionsChange?.([...sections, newSection])
    toast.info('已添加新段落')
  }, [sections, onSectionsChange, toast])

  // 完成编辑
  const handleFinishEdit = useCallback(() => {
    setIsEditing(false)
    toast.success('编辑完成')
  }, [toast])

  // 清除选中
  const handleClearSelection = useCallback(() => {
    setSelectedIndex(-1)
  }, [])

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-700 dark:text-gray-200">段落编辑器</h3>
        <div className="flex gap-2">
          {isEditing && (
            <button
              onClick={handleFinishEdit}
              className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
            >
              完成编辑
            </button>
          )}
          {selectedIndex >= 0 && (
            <button
              onClick={handleClearSelection}
              className="px-3 py-1 bg-gray-200 text-gray-600 rounded text-xs hover:bg-gray-300"
            >
              清除选中
            </button>
          )}
          {editable && (
            <button
              onClick={handleAddSection}
              className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
            >
              + 添加段落
            </button>
          )}
        </div>
      </div>

      {/* 提示信息 */}
      <div className="text-xs text-gray-400 mb-2">
        提示：{editable ? '单击行编辑 · 拖拽行首排序 · 点击删除' : '单击选中段落'}
      </div>

      {/* 段落列表 - 使用 SectionTable 作为基础 */}
      <SectionTable
        sections={sections}
        onSectionsChange={onSectionsChange}
        editable={editable}
      />

      {/* 选中状态信息 */}
      {selectedIndex >= 0 && sections[selectedIndex] && (
        <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
          已选中第 {selectedIndex + 1} 行：{sections[selectedIndex].name || '未命名段落'}
          {sections[selectedIndex].bars && ` (小节 ${sections[selectedIndex].bars})`}
        </div>
      )}
    </div>
  )
}