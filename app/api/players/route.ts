import { NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

const prisma = new PrismaClient().$extends(withAccelerate());

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Estrai i parametri di ricerca
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const limit = parseInt(searchParams.get('limit') || '1000');
    
    
    // Costruisci le condizioni WHERE dinamicamente
    const whereConditions: any = {};
    
    // Filtro per cognome (case-insensitive)
    if (search.trim()) {
      whereConditions.lastname = {
        contains: search.trim(),
        mode: 'insensitive'
      };
    }
    
    // Filtro per ruolo
    if (role && ['PORTIERE', 'DIFENSORE', 'CENTROCAMPISTA', 'ATTACCANTE'].includes(role)) {
      whereConditions.role = role;
    }
    
    console.log('📋 Condizioni WHERE:', whereConditions);
    
    const players = await prisma.player.findMany({
      where: whereConditions,
      select: {
        id: true,
        lastname: true,
        realteam: true,
        role: true,
        value: true,
        teamsCount: true,
      },
      orderBy: [
        { role: 'asc' },
        { lastname: 'asc' }
      ],
      take: limit
    });
    
    console.log(`✅ Trovati ${players.length} giocatori`);
    
    return NextResponse.json({ 
      players,
      total: players.length,
      filters: { search, role, limit }
    });
    
  } catch (error: any) {
    console.error("💥 Errore nel recupero dei giocatori:", error);
    return NextResponse.json(
      { 
        error: error.message || "Errore interno del server",
        players: []
      },
      { status: 500 }
    );
  }
}