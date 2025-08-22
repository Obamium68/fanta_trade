// app/api/admin/trades/[tradeId]/route.ts - API per admin per approvare/rifiutare trade
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
};



export async function PUT(request: NextRequest, context: RouteContext) {
    try {
        const { params } = context;
        const token = request.cookies.get('admin-auth')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as any;
        console.log('Decoded token:', decoded);
        if (decoded.role !== 'admin') {
            return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
        }

        const body = await request.json();
        const validatedData = adminTradeActionSchema.parse(body);
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

        // Verifica che il trade sia in stato ACCEPTED
        if (trade.status !== 'ACCEPTED') {
            return NextResponse.json({ error: 'Trade non in stato accettato' }, { status: 400 });
        }

        if (validatedData.action === 'approve') {
            // Avvia transazione per eseguire lo scambio
            await prisma.$transaction(async (tx) => {
                // Rimuovi giocatori dalle rose attuali
                await tx.teamPlayer.delete({
                    where: {
                        teamId_playerId: {
                            teamId: trade.fromTeamId,
                            playerId: trade.playerFromId
                        }
                    }
                });

                await tx.teamPlayer.delete({
                    where: {
                        teamId_playerId: {
                            teamId: trade.toTeamId,
                            playerId: trade.playerToId
                        }
                    }
                });

                // Aggiungi giocatori alle nuove rose
                await tx.teamPlayer.create({
                    data: {
                        teamId: trade.toTeamId,
                        playerId: trade.playerFromId
                    }
                });

                await tx.teamPlayer.create({
                    data: {
                        teamId: trade.fromTeamId,
                        playerId: trade.playerToId
                    }
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

                // Aggiorna contatori giocatori
                await tx.player.update({
                    where: { id: trade.playerFromId },
                    data: { teamsCount: { increment: 0 } } // Mantieni il conteggio
                });

                await tx.player.update({
                    where: { id: trade.playerToId },
                    data: { teamsCount: { increment: 0 } } // Mantieni il conteggio
                });

                // Aggiorna stato trade
                await tx.trade.update({
                    where: { id: tradeId },
                    data: { status: 'APPROVED' }
                });

                // Crea log
                await tx.tradeLog.create({
                    data: {
                        tradeId: trade.id,
                        action: `Trade approvato dall'admin: scambio completato${validatedData.reason ? ` - Motivo: ${validatedData.reason}` : ''}`
                    }
                });
            });
        } else {
            // Rifiuta il trade
            await prisma.$transaction(async (tx) => {
                // Ripristina crediti se necessario
                if (trade.credits > 0) {
                    await tx.team.update({
                        where: { id: trade.fromTeamId },
                        data: { credits: { increment: trade.credits } }
                    });
                }

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
        }

        const updatedTrade = await prisma.trade.findUnique({
            where: { id: tradeId },
            include: {
                fromTeam: true,
                toTeam: true,
                playerFrom: true,
                playerTo: true,
                logs: {
                    orderBy: { timestamp: 'desc' }
                }
            }
        });

        return NextResponse.json({ trade: updatedTrade });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Dati non validi', details: error.issues }, { status: 400 });
        }
        console.error('Admin trade action error:', error);
        return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
    }
}