// app/api/notifications/unsubscribe/route.ts
// app/api/notifications/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const { endpoint } = await request.json();

    await prisma.pushSubscription.updateMany({
      where: {
        teamId: decoded.teamId,
        endpoint: endpoint
      },
      data: {
        isActive: false
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
