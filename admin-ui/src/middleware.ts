import { NextRequest, NextFetchEvent } from 'next/server'
import { NextResponse } from 'next/server'

// Edge Runtime อาจโหลด .env ไม่ครบ → ใช้ fallback
const EXPECTED_USERNAME = process.env.ADMIN_USERNAME?.trim() || 'admin'
const EXPECTED_PASSWORD = process.env.ADMIN_PASSWORD?.trim() || 'changeme'

export function middleware(request: NextRequest, event: NextFetchEvent) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const auth = request.headers.get('authorization')
    if (!auth || !auth.startsWith('Basic ')) {
      return new NextResponse(loginPageBody('กรุณาใส่ username และ password'), {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Admin Panel"',
          'Content-Type': 'text/html; charset=utf-8'
        }
      })
    }

    let username = ''
    let password = ''
    try {
      const decoded = atob(auth.slice(6))
      const colonIndex = decoded.indexOf(':')
      username = (colonIndex >= 0 ? decoded.slice(0, colonIndex) : decoded).trim()
      password = (colonIndex >= 0 ? decoded.slice(colonIndex + 1) : '').trim()
    } catch {
      return new NextResponse(loginPageBody('รูปแบบ Authorization ไม่ถูกต้อง'), {
        status: 401,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    }

    if (username !== EXPECTED_USERNAME || password !== EXPECTED_PASSWORD) {
      return new NextResponse(loginPageBody('Username หรือ Password ไม่ถูกต้อง'), {
        status: 403,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    }
  }
  return NextResponse.next()
}

function loginPageBody(message: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Admin Login</title></head><body style="font-family:sans-serif;max-width:400px;margin:2rem auto;padding:1rem;"><h2>Admin Panel</h2><p style="color:#c00">${escapeHtml(message)}</p><p>ใช้ Basic Auth: username <strong>admin</strong> / password <strong>changeme</strong> (หรือตามที่ตั้งใน .env)</p><p><a href="/admin">ลองอีกครั้ง</a></p></body></html>`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export const config = {
  matcher: '/admin/:path*',
}