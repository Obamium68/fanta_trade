import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

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


// GET - Ottieni rosa di una squadra specifica (per admin)
export async function GET(request: NextRequest, context: RouteContext) {
  const { teamId } = context.params;

  try {
    // Verifica autenticazione admin
    const cookieStore = cookies();
    const token = (await cookieStore).get("auth-token")?.value;

    const teamIdNum = parseInt(teamId);

    if (isNaN(teamIdNum)) {
      return NextResponse.json(
        { error: "ID squadra non valido" },
        { status: 400 }
      );
    }

    const team = await prisma.team.findUnique({
      where: { id: teamIdNum },
      include: {
        members: true,
        players: {
          include: { player: true },
          orderBy: [
            { player: { role: "asc" } },
            { player: { lastname: "asc" } },
          ],
        },
      },
    });

    if (!team) {
      return NextResponse.json(
        { error: "Squadra non trovata" },
        { status: 404 }
      );
    }

    const players = team.players.map((tp) => ({
      id: tp.player.id,
      lastname: tp.player.lastname,
      realteam: tp.player.realteam,
      value: tp.player.value,
      role: tp.player.role,
      teamsCount: tp.player.teamsCount,
    }));

    const stats = {
      totalPlayers: players.length,
      totalValue: players.reduce((sum, p) => sum + p.value, 0),
      byRole: {
        PORTIERE: players.filter((p) => p.role === "PORTIERE").length,
        DIFENSORE: players.filter((p) => p.role === "DIFENSORE").length,
        CENTROCAMPISTA: players.filter((p) => p.role === "CENTROCAMPISTA").length,
        ATTACCANTE: players.filter((p) => p.role === "ATTACCANTE").length,
      },
    };

    return NextResponse.json({
      success: true,
      team: {
        id: team.id,
        name: team.name,
        girone: team.girone,
        credits: team.credits,
        members: team.members,
      },
      players,
      stats,
    });
  } catch (error) {
    console.error("Error fetching team roster for admin:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST - Aggiungi giocatore alla rosa
export async function POST(request: NextRequest, context: RouteContext) {
  const { teamId } = context.params;

  try {
    const cookieStore = cookies();
    const token = (await cookieStore).get("auth-token")?.value;

    const teamIdNum = parseInt(teamId);
    const { playerId } = await request.json();

    if (isNaN(teamIdNum) || !playerId) {
      return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
    }

    const player = await prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!player) {
      return NextResponse.json(
        { error: "Giocatore non trovato" },
        { status: 404 }
      );
    }

    const existingTeamPlayer = await prisma.teamPlayer.findUnique({
      where: {
        teamId_playerId: {
          teamId: teamIdNum,
          playerId,
        },
      },
    });

    if (existingTeamPlayer) {
      return NextResponse.json(
        { error: "Il giocatore è già nella squadra" },
        { status: 400 }
      );
    }

    const newTeamPlayer = await prisma.teamPlayer.create({
      data: {
        teamId: teamIdNum,
        playerId,
      },
      include: {
        player: true,
      },
    });

    await prisma.player.update({
      where: { id: playerId },
      data: {
        teamsCount: { increment: 1 },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Giocatore aggiunto con successo",
      teamPlayer: newTeamPlayer,
    });
  } catch (error) {
    console.error("Error adding player to team:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE - Rimuovi giocatore dalla rosa
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { teamId } = context.params;

  try {
    const cookieStore = cookies();
    const token = (await cookieStore).get("auth-token")?.value;

    const teamIdNum = parseInt(teamId);
    const { searchParams } = new URL(request.url);
    const playerId = parseInt(searchParams.get("playerId") || "");

    if (isNaN(teamIdNum) || isNaN(playerId)) {
      return NextResponse.json({ error: "ID non validi" }, { status: 400 });
    }

    const teamPlayer = await prisma.teamPlayer.findUnique({
      where: {
        teamId_playerId: {
          teamId: teamIdNum,
          playerId,
        },
      },
    });

    if (!teamPlayer) {
      return NextResponse.json(
        { error: "Il giocatore non è nella squadra" },
        { status: 404 }
      );
    }

    await prisma.teamPlayer.delete({
      where: {
        teamId_playerId: {
          teamId: teamIdNum,
          playerId,
        },
      },
    });

    await prisma.player.update({
      where: { id: playerId },
      data: {
        teamsCount: { decrement: 1 },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Giocatore rimosso con successo",
    });
  } catch (error) {
    console.error("Error removing player from team:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
