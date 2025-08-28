import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import IncomingTrades from '@/app/components/trades/IncomingTrades';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

export default async function IncomingTradesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) {
    redirect('/login');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    const team = await prisma.team.findUnique({
      where: { id: decoded.teamId }
    });

    if (!team) {
      redirect('/login');
    }

    // Prendi solo i trade in arrivo e pending
    const incomingTrades = await prisma.trade.findMany({
      where: {
        toTeamId: team.id,
        status: 'PENDING'
      },
      include: {
        fromTeam: true,
        toTeam: true,
        tradePlayers: {
            include: {
              player: true
            }
          },
        logs: {
          orderBy: { timestamp: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Scambi in Arrivo
          </h1>
          <p className="text-gray-600">
            Gestisci gli scambi proposti da altri team
          </p>
        </div>

        <IncomingTrades trades={incomingTrades} currentTeamId={team.id} />
      </div>
    );
  } catch (error) {
    console.error('Auth error:', error);
    redirect('/login');
  }
}