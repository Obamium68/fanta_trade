// app/api/admin/trades/[tradeId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

const adminTradeActionSchema = z.object({
    action: z.enum(['approve', 'reject']),
    reason: z.string().optional()
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

export async function PUT(request: NextRequest, {params}: RouteContext) {
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
        const validatedData = adminTradeActionSchema.parse(body);
        const tradeId = parseInt(params.tradeId);

        // Trova il trade con la struttura multi-player
        const trade = await prisma.trade.findUnique({
            where: { id: tradeId },
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
            return NextResponse.json({ error: 'Trade non trovato' }, { status: 404 });
        }

        // Verifica che il trade sia in stato ACCEPTED
        if (trade.status !== 'ACCEPTED') {
            return NextResponse.json({ 
                error: 'Puoi approvare/rifiutare solo trade già accettati dal team destinatario' 
            }, { status: 400 });
        }

        // Ottieni i giocatori separati per direzione
        const playersFrom = trade.tradePlayers.filter(tp => tp.direction === 'FROM');
        const playersTo = trade.tradePlayers.filter(tp => tp.direction === 'TO');

        if (validatedData.action === 'approve') {
            // Esegui lo scambio multi-player con approvazione admin
            await prisma.$transaction(async (tx) => {
                // Verifica finale che tutti i giocatori siano ancora disponibili
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
                    throw new Error('Alcuni giocatori non sono più disponibili nelle rose');
                }

                // Verifica crediti se necessario
                if (trade.credits > 0) {
                    const fromTeamData = await tx.team.findUnique({ 
                        where: { id: trade.fromTeamId } 
                    });
                    if (!fromTeamData || fromTeamData.credits < trade.credits) {
                        throw new Error('Il team mittente non ha crediti sufficienti');
                    }
                }

                // Rimuovi tutti i giocatori FROM dalle rose attuali (team mittente)
                await tx.teamPlayer.deleteMany({
                    where: {
                        teamId: trade.fromTeamId,
                        playerId: { in: playersFrom.map(p => p.playerId) }
                    }
                });

                // Rimuovi tutti i giocatori TO dalle rose attuali (team destinatario)
                await tx.teamPlayer.deleteMany({
                    where: {
                        teamId: trade.toTeamId,
                        playerId: { in: playersTo.map(p => p.playerId) }
                    }
                });

                // Aggiungi i giocatori FROM al team destinatario
                await tx.teamPlayer.createMany({
                    data: playersFrom.map(tp => ({
                        teamId: trade.toTeamId,
                        playerId: tp.playerId
                    }))
                });

                // Aggiungi i giocatori TO al team mittente
                await tx.teamPlayer.createMany({
                    data: playersTo.map(tp => ({
                        teamId: trade.fromTeamId,
                        playerId: tp.playerId
                    }))
                });

                // Trasferisci crediti se presenti
                if (trade.credits > 0) {
                    await tx.team.update({
                        where: { id: trade.fromTeamId },
                        data: { credits: { decrement: trade.credits } }
                    });

                    await tx.team.update({
                        where: { id: trade.toTeamId },
                        data: { credits: { increment: trade.credits } }
                    });
                }

                // Aggiorna stato trade
                await tx.trade.update({
                    where: { id: tradeId },
                    data: { status: 'APPROVED' }
                });

                // Crea log dettagliato
                const fromPlayerNames = playersFrom.map(tp => tp.player.lastname).join(', ');
                const toPlayerNames = playersTo.map(tp => tp.player.lastname).join(', ');

                await tx.tradeLog.create({
                    data: {
                        tradeId: trade.id,
                        action: `Trade approvato e completato dall'admin: [${fromPlayerNames}] → ${trade.toTeam.name}, [${toPlayerNames}] → ${trade.fromTeam.name}${trade.credits > 0 ? `, ${trade.credits} crediti trasferiti` : ''}${validatedData.reason ? ` - Motivo: ${validatedData.reason}` : ''}`
                    }
                });
            });

            return NextResponse.json({ 
                message: 'Trade approvato e completato con successo',
                status: 'approved'
            });

        } else {
            // Rifiuta il trade
            await prisma.$transaction(async (tx) => {
                // Aggiorna stato trade
                await tx.trade.update({
                    where: { id: tradeId },
                    data: { status: 'REJECTED' }
                });

                // Crea log
                await tx.tradeLog.create({
                    data: {
                        tradeId: trade.id,
                        action: `Trade rifiutato dall'admin${validatedData.reason ? ` - Motivo: ${validatedData.reason}` : ''}`
                    }
                });
            });

            return NextResponse.json({ 
                message: 'Trade rifiutato',
                status: 'rejected'
            });
        }

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Dati non validi', details: error.issues }, { status: 400 });
        }
        
        console.error('Admin trade action error:', error);
        
        if (error instanceof Error && 
            (error.message === 'Alcuni giocatori non sono più disponibili nelle rose' ||
             error.message === 'Il team mittente non ha crediti sufficienti')) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        
        return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
    }
}

export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const token = request.cookies.get('admin-auth')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as any;
        if (decoded.role !== 'admin') {
            return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
        }

        const { params } = context;
        const tradeId = parseInt(params.tradeId);

        const trade = await prisma.trade.findUnique({
            where: { id: tradeId },
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
        console.error('Get admin trade error:', error);
        return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
    }
}