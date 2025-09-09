// app/api/admin/trades/route.ts - Lista trade per admin con filtri (multi-player support)
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/app/lib/auth';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin-auth')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const decoded = verifyToken(token) as any;
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const teamId = searchParams.get('teamId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    const where: any = {};
    
    if (status) {
      where.status = status;
    }

    if (teamId) {
      where.OR = [
        { fromTeamId: parseInt(teamId) },
        { toTeamId: parseInt(teamId) }
      ];
    }

    const [trades, total] = await Promise.all([
      prisma.trade.findMany({
        where,
        include: {
          fromTeam: true,
          toTeam: true,
          tradePlayers: {
            include: {
              player: true
            }
          },
          logs: {
            orderBy: { timestamp: 'desc' },
            take: 5 // Solo gli ultimi 5 log per prestazioni
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.trade.count({ where })
    ]);

    return NextResponse.json({
      trades,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Admin get trades error:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}