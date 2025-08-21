import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

const createTradeSchema = z.object({
  toTeamId: z.number(),
  playerFromId: z.number(),
  playerToId: z.number(),
  credits: z.number().default(0)
});

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const body = await request.json();
    const validatedData = createTradeSchema.parse(body);

    // Verifica che il team abbia il giocatore che vuole scambiare
    const teamPlayer = await prisma.teamPlayer.findFirst({
      where: {
        teamId: decoded.teamId,
        playerId: validatedData.playerFromId
      }
    });

    if (!teamPlayer) {
      return NextResponse.json({ error: 'Giocatore non trovato nella tua rosa' }, { status: 400 });
    }

    // Verifica che l'altro team abbia il giocatore richiesto
    const targetTeamPlayer = await prisma.teamPlayer.findFirst({
      where: {
        teamId: validatedData.toTeamId,
        playerId: validatedData.playerToId
      }
    });

    if (!targetTeamPlayer) {
      return NextResponse.json({ error: 'Giocatore non trovato nella rosa del team target' }, { status: 400 });
    }

    // Verifica che i giocatori abbiano lo stesso ruolo
    const [playerFrom, playerTo] = await Promise.all([
      prisma.player.findUnique({ where: { id: validatedData.playerFromId } }),
      prisma.player.findUnique({ where: { id: validatedData.playerToId } })
    ]);

    if (!playerFrom || !playerTo) {
      return NextResponse.json({ error: 'Giocatori non trovati' }, { status: 400 });
    }

    if (playerFrom.role !== playerTo.role) {
      return NextResponse.json({ error: 'I giocatori devono avere lo stesso ruolo' }, { status: 400 });
    }

    // Per scambi globali, verifica che non sia lo stesso giocatore
    const [fromTeam, toTeam] = await Promise.all([
      prisma.team.findUnique({ where: { id: decoded.teamId } }),
      prisma.team.findUnique({ where: { id: validatedData.toTeamId } })
    ]);

    if (!fromTeam || !toTeam) {
      return NextResponse.json({ error: 'Team non trovati' }, { status: 400 });
    }

    // Se scambio globale (gironi diversi), verifica che non sia lo stesso giocatore
    if (fromTeam.girone !== toTeam.girone && playerFrom.id === playerTo.id) {
      return NextResponse.json({ error: 'Non puoi scambiare lo stesso giocatore in scambi globali' }, { status: 400 });
    }

    // Verifica crediti sufficienti se necessario
    if (validatedData.credits > 0 && fromTeam.credits < validatedData.credits) {
      return NextResponse.json({ error: 'Crediti insufficienti' }, { status: 400 });
    }

    // Crea il trade
    const trade = await prisma.trade.create({
      data: {
        fromTeamId: decoded.teamId,
        toTeamId: validatedData.toTeamId,
        playerFromId: validatedData.playerFromId,
        playerToId: validatedData.playerToId,
        credits: validatedData.credits,
        status: 'PENDING'
      },
      include: {
        fromTeam: true,
        toTeam: true,
        playerFrom: true,
        playerTo: true
      }
    });

    // Crea log iniziale
    await prisma.tradeLog.create({
      data: {
        tradeId: trade.id,
        action: `Trade proposto da ${fromTeam.name} a ${toTeam.name}: ${playerFrom.lastname} per ${playerTo.lastname}${validatedData.credits > 0 ? ` + ${validatedData.credits} crediti` : ''}`
      }
    });

    return NextResponse.json({ trade });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dati non validi', details: error.issues }, { status: 400 });
    }
    console.error('Create trade error:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
