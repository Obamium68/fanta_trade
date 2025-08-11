// app/api/teams/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import bcrypt from 'bcryptjs';
import { Girone } from '@prisma/client';

const prisma = new PrismaClient().$extends(withAccelerate());

// POST - Creare un nuovo team
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, password, girone, credits } = body;

    console.log("🏗️ Creazione nuovo team:", { name, girone, credits });

    // Validazione input
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: "Nome del team richiesto" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: "Password richiesta (minimo 6 caratteri)" },
        { status: 400 }
      );
    }

    if (!girone || !Object.values(Girone).includes(girone)) {
      return NextResponse.json(
        { error: "Girone valido richiesto" },
        { status: 400 }
      );
    }

    // Verifica che il nome del team non esista già
    const existingTeam = await prisma.team.findUnique({
      where: { name: name.trim() }
    });

    if (existingTeam) {
      return NextResponse.json(
        { error: "Nome del team già esistente" },
        { status: 409 }
      );
    }

    // Hash della password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Creazione del team
    const newTeam = await prisma.team.create({
      data: {
        name: name.trim(),
        passwordHash,
        girone,
        credits: credits || 600, // Default a 600 se non specificato
      },
      select: {
        id: true,
        name: true,
        girone: true,
        credits: true,
        createdAt: true,
        updatedAt: true,
        // Non restituire la password hash
      }
    });

    console.log("✅ Team creato con successo:", newTeam);

    return NextResponse.json({
      message: "Team creato con successo",
      team: newTeam
    }, { status: 201 });

  } catch (error: any) {
    console.error("💥 Errore nella creazione del team:", error);
    
    // Gestione errori specifici di Prisma
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "Nome del team già esistente" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Errore interno del server" },
      { status: 500 }
    );
  }
}

// GET - Recuperare tutti i team (opzionale)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const girone = searchParams.get('girone') as Girone | null;
    
    const teams = await prisma.team.findMany({
      where: girone ? { girone } : undefined,
      select: {
        id: true,
        name: true,
        girone: true,
        credits: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            members: true,
            players: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ teams });

  } catch (error: any) {
    console.error("💥 Errore nel recupero dei team:", error);
    return NextResponse.json(
      { error: error.message || "Errore interno del server" },
      { status: 500 }
    );
  }
}