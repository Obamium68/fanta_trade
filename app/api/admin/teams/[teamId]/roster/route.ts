// /app/api/admin/teams/[teamId]/roster/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// GET - Ottieni rosa di una squadra specifica (per admin)
export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    // Verifica autenticazione admin
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token');

    const teamId = parseInt(params.teamId);

    if (isNaN(teamId)) {
      return NextResponse.json(
        { error: 'ID squadra non valido' },
        { status: 400 }
      );
    }

    // Ottieni la squadra con i giocatori
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: true,
        players: {
          include: {
            player: true
          },
          orderBy: [
            { player: { role: 'asc' } },
            { player: { lastname: 'asc' } }
          ]
        }
      }
    });

    if (!team) {
      return NextResponse.json(
        { error: 'Squadra non trovata' },
        { status: 404 }
      );
    }

    const players = team.players.map(tp => ({
      id: tp.player.id,
      lastname: tp.player.lastname,
      realteam: tp.player.realteam,
      value: tp.player.value,
      role: tp.player.role,
      teamsCount: tp.player.teamsCount
    }));

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
      team: {
        id: team.id,
        name: team.name,
        girone: team.girone,
        credits: team.credits,
        members: team.members
      },
      players,
      stats
    });

  } catch (error) {
    console.error('Error fetching team roster for admin:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST - Aggiungi giocatore alla rosa
export async function POST(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token');

    const teamId = parseInt(params.teamId);
    const body = await request.json();
    const { playerId } = body;

    if (isNaN(teamId) || !playerId) {
      return NextResponse.json(
        { error: 'Dati non validi' },
        { status: 400 }
      );
    }

    // Verifica che il giocatore esista
    const player = await prisma.player.findUnique({
      where: { id: playerId }
    });

    if (!player) {
      return NextResponse.json(
        { error: 'Giocatore non trovato' },
        { status: 404 }
      );
    }

    // Verifica che il giocatore non sia già nella squadra
    const existingTeamPlayer = await prisma.teamPlayer.findUnique({
      where: {
        teamId_playerId: {
          teamId: teamId,
          playerId: playerId
        }
      }
    });

    if (existingTeamPlayer) {
      return NextResponse.json(
        { error: 'Il giocatore è già nella squadra' },
        { status: 400 }
      );
    }

    // Aggiungi il giocatore alla squadra
    const newTeamPlayer = await prisma.teamPlayer.create({
      data: {
        teamId: teamId,
        playerId: playerId
      },
      include: {
        player: true
      }
    });

    // Aggiorna il contatore teamsCount del giocatore
    await prisma.player.update({
      where: { id: playerId },
      data: {
        teamsCount: {
          increment: 1
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Giocatore aggiunto con successo',
      teamPlayer: newTeamPlayer
    });

  } catch (error) {
    console.error('Error adding player to team:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE - Rimuovi giocatore dalla rosa
export async function DELETE(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token');

    

    const teamId = parseInt(params.teamId);
    const { searchParams } = new URL(request.url);
    const playerId = parseInt(searchParams.get('playerId') || '');

    if (isNaN(teamId) || isNaN(playerId)) {
      return NextResponse.json(
        { error: 'ID non validi' },
        { status: 400 }
      );
    }

    // Verifica che la relazione esista
    const teamPlayer = await prisma.teamPlayer.findUnique({
      where: {
        teamId_playerId: {
          teamId: teamId,
          playerId: playerId
        }
      }
    });

    if (!teamPlayer) {
      return NextResponse.json(
        { error: 'Il giocatore non è nella squadra' },
        { status: 404 }
      );
    }

    // Rimuovi il giocatore dalla squadra
    await prisma.teamPlayer.delete({
      where: {
        teamId_playerId: {
          teamId: teamId,
          playerId: playerId
        }
      }
    });

    // Aggiorna il contatore teamsCount del giocatore
    await prisma.player.update({
      where: { id: playerId },
      data: {
        teamsCount: {
          decrement: 1
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Giocatore rimosso con successo'
    });

  } catch (error) {
    console.error('Error removing player from team:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}