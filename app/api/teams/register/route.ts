// app/api/teams/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { registerSchema } from '@/app/lib/validators/auth';

const prisma = new PrismaClient();


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // Check if team name already exists
    const existingTeam = await prisma.team.findUnique({
      where: { name: validatedData.name }
    });

    if (existingTeam) {
      return NextResponse.json(
        { error: 'Nome squadra già esistente' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validatedData.password, 12);

    // Create team with members
    const team = await prisma.team.create({
      data: {
        name: validatedData.name,
        passwordHash,
        girone: validatedData.girone,
        members: {
          create: validatedData.members
        }
      },
      include: {
        members: true
      }
    });

    return NextResponse.json({
      message: 'Squadra registrata con successo',
      team: {
        id: team.id,
        name: team.name,
        girone: team.girone,
        members: team.members
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dati non validi', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}