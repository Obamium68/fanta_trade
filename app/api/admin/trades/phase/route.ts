// app/api/admin/trades/phase/route.ts - Gestione fasi trade per admin
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

const tradePhaseSchema = z.object({
  status: z.enum(['OPEN', 'CLOSED']),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional()
});

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('admin-auth')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = tradePhaseSchema.parse(body);

    const tradePhase = await prisma.tradePhase.create({
      data: {
        status: validatedData.status,
        startTime: validatedData.startTime ? new Date(validatedData.startTime) : null,
        endTime: validatedData.endTime ? new Date(validatedData.endTime) : null
      }
    });

    return NextResponse.json({ tradePhase });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dati non validi', details: error.issues }, { status: 400 });
    }
    console.error('Create trade phase error:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}