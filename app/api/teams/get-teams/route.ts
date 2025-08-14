// app/api/teams/get-teams/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import bcrypt from 'bcryptjs';
import { Girone } from '@prisma/client';

const prisma = new PrismaClient().$extends(withAccelerate());

// GET - Recuperare tutti i team con i loro membri
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
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          },
          orderBy: { id: 'asc' }
        },
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