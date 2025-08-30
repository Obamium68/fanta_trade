// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { loginSchema } from '@/app/lib/validators/auth';
const prisma = new PrismaClient();


const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = loginSchema.parse(body);

    // Find team
    const team = await prisma.team.findUnique({
      where: { name: validatedData.name },
      include: {
        members: true
      }
    });

    if (!team) {
      return NextResponse.json(
        { error: 'Credenziali non valide' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(validatedData.password, team.passwordHash);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Credenziali non valide' },
        { status: 401 }
      );
    }

    // Create JWT token (3 months expiry)
    const token = jwt.sign(
      { 
        teamId: team.id, 
        teamName: team.name,
        girone: team.girone 
      },
      JWT_SECRET,
      { expiresIn: '3m' } // 3 months
    );

    // Create response with cookie
    const response = NextResponse.json({
      message: 'Login effettuato con successo',
      team: {
        id: team.id,
        name: team.name,
        girone: team.girone,
        credits: team.credits,
        members: team.members
      }
    });

    // Set HTTP-only cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 30 * 3, // 3 months in seconds
      path: '/'
    });

    return response;

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dati non validi', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}