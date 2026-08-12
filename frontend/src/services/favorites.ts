// P6-2: 技能收藏服务 - localStorage 保存收藏的技能列表
import type { SkillInfo } from './api'

const STORAGE_KEY = 'ai-music-skill-favorites'

export interface FavoriteSkill {
  name: string
  description?: string
  addedAt: number  // 添加时间戳
  note?: string  // 用户备注
}

// 获取收藏列表
export function getFavorites(): FavoriteSkill[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

// 检查技能是否已收藏
export function isFavorite(name: string): boolean {
  const favorites = getFavorites()
  return favorites.some((f) => f.name === name)
}

// 添加收藏
export function addFavorite(skill: SkillInfo, note?: string): void {
  if (isFavorite(skill.name)) return  // 已收藏则跳过

  const favorites = getFavorites()
  favorites.unshift({
    name: skill.name,
    description: skill.description,
    addedAt: Date.now(),
    note,
  })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites))
}

// 移除收藏
export function removeFavorite(name: string): void {
  const favorites = getFavorites().filter((f) => f.name !== name)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites))
}

// 切换收藏状态
export function toggleFavorite(skill: SkillInfo): boolean {
  if (isFavorite(skill.name)) {
    removeFavorite(skill.name)
    return false
  } else {
    addFavorite(skill)
    return true
  }
}

// 更新收藏备注
export function updateFavoriteNote(name: string, note: string): void {
  const favorites = getFavorites()
  const index = favorites.findIndex((f) => f.name === name)
  if (index >= 0) {
    favorites[index] = { ...favorites[index], note }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites))
  }
}

// 清空所有收藏
export function clearFavorites(): void {
  localStorage.removeItem(STORAGE_KEY)
}

// 移动收藏顺序（用于排序）
export function reorderFavorites(fromIndex: number, toIndex: number): void {
  const favorites = getFavorites()
  if (fromIndex < 0 || fromIndex >= favorites.length) return
  if (toIndex < 0 || toIndex >= favorites.length) return

  const [item] = favorites.splice(fromIndex, 1)
  favorites.splice(toIndex, 0, item)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites))
}

// 获取收藏数量
export function getFavoriteCount(): number {
  return getFavorites().length
}
