// /app/api/teams/[teamId]/roster/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// CORRETTO: Next.js 15+ params sono asincroni
interface RouteContext {
    params: Promise<{
        id: string;
    }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // IMPORTANTE: await params in Next.js 15+
    const { id } = await context.params;
    const teamIdNum = parseInt(id);
    
    // Verifica che il teamId sia valido
    if (isNaN(teamIdNum)) {
      return NextResponse.json(
        { error: 'ID squadra non valido' },
        { status: 400 }
      );
    }
    
    // Verifica che la squadra esista
    const team = await prisma.team.findUnique({
      where: { id: teamIdNum }
    });
    
    if (!team) {
      return NextResponse.json(
        { error: 'Squadra non trovata' },
        { status: 404 }
      );
    }
    
    // Ottieni tutti i giocatori della squadra con le informazioni complete
    const teamPlayers = await prisma.teamPlayer.findMany({
      where: { teamId: teamIdNum },
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

// VERSIONE ALTERNATIVA SENZA RouteContext (più semplice):
/*
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  const teamIdNum = parseInt(teamId);
  // ... resto del codice
}
*/