import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import type { Role } from './types'

export const AUTH_COOKIE_NAME = 'vor-session'
export const SESSION_TTL_SECONDS = 60 * 60 * 8

export interface SessionPayload {
  userId: string
  username: string
  name: string
  role: Role
  branch: string
}

function getJwtSecret() {
  return process.env.JWT_SECRET || 'please-set-a-secure-jwt-secret'
}

export function createSessionToken(payload: SessionPayload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: SESSION_TTL_SECONDS })
}

export function verifySessionToken(token: string) {
  try {
    return jwt.verify(token, getJwtSecret()) as SessionPayload
  } catch (error) {
    return null
  }
}

export async function getCurrentSession() {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value
  if (!token) return null
  return verifySessionToken(token)
}

const ROLE_LABELS: Record<string, Role> = {
  ADMIN: 'Admin',
  PLANNER: 'Planner',
  SUPERVISOR: 'Supervisor',
  MANAGEMENT: 'Management',
}

export async function validateUserCredentials(username: string, password: string) {
  const user = await prisma.user.findUnique({ where: { username }, include: { branch: true } })
  if (!user) return null
  if (!user.isActive) return null
  const isValid = await bcrypt.compare(password, user.passwordHash)
  if (!isValid) return null

  return {
    userId: user.id,
    username: user.username,
    name: user.name,
    role: ROLE_LABELS[user.role] ?? 'Admin',
    branch: user.branch?.code ?? 'ALL',
  } as SessionPayload
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}
