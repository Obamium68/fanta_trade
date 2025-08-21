import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'local' o 'global'

    const currentTeam = await prisma.team.findUnique({
      where: { id: decoded.teamId }
    });

    if (!currentTeam) {
      return NextResponse.json({ error: 'Team non trovato' }, { status: 404 });
    }

    const teams = await prisma.team.findMany({
      where: {
        id: { not: decoded.teamId },
        ...(type === 'local' ? { girone: currentTeam.girone } : {})
      },
      select: {
        id: true,
        name: true,
        girone: true,
        credits: true
      }
    });

    return NextResponse.json({ teams });
  } catch (error) {
    console.error('Get available teams error:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
