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
    
    const trades = await prisma.trade.findMany({
      where: {
        OR: [
          { fromTeamId: decoded.teamId },
          { toTeamId: decoded.teamId }
        ]
      },
      include: {
        fromTeam: true,
        toTeam: true,
        playerFrom: true,
        playerTo: true,
        logs: {
          orderBy: { timestamp: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ trades });
  } catch (error) {
    console.error('Get trades error:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
