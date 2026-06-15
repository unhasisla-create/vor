import { NextResponse } from 'next/server'
import { validateUserCredentials, createSessionToken, AUTH_COOKIE_NAME, SESSION_TTL_SECONDS } from '@/lib/auth'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Payload tidak valid.' }, { status: 400 })
  }

  const { username, password } = body as { username?: string; password?: string }
  if (!username || !password) {
    return NextResponse.json({ error: 'Username dan password diperlukan.' }, { status: 400 })
  }

  const session = await validateUserCredentials(username.trim(), password)
  if (!session) {
    return NextResponse.json({ error: 'Username atau password salah.' }, { status: 401 })
  }

  const token = createSessionToken(session)
  const response = NextResponse.json({ user: session })

  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })

  return response
}
