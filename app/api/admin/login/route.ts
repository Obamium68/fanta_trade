import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';
const ADMIN_PWD = process.env.ADMIN_PWD;

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!ADMIN_PWD) {
      return NextResponse.json(
        { error: 'Password admin non configurata' },
        { status: 500 }
      );
    }

    if (password !== ADMIN_PWD) {
      return NextResponse.json(
        { error: 'Password non corretta' },
        { status: 401 }
      );
    }

    // Crea il token admin
    const token = jwt.sign(
      { 
        role: 'admin',
        timestamp: Date.now()
      },
      JWT_SECRET,
      { 
        expiresIn: '24h' // Token valido per 24 ore
      }
    );

    const response = NextResponse.json(
      { message: 'Login effettuato con successo' },
      { status: 200 }
    );

    // Imposta il cookie
    response.cookies.set('admin-auth', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 ore in secondi
      path: '/'
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}