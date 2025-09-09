//app/api/trades/[tradeId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { NotificationService } from '@/app/lib/notification-service';
import { verifyToken } from '@/app/lib/auth';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

const updateTradeSchema = z.object({
  action: z.enum(['accept', 'reject'])
});

interface RouteContext {
    params: Promise<{
        tradeId: string;
    }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const decoded = verifyToken(token) as any;

    const { tradeId } = await context.params;
    const tradeIdNum = parseInt(tradeId);


    const trade = await prisma.trade.findFirst({
      where: {
        id: tradeIdNum,
        OR: [
          { fromTeamId: decoded.teamId },
          { toTeamId: decoded.teamId }
        ]
      },
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

    if (!trade) {
      return NextResponse.json({ error: 'Trade non trovato' }, { status: 404 });
    }

    return NextResponse.json({ trade });
  } catch (error) {
    console.error('Get trade error:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { tradeId } = await context.params;
    const tradeNumId = parseInt(tradeId);
    const decoded = verifyToken(token) as any;
    
    const body = await request.json();
    const { action } = updateTradeSchema.parse(body);

    const trade = await prisma.trade.findFirst({
      where: {
        id: tradeNumId,
        toTeamId: decoded.teamId,
        status: 'PENDING'
      },
      include: {
        fromTeam: true,
        toTeam: true,
        tradePlayers: {
          include: {
            player: true
          }
        }
      }
    });

    if (!trade) {
      return NextResponse.json({ 
        error: 'Trade non trovato o non hai i permessi per questa azione' 
      }, { status: 404 });
    }

    if (action === 'accept') {
      const result = await prisma.$transaction(async (tx) => {
        // Ottieni tutti i giocatori coinvolti per validazione
        const playersFrom = trade.tradePlayers.filter(tp => tp.direction === 'FROM');
        const playersTo = trade.tradePlayers.filter(tp => tp.direction === 'TO');

        // Verifica che tutti i giocatori siano ancora disponibili nelle rose attuali
        const fromTeamPlayers = await tx.teamPlayer.findMany({
          where: {
            teamId: trade.fromTeamId,
            playerId: { in: playersFrom.map(p => p.playerId) }
          }
        });

        const toTeamPlayers = await tx.teamPlayer.findMany({
          where: {
            teamId: trade.toTeamId,
            playerId: { in: playersTo.map(p => p.playerId) }
          }
        });

        if (fromTeamPlayers.length !== playersFrom.length || 
            toTeamPlayers.length !== playersTo.length) {
          throw new Error('Alcuni giocatori non sono più disponibili');
        }

        // Verifica crediti del team mittente (se ci sono crediti nel trade)
        if (trade.credits > 0) {
          const fromTeam = await tx.team.findUnique({ 
            where: { id: trade.fromTeamId } 
          });
          if (!fromTeam || fromTeam.credits < trade.credits) {
            throw new Error('Il team mittente non ha crediti sufficienti');
          }
        }

        // Aggiorna solo lo stato del trade - NON eseguire lo scambio
         const updatedTrade = await tx.trade.update({
          where: { id: tradeNumId },
          data: { status: 'ACCEPTED' }
        });

        const fromPlayerNames = playersFrom.map(p => p.player.lastname).join(', ');
        const toPlayerNames = playersTo.map(p => p.player.lastname).join(', ');
        
        await tx.tradeLog.create({
          data: {
            tradeId: tradeNumId,
            action: `Trade accettato da ${trade.toTeam.name}. In attesa di approvazione admin per: [${fromPlayerNames}] → ${trade.toTeam.name}, [${toPlayerNames}] → ${trade.fromTeam.name}${trade.credits > 0 ? `, ${trade.credits} crediti da trasferire` : ''}`
          }
        });

        return updatedTrade;
      });

      // AGGIUNTO: Notifica al team mittente dell'accettazione
      await NotificationService.notifyTradeAccepted(
        tradeNumId,
        trade.fromTeamId,
        trade.toTeam.name
      );

      return NextResponse.json({ 
        message: 'Trade accettato con successo. In attesa di approvazione admin.',
        trade: result
      });

    } else if (action === 'reject') {
      const updatedTrade = await prisma.$transaction(async (tx) => {
        const result = await tx.trade.update({
          where: { id: tradeNumId },
          data: { status: 'REJECTED' }
        });

        await tx.tradeLog.create({
          data: {
            tradeId: tradeNumId,
            action: `Trade rifiutato da ${trade.toTeam.name}`
          }
        });

        return result;
      });

      // AGGIUNTO: Notifica al team mittente del rifiuto
      await NotificationService.notifyTradeRejected(
        tradeNumId,
        trade.fromTeamId,
        trade.toTeam.name
      );

      return NextResponse.json({ 
        message: 'Trade rifiutato',
        trade: updatedTrade
      });
    }


  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Azione non valida' }, { status: 400 });
    }
    
    console.error('Update trade error:', error);
    
    if (error instanceof Error && 
        (error.message === 'Alcuni giocatori non sono più disponibili' ||
         error.message === 'Il team mittente non ha crediti sufficienti')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context : RouteContext
) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const decoded = verifyToken(token) as any;
    const tradeId = parseInt((await context.params).tradeId);

    // Solo il creatore può cancellare un trade in sospeso o accettato ma non ancora approvato
    const trade = await prisma.trade.findFirst({
      where: {
        id: tradeId,
        fromTeamId: decoded.teamId,
        status: { in: ['PENDING', 'ACCEPTED'] } // Permetti cancellazione anche se accettato ma non approvato
      }
    });

    if (!trade) {
      return NextResponse.json({ 
        error: 'Trade non trovato o non puoi cancellarlo' 
      }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Cancella i TradePlayer associati (CASCADE dovrebbe farlo automaticamente)
      await tx.tradePlayer.deleteMany({
        where: { tradeId: tradeId }
      });

      // Cancella i log associati
      await tx.tradeLog.deleteMany({
        where: { tradeId: tradeId }
      });

      // Cancella il trade
      await tx.trade.delete({
        where: { id: tradeId }
      });
    });

    return NextResponse.json({ message: 'Trade cancellato con successo' });

  } catch (error) {
    console.error('Delete trade error:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}