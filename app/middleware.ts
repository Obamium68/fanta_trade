import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

export function middleware(request: NextRequest) {
  // Apply middleware only to protected routes
  if (request.nextUrl.pathname.startsWith('/team') || 
      request.nextUrl.pathname.startsWith('/api/protected')) {
    
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      // Redirect to login for dashboard routes
      if (request.nextUrl.pathname.startsWith('/dashboard')) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
      
      // Return 401 for API routes
      return NextResponse.json(
        { error: 'Token non trovato' },
        { status: 401 }
      );
    }

    try {
      jwt.verify(token, JWT_SECRET);
      return NextResponse.next();
    } catch (error) {
      // Redirect to login for dashboard routes
      if (request.nextUrl.pathname.startsWith('/dashboard')) {
        const response = NextResponse.redirect(new URL('/login', request.url));
        // Clear invalid token
        response.cookies.set('auth-token', '', { maxAge: 0 });
        return response;
      }
      
      // Return 401 for API routes
      return NextResponse.json(
        { error: 'Token non valido' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/protected/:path*']
};