import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Token non trovato' },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    const team = await prisma.team.findUnique({
      where: { id: decoded.teamId },
      include: {
        members: true
      }
    });

    if (!team) {
      return NextResponse.json(
        { error: 'Squadra non trovata' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      team: {
        id: team.id,
        name: team.name,
        girone: team.girone,
        credits: team.credits,
        members: team.members
      }
    });

  } catch (error) {
    console.error('Auth verification error:', error);
    return NextResponse.json(
      { error: 'Token non valido' },
      { status: 401 }
    );
  }
}