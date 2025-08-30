// app/api/teams/change-password/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser } from '@/app/lib/auth';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authUser = getAuthUser(request);
    
    if (!authUser) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      );
    }

    // Get current team
    const team = await prisma.team.findUnique({
      where: { id: authUser.teamId }
    });

    if (!team) {
      return NextResponse.json(
        { error: 'Team non trovato' },
        { status: 404 }
      );
    }

    // Check if password has already been changed
    const hasPasswordBeenChanged = team.createdAt.getTime() !== team.updatedAt.getTime();
    
    return NextResponse.json({
      canChange: !hasPasswordBeenChanged,
      hasBeenChanged: hasPasswordBeenChanged
    });

  } catch (error) {
    console.error('Password status check error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}