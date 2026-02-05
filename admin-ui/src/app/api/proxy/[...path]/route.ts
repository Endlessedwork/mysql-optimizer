import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
const API_SECRET = process.env.API_SECRET || '';
const TENANT_ID = process.env.TENANT_ID || process.env.NEXT_PUBLIC_TENANT_ID || '';

async function proxyRequest(request: NextRequest, path: string[]) {
  const apiPath = path.join('/');
  const url = `${API_BASE_URL}/api/${apiPath}${request.nextUrl.search}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-SECRET': API_SECRET,
    'X-Tenant-Id': TENANT_ID,
  };

  const fetchOptions: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      fetchOptions.body = await request.text();
    } catch {}
  }

  try {
    const response = await fetch(url, fetchOptions);
    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
  }
}

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(request, params.path);
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(request, params.path);
}

export async function PATCH(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(request, params.path);
}

export async function DELETE(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(request, params.path);
}
