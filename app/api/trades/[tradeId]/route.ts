//app/api/trades/[tradeId]/route.ts
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
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const tradeId = parseInt(params.tradeId);

    const trade = await prisma.trade.findFirst({
      where: {
        id: tradeId,
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
  { params }: RouteContext
) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const tradeId = parseInt(params.tradeId);
    const body = await request.json();
    const { action } = updateTradeSchema.parse(body);

    // Trova il trade e verifica che appartenga al team corretto
    const trade = await prisma.trade.findFirst({
      where: {
        id: tradeId,
        toTeamId: decoded.teamId, // Solo il team destinatario può accettare/rifiutare
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
      // MODIFICATO: Non eseguire immediatamente lo scambio, solo cambiare stato
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
          where: { id: tradeId },
          data: { status: 'ACCEPTED' }
        });

        // Crea log dell'accettazione
        const fromPlayerNames = playersFrom.map(p => p.player.lastname).join(', ');
        const toPlayerNames = playersTo.map(p => p.player.lastname).join(', ');
        
        await tx.tradeLog.create({
          data: {
            tradeId: tradeId,
            action: `Trade accettato da ${trade.toTeam.name}. In attesa di approvazione admin per: [${fromPlayerNames}] → ${trade.toTeam.name}, [${toPlayerNames}] → ${trade.fromTeam.name}${trade.credits > 0 ? `, ${trade.credits} crediti da trasferire` : ''}`
          }
        });

        return updatedTrade;
      });

      return NextResponse.json({ 
        message: 'Trade accettato con successo. In attesa di approvazione admin.',
        trade: result
      });

    } else if (action === 'reject') {
      // Rifiuta il trade
      const updatedTrade = await prisma.$transaction(async (tx) => {
        const result = await tx.trade.update({
          where: { id: tradeId },
          data: { status: 'REJECTED' }
        });

        // Crea log del rifiuto
        await tx.tradeLog.create({
          data: {
            tradeId: tradeId,
            action: `Trade rifiutato da ${trade.toTeam.name}`
          }
        });

        return result;
      });

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
  { params }: RouteContext
) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const tradeId = parseInt(params.tradeId);

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