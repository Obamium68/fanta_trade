import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { changePasswordSchema } from '@/app/lib/validators/password';
import { getAuthUser } from '@/app/lib/auth';

const prisma = new PrismaClient();

export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const authUser = getAuthUser(request);
    
    if (!authUser) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = changePasswordSchema.parse(body);

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
    // We compare createdAt and updatedAt to see if password was ever changed
    const hasPasswordBeenChanged = team.createdAt.getTime() !== team.updatedAt.getTime();
    
    if (hasPasswordBeenChanged) {
      return NextResponse.json(
        { error: 'La password è già stata cambiata una volta. Non è possibile modificarla nuovamente.' },
        { status: 403 }
      );
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(validatedData.newPassword, 12);

    // Update password in database
    await prisma.team.update({
      where: { id: authUser.teamId },
      data: {
        passwordHash: newPasswordHash,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      message: 'Password cambiata con successo'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dati non validi', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
