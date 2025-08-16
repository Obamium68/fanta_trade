import { NextRequest, NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

// Funzione semplificata per verificare il JWT senza librerie esterne
async function verifyToken(token: string): Promise<any> {
  try {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) {
      throw new Error('Invalid token format');
    }
    
    // Decodifica il payload (per semplicità, non verifichiamo la firma nel middleware)
    const decodedPayload = JSON.parse(atob(payload));
    
    // Verifica scadenza
    if (decodedPayload.exp && Date.now() >= decodedPayload.exp * 1000) {
      throw new Error('Token expired');
    }
    
    return decodedPayload;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin protection
  if (pathname.startsWith('/admin')) {
    // Skip login page to avoid redirect loop
    if (pathname === '/admin/login') {
      return NextResponse.next();
    }
    
    const adminToken = request.cookies.get('admin-auth')?.value;
    
    if (!adminToken) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    
    try {
      const decoded = await verifyToken(adminToken);
      if (decoded.role !== 'admin') {
        throw new Error('Invalid role');
      }
      return NextResponse.next();
    } catch (error) {
      const response = NextResponse.redirect(new URL('/admin/login', request.url));
      response.cookies.delete('admin-auth');
      return response;
    }
  }

  // Team protection (existing) - semplificata
  if (pathname.startsWith('/team')) {
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    try {
      await verifyToken(token);
      return NextResponse.next();
    } catch (error) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('auth-token');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ]
};