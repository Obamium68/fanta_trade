// app/api/notifications/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string()
  })
});

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const body = await request.json();
    const { endpoint, keys } = subscribeSchema.parse(body);

    // Salva o aggiorna la subscription
    await prisma.pushSubscription.upsert({
      where: {
        teamId_endpoint: {
          teamId: decoded.teamId,
          endpoint: endpoint
        }
      },
      create: {
        teamId: decoded.teamId,
        endpoint: endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: request.headers.get('user-agent') || '',
        isActive: true
      },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        isActive: true,
        updatedAt: new Date()
      }
    });

    // Crea preferenze di default se non esistono
    await prisma.notificationPreference.upsert({
      where: { teamId: decoded.teamId },
      create: { teamId: decoded.teamId },
      update: {}
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
