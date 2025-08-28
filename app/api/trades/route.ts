//app/api/trades/route.ts
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
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const type = url.searchParams.get('type') || 'all'; // 'incoming', 'outgoing', 'all'

    let whereCondition: any = {
      OR: [
        { fromTeamId: decoded.teamId },
        { toTeamId: decoded.teamId }
      ]
    };

    // Filtra per stato se specificato
    if (status && ['PENDING', 'ACCEPTED', 'REJECTED', 'APPROVED'].includes(status)) {
      whereCondition.status = status;
    }

    // Filtra per tipo se specificato
    if (type === 'incoming') {
      whereCondition = {
        toTeamId: decoded.teamId,
        ...(status && { status })
      };
    } else if (type === 'outgoing') {
      whereCondition = {
        fromTeamId: decoded.teamId,
        ...(status && { status })
      };
    }

    const trades = await prisma.trade.findMany({
      where: whereCondition,
      include: {
        fromTeam: true,
        toTeam: true,
        tradePlayers: {
          include: {
            player: true
          },
          orderBy: [
            { direction: 'asc' }, // Prima FROM poi TO
            { player: { role: 'asc' } }, // Poi per ruolo
            { player: { lastname: 'asc' } } // Poi alfabeticamente
          ]
        },
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