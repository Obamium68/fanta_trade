import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

const updateTradeSchema = z.object({
  action: z.enum(['accept', 'reject'])
});


interface RouteContext {
    params: {
        tradeId: string;
        then: <TResult1 = any, TResult2 = never>(
            onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null | undefined,
            onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined
        ) => Promise<TResult1 | TResult2>;
        catch: <TResult = never>(
            onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null | undefined
        ) => Promise<any>;
        finally: (onfinally?: (() => void) | null | undefined) => Promise<any>;
        [Symbol.toStringTag]: string;
    }
};


export async function PUT(request: NextRequest, { params }:RouteContext) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const body = await request.json();
    const validatedData = updateTradeSchema.parse(body);
    const tradeId = parseInt(params.tradeId);

    // Trova il trade
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      include: {
        fromTeam: true,
        toTeam: true,
        playerFrom: true,
        playerTo: true
      }
    });

    if (!trade) {
      return NextResponse.json({ error: 'Trade non trovato' }, { status: 404 });
    }

    // Verifica che il team sia quello di destinazione
    if (trade.toTeamId !== decoded.teamId) {
      return NextResponse.json({ error: 'Non autorizzato a modificare questo trade' }, { status: 403 });
    }

    // Verifica che il trade sia in stato PENDING
    if (trade.status !== 'PENDING') {
      return NextResponse.json({ error: 'Trade già processato' }, { status: 400 });
    }

    const newStatus = validatedData.action === 'accept' ? 'ACCEPTED' : 'REJECTED';
    
    // Aggiorna il trade
    const updatedTrade = await prisma.trade.update({
      where: { id: tradeId },
      data: { status: newStatus },
      include: {
        fromTeam: true,
        toTeam: true,
        playerFrom: true,
        playerTo: true
      }
    });

    // Crea log
    await prisma.tradeLog.create({
      data: {
        tradeId: trade.id,
        action: `Trade ${validatedData.action === 'accept' ? 'accettato' : 'rifiutato'} da ${trade.toTeam.name}`
      }
    });

    return NextResponse.json({ trade: updatedTrade });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dati non validi', details: error.issues }, { status: 400 });
    }
    console.error('Update trade error:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}