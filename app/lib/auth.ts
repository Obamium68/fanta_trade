import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

export interface AuthUser {
  teamId: number;
  teamName: string;
  girone: string;
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      teamId: decoded.teamId,
      teamName: decoded.teamName,
      girone: decoded.girone
    };
  } catch (error) {
    return null;
  }
}

export function getAuthUser(request: NextRequest): AuthUser | null {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  
  return verifyToken(token);
}
