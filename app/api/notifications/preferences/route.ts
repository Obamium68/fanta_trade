// app/api/notifications/preferences/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { verifyToken } from '@/app/lib/auth';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

const preferencesSchema = z.object({
  tradeProposed: z.boolean().optional(),
  tradeAccepted: z.boolean().optional(),
  tradeRejected: z.boolean().optional(),
  tradeApproved: z.boolean().optional(),
  newTradeReceived: z.boolean().optional()
});

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const decoded = verifyToken(token) as any;

    const preferences = await prisma.notificationPreference.findUnique({
      where: { teamId: decoded.teamId }
    });

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error('Get preferences error:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const decoded = verifyToken(token) as any;
    const body = await request.json();
    const validatedData = preferencesSchema.parse(body);

    const preferences = await prisma.notificationPreference.upsert({
      where: { teamId: decoded.teamId },
      create: {
        teamId: decoded.teamId,
        ...validatedData
      },
      update: validatedData
    });

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error('Update preferences error:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}