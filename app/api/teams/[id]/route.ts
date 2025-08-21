// app/api/teams/[id]/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import bcrypt from 'bcryptjs';
import { Girone } from '@prisma/client';

const prisma = new PrismaClient().$extends(withAccelerate());

interface RouteContext {
  params: {
    id: string;
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


// GET - Recuperare un team specifico
export async function GET(req: Request, context: RouteContext) {
  try {
    const { params } = context;
    const teamId = parseInt(params.id);

    if (isNaN(teamId)) {
      return NextResponse.json(
        { error: "ID team non valido" },
        { status: 400 }
      );
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        name: true,
        girone: true,
        credits: true,
        createdAt: true,
        updatedAt: true,
        members: {
          select: {
            id: true,
            email: true,
            name: true,
          }
        },
        players: {
          select: {
            id: true,
            player: {
              select: {
                id: true,
                lastname: true,
                realteam: true,
                role: true
              }
            },
          }
        },
        _count: {
          select: {
            tradesSent: true,
            tradesReceived: true
          }
        }
      }
    });

    if (!team) {
      return NextResponse.json(
        { error: "Team non trovato" },
        { status: 404 }
      );
    }

    return NextResponse.json({ team });

  } catch (error: any) {
    console.error("💥 Errore nel recupero del team:", error);
    return NextResponse.json(
      { error: error.message || "Errore interno del server" },
      { status: 500 }
    );
  }
}

// PUT - Modificare completamente un team
export async function PUT(req: Request, context: RouteContext) {
  try {
    const { params } = context;
    const teamId = parseInt(params.id);
    const body = await req.json();
    const { name, password, girone, credits } = body;

    console.log("🔄 Modifica team ID:", teamId, "Dati:", { name, girone, credits });

    if (isNaN(teamId)) {
      return NextResponse.json(
        { error: "ID team non valido" },
        { status: 400 }
      );
    }

    // Verifica che il team esista
    const existingTeam = await prisma.team.findUnique({
      where: { id: teamId }
    });

    if (!existingTeam) {
      return NextResponse.json(
        { error: "Team non trovato" },
        { status: 404 }
      );
    }

    // Preparazione dati per l'aggiornamento
    const updateData: any = {};

    // Aggiornamento nome (se fornito)
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Nome del team non valido" },
          { status: 400 }
        );
      }

      // Verifica unicità del nome (se diverso dal corrente)
      if (name.trim() !== existingTeam.name) {
        const nameExists = await prisma.team.findUnique({
          where: { name: name.trim() }
        });

        if (nameExists) {
          return NextResponse.json(
            { error: "Nome del team già esistente" },
            { status: 409 }
          );
        }
      }

      updateData.name = name.trim();
    }

    // Aggiornamento password (se fornita)
    if (password !== undefined) {
      if (typeof password !== 'string' || password.length < 6) {
        return NextResponse.json(
          { error: "Password non valida (minimo 6 caratteri)" },
          { status: 400 }
        );
      }

      const saltRounds = 12;
      updateData.passwordHash = await bcrypt.hash(password, saltRounds);
    }

    // Aggiornamento girone (se fornito)
    if (girone !== undefined) {
      if (!Object.values(Girone).includes(girone)) {
        return NextResponse.json(
          { error: "Girone non valido" },
          { status: 400 }
        );
      }
      updateData.girone = girone;
    }

    // Aggiornamento crediti (se forniti)
    if (credits !== undefined) {
      if (typeof credits !== 'number' || credits < 0) {
        return NextResponse.json(
          { error: "Crediti non validi" },
          { status: 400 }
        );
      }
      updateData.credits = credits;
    }

    // Esecuzione aggiornamento
    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: updateData,
      select: {
        id: true,
        name: true,
        girone: true,
        credits: true,
        createdAt: true,
        updatedAt: true
      }
    });

    console.log("✅ Team aggiornato con successo:", updatedTeam);

    return NextResponse.json({
      message: "Team aggiornato con successo",
      team: updatedTeam
    });

  } catch (error: any) {
    console.error("💥 Errore nell'aggiornamento del team:", error);

    // Gestione errori specifici di Prisma
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "Nome del team già esistente" },
        { status: 409 }
      );
    }

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: "Team non trovato" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Errore interno del server" },
      { status: 500 }
    );
  }
}

// PATCH - Modificare parzialmente un team
export async function PATCH(req: Request, { params }: RouteContext) {
  // Stessa logica del PUT ma più esplicita per aggiornamenti parziali
  return PUT(req, { params });
}

// DELETE - Eliminare un team
export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const teamId = parseInt(params.id);

    console.log("🗑️ Eliminazione team ID:", teamId);

    if (isNaN(teamId)) {
      return NextResponse.json(
        { error: "ID team non valido" },
        { status: 400 }
      );
    }

    // Verifica che il team esista
    const existingTeam = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: true,
        players: true,
        tradesSent: true,
        tradesReceived: true
      }
    });

    if (!existingTeam) {
      return NextResponse.json(
        { error: "Team non trovato" },
        { status: 404 }
      );
    }

    // Verifica se ci sono relazioni che impediscono l'eliminazione
    const hasActiveRelations =
      existingTeam.members.length > 0 ||
      existingTeam.players.length > 0 ||
      existingTeam.tradesSent.length > 0 ||
      existingTeam.tradesReceived.length > 0;

    if (hasActiveRelations) {
      return NextResponse.json(
        {
          error: "Impossibile eliminare il team: ci sono membri, giocatori o scambi associati",
          details: {
            members: existingTeam.members.length,
            players: existingTeam.players.length,
            trades: existingTeam.tradesSent.length + existingTeam.tradesReceived.length
          }
        },
        { status: 409 }
      );
    }

    // Eliminazione del team
    await prisma.team.delete({
      where: { id: teamId }
    });

    console.log("✅ Team eliminato con successo");

    return NextResponse.json({
      message: "Team eliminato con successo"
    });

  } catch (error: any) {
    console.error("💥 Errore nell'eliminazione del team:", error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: "Team non trovato" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Errore interno del server" },
      { status: 500 }
    );
  }
}