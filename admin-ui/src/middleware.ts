import { NextRequest, NextFetchEvent } from 'next/server'
import { NextResponse } from 'next/server'

const EXPECTED_USERNAME = process.env.ADMIN_USERNAME?.trim()
const EXPECTED_PASSWORD = process.env.ADMIN_PASSWORD?.trim()

export function middleware(request: NextRequest, event: NextFetchEvent) {
  // Allow API proxy routes to pass without Basic Auth
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Fail-closed: if credentials not configured, deny access
    if (!EXPECTED_USERNAME || !EXPECTED_PASSWORD) {
      return new NextResponse('Server misconfiguration: admin credentials not set', {
        status: 503,
      })
    }

    const auth = request.headers.get('authorization')
    if (!auth || !auth.startsWith('Basic ')) {
      return new NextResponse(loginPageBody('Please enter username and password'), {
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
      return new NextResponse(loginPageBody('Invalid Authorization format'), {
        status: 401,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    }

    if (username !== EXPECTED_USERNAME || password !== EXPECTED_PASSWORD) {
      return new NextResponse(loginPageBody('Invalid username or password'), {
        status: 403,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    }
  }
  return NextResponse.next()
}

function loginPageBody(message: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Admin Login</title></head><body style="font-family:sans-serif;max-width:400px;margin:2rem auto;padding:1rem;"><h2>Admin Panel</h2><p style="color:#c00">${escapeHtml(message)}</p><p><a href="/admin">Try again</a></p></body></html>`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export const config = {
  matcher: ['/admin/:path*', '/api/proxy/:path*'],
}
