//app/api/trades/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { NotificationService } from '@/app/lib/notification-service';
import { verifyToken } from '@/app/lib/auth';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';


const createTradeSchema = z.object({
  toTeamId: z.number().positive(),
  playersFrom: z.array(z.number().positive()).min(1).max(5),
  playersTo: z.array(z.number().positive()).min(1).max(5),
  credits: z.number().min(0).default(0)
}).refine((data) => {
  return data.playersFrom.length === data.playersTo.length;
}, {
  message: 'Il numero di giocatori ceduti deve essere uguale a quello ricevuto'
});

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const decoded = verifyToken(token) as any;
    const body = await request.json();
    const validatedData = createTradeSchema.parse(body);

    // Verifica che non ci siano duplicati
    const uniqueFromPlayers = [...new Set(validatedData.playersFrom)];
    const uniqueToPlayers = [...new Set(validatedData.playersTo)];
    
    if (uniqueFromPlayers.length !== validatedData.playersFrom.length) {
      return NextResponse.json({ error: 'Non puoi selezionare lo stesso giocatore più volte' }, { status: 400 });
    }
    
    if (uniqueToPlayers.length !== validatedData.playersTo.length) {
      return NextResponse.json({ error: 'Non puoi selezionare lo stesso giocatore più volte' }, { status: 400 });
    }

    // Verifica che il team abbia tutti i giocatori che vuole scambiare
    const teamPlayers = await prisma.teamPlayer.findMany({
      where: {
        teamId: decoded.teamId,
        playerId: { in: validatedData.playersFrom }
      },
      include: {
        player: true
      }
    });

    if (teamPlayers.length !== validatedData.playersFrom.length) {
      return NextResponse.json({ error: 'Alcuni giocatori non sono nella tua rosa' }, { status: 400 });
    }

    // Verifica che l'altro team abbia tutti i giocatori richiesti
    const targetTeamPlayers = await prisma.teamPlayer.findMany({
      where: {
        teamId: validatedData.toTeamId,
        playerId: { in: validatedData.playersTo }
      },
      include: {
        player: true
      }
    });

    if (targetTeamPlayers.length !== validatedData.playersTo.length) {
      return NextResponse.json({ error: 'Alcuni giocatori non sono nella rosa del team target' }, { status: 400 });
    }

    // Verifica bilanciamento per ruolo
    const fromRoles = teamPlayers.reduce((acc, tp) => {
      acc[tp.player.role] = (acc[tp.player.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const toRoles = targetTeamPlayers.reduce((acc, tp) => {
      acc[tp.player.role] = (acc[tp.player.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Verifica che per ogni ruolo il numero sia bilanciato
    const allRoles = new Set([...Object.keys(fromRoles), ...Object.keys(toRoles)]);
    
    for (const role of allRoles) {
      if ((fromRoles[role] || 0) !== (toRoles[role] || 0)) {
        return NextResponse.json({ 
          error: `Il numero di giocatori per ruolo deve essere bilanciato. Ruolo sbilanciato: ${role}` 
        }, { status: 400 });
      }
    }

    // Ottieni informazioni sui team
    const [fromTeam, toTeam] = await Promise.all([
      prisma.team.findUnique({ where: { id: decoded.teamId } }),
      prisma.team.findUnique({ where: { id: validatedData.toTeamId } })
    ]);

    if (!fromTeam || !toTeam) {
      return NextResponse.json({ error: 'Team non trovati' }, { status: 400 });
    }

    // Per scambi globali, verifica che non siano gli stessi giocatori
    if (fromTeam.girone !== toTeam.girone) {
      const commonPlayers = validatedData.playersFrom.filter(id => 
        validatedData.playersTo.includes(id)
      );
      if (commonPlayers.length > 0) {
        return NextResponse.json({ 
          error: 'Non puoi scambiare gli stessi giocatori in scambi globali' 
        }, { status: 400 });
      }
    }

    // Verifica crediti sufficienti
    if (validatedData.credits > 0 && fromTeam.credits < validatedData.credits) {
      return NextResponse.json({ error: 'Crediti insufficienti' }, { status: 400 });
    }

    // Crea il trade con transazione
    const result = await prisma.$transaction(async (tx) => {
      // Crea il trade principale
      const trade = await tx.trade.create({
        data: {
          fromTeamId: decoded.teamId,
          toTeamId: validatedData.toTeamId,
          credits: validatedData.credits,
          status: 'PENDING'
        }
      });

      // Crea i record TradePlayer per i giocatori ceduti
      const fromTradesPlayers = await tx.tradePlayer.createMany({
        data: validatedData.playersFrom.map(playerId => ({
          tradeId: trade.id,
          playerId,
          direction: 'FROM' as const
        }))
      });

      // Crea i record TradePlayer per i giocatori ricevuti
      const toTradesPlayers = await tx.tradePlayer.createMany({
        data: validatedData.playersTo.map(playerId => ({
          tradeId: trade.id,
          playerId,
          direction: 'TO' as const
        }))
      });

      // Crea log iniziale
      const fromPlayerNames = teamPlayers.map(tp => tp.player.lastname).join(', ');
      const toPlayerNames = targetTeamPlayers.map(tp => tp.player.lastname).join(', ');
      
      await tx.tradeLog.create({
        data: {
          tradeId: trade.id,
          action: `Trade proposto da ${fromTeam.name} a ${toTeam.name}: [${fromPlayerNames}] per [${toPlayerNames}]${validatedData.credits > 0 ? ` + ${validatedData.credits} crediti` : ''}`
        }
      });

      return trade;
    });

    // Ricarica il trade con tutte le relazioni per la risposta
       const fullTrade = await prisma.trade.findUnique({
      where: { id: result.id },
      include: {
        fromTeam: true,
        toTeam: true,
        tradePlayers: {
          include: {
            player: true
          }
        },
        logs: {
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    // AGGIUNTO: Invia notifica al team destinatario
    await NotificationService.notifyTradeProposed(
      result.id,
      fromTeam.name,
      validatedData.toTeamId
    );

    return NextResponse.json({ trade: fullTrade });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dati non validi', details: error.issues }, { status: 400 });
    }
    console.error('Create trade error:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}