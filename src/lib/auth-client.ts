import type { UserSession } from './types'

const STORAGE_KEY = 'vor-user'

function normalizeRole(role: string): UserSession['role'] {
  const r = String(role || '').toLowerCase()
  if (r === 'admin' || r === 'administrator' || r === 'ADMIN') return 'Admin'
  if (r === 'planner' || r === 'PLANNER') return 'Planner'
  if (r === 'supervisor' || r === 'SUPERVISOR') return 'Supervisor'
  if (r === 'management' || r === 'MANAGEMENT') return 'Management'
  return 'Planner'
}

export function saveUserSession(user: UserSession) {
  try {
    const normalized = { ...user, role: normalizeRole(user.role as unknown as string) }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  } catch {
    // ignore
  }
}

export function getStoredUser(): UserSession | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (!value) return null
    const parsed = JSON.parse(value) as UserSession
    return { ...parsed, role: normalizeRole(parsed.role as unknown as string) }
  } catch {
    return null
  }
}

export function clearStoredUser() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
