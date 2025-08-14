import { NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient().$extends(withAccelerate());

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    
    const players = await prisma.player.findMany({
        select: {
            id: true,
            lastname: true,
            realteam: true,
            role: true,
            value: true,
            teamsCount: true,
        },
      orderBy: { role: 'asc' }
    });

    return NextResponse.json({ players });

  } catch (error: any) {
    console.error("💥 Errore nel recupero delle squadre:", error);
    return NextResponse.json(
      { error: error.message || "Errore interno del server" },
      { status: 500 }
    );
  }
}