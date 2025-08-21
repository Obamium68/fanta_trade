// /app/api/teams/[teamId]/roster/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();


interface RouteContext {
    params: {
        teamId: string;
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

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { params } = context;
    const teamId = parseInt(params.teamId);
    // Verifica che il teamId sia valido
    if (isNaN(teamId)) {
      return NextResponse.json(
        { error: 'ID squadra non valido' },
        { status: 400 }
      );
    }

    // Verifica che la squadra esista
    const team = await prisma.team.findUnique({
      where: { id: teamId }
    });

    if (!team) {
      return NextResponse.json(
        { error: 'Squadra non trovata' },
        { status: 404 }
      );
    }

    // Ottieni tutti i giocatori della squadra con le informazioni complete
    const teamPlayers = await prisma.teamPlayer.findMany({
      where: { teamId: teamId },
      include: {
        player: true
      },
      orderBy: [
        { player: { role: 'asc' } },
        { player: { lastname: 'asc' } }
      ]
    });

    // Trasforma i dati per includere solo le informazioni del player
    const players = teamPlayers.map(tp => ({
      id: tp.player.id,
      lastname: tp.player.lastname,
      realteam: tp.player.realteam,
      value: tp.player.value,
      role: tp.player.role,
      teamsCount: tp.player.teamsCount
    }));

    // Calcola statistiche della rosa
    const stats = {
      totalPlayers: players.length,
      totalValue: players.reduce((sum, player) => sum + player.value, 0),
      byRole: {
        PORTIERE: players.filter(p => p.role === 'PORTIERE').length,
        DIFENSORE: players.filter(p => p.role === 'DIFENSORE').length,
        CENTROCAMPISTA: players.filter(p => p.role === 'CENTROCAMPISTA').length,
        ATTACCANTE: players.filter(p => p.role === 'ATTACCANTE').length
      }
    };

    return NextResponse.json({
      success: true,
      players,
      stats,
      teamInfo: {
        id: team.id,
        name: team.name,
        girone: team.girone,
        credits: team.credits
      }
    });

  } catch (error) {
    console.error('Error fetching team roster:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}