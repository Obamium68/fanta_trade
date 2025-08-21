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
    const teamId = searchParams.get('teamId');
    const role = searchParams.get('role');

    if (!teamId) {
      return NextResponse.json({ error: 'teamId richiesto' }, { status: 400 });
    }

    const players = await prisma.teamPlayer.findMany({
      where: {
        teamId: parseInt(teamId),
        ...(role ? { player: { role: role as any } } : {})
      },
      include: {
        player: true
      }
    });

    return NextResponse.json({ 
      players: players.map(tp => tp.player) 
    });
  } catch (error) {
    console.error('Get available players error:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}