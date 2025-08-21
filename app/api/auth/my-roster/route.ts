// /app/api/auth/my-roster/route.ts (Versione Ottimizzata)
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Ottieni il token dai cookies
    const cookieStore = cookies();
    const token = (await cookieStore).get('auth-token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token di autenticazione mancante' },
        { status: 401 }
      );
    }

    // Verifica e decodifica il token
    let decoded;
    try {
      decoded = jwt.verify(token.value, process.env.JWT_SECRET!) as { teamId: number };
    } catch (jwtError) {
      return NextResponse.json(
        { error: 'Token non valido' },
        { status: 401 }
      );
    }

    const teamId = decoded.teamId;

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

    // Ottieni solo i playerID dalla tabella TeamPlayer
    const teamPlayers = await prisma.teamPlayer.findMany({
      where: { teamId: teamId },
      select: {
        playerId: true
      }
    });


    // Se non ci sono giocatori, restituisci rosa vuota
    if (teamPlayers.length === 0) {
      return NextResponse.json({
        success: true,
        players: [],
        stats: {
          totalPlayers: 0,
          totalValue: 0,
          byRole: {
            PORTIERE: 0,
            DIFENSORE: 0,
            CENTROCAMPISTA: 0,
            ATTACCANTE: 0
          }
        },
        teamInfo: {
          id: team.id,
          name: team.name,
          girone: team.girone,
          credits: team.credits
        }
      });
    }

    // Ottieni tutti i dettagli dei giocatori in una sola query
    const playerIds = teamPlayers.map(tp => tp.playerId);
    const players = await prisma.player.findMany({
      where: {
        id: {
          in: playerIds
        }
      },
      orderBy: [
        { role: 'asc' },
        { lastname: 'asc' }
      ]
    });

    console.log('Players found:', players.length);

    // Trasforma i dati nel formato richiesto
    const playersData = players.map(player => ({
      id: player.id,
      lastname: player.lastname,
      realteam: player.realteam,
      value: player.value,
      role: player.role,
      teamsCount: player.teamsCount
    }));

    // Calcola statistiche della rosa
    const stats = {
      totalPlayers: playersData.length,
      totalValue: playersData.reduce((sum, player) => sum + player.value, 0),
      byRole: {
        PORTIERE: playersData.filter(p => p.role === 'PORTIERE').length,
        DIFENSORE: playersData.filter(p => p.role === 'DIFENSORE').length,
        CENTROCAMPISTA: playersData.filter(p => p.role === 'CENTROCAMPISTA').length,
        ATTACCANTE: playersData.filter(p => p.role === 'ATTACCANTE').length
      }
    };

    console.log('Stats:', stats);

    return NextResponse.json({
      success: true,
      players: playersData,
      stats,
      teamInfo: {
        id: team.id,
        name: team.name,
        girone: team.girone,
        credits: team.credits
      }
    });

  } catch (error) {
    console.error('Error fetching my team roster:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}