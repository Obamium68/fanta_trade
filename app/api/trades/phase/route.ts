import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const tradePhase = await prisma.tradePhase.findFirst({
      orderBy: { id: 'desc' }
    });

    if (!tradePhase) {
      return NextResponse.json({ 
        isOpen: false,
        message: 'Nessuna fase di scambio configurata'
      });
    }

    const now = new Date();
    let isOpen = false;
    let message = '';

    if (tradePhase.status === 'CLOSED') {
      isOpen = false;
      message = 'Le fasi di scambio sono attualmente chiuse';
    } else if (tradePhase.status === 'OPEN') {
      if (tradePhase.startTime && tradePhase.endTime) {
        isOpen = now >= tradePhase.startTime && now <= tradePhase.endTime;
        if (!isOpen) {
          if (now < tradePhase.startTime) {
            message = `Le fasi di scambio inizieranno il ${tradePhase.startTime.toLocaleDateString('it-IT')}`;
          } else {
            message = `Le fasi di scambio sono terminate il ${tradePhase.endTime.toLocaleDateString('it-IT')}`;
          }
        } else {
          message = `Fasi di scambio aperte fino al ${tradePhase.endTime.toLocaleDateString('it-IT')}`;
        }
      } else {
        isOpen = true;
        message = 'Fasi di scambio aperte';
      }
    }

    return NextResponse.json({
      isOpen,
      message,
      phase: tradePhase
    });
  } catch (error) {
    console.error('Get trade phase error:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}