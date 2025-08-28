import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import TradesManager from '@/app/components/trades/TradesManager';
import { checkTradePhaseOpen } from '@/app/lib/tradeValidation';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

export default async function GlobalTradesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) {
    redirect('/login');
  }
  const tradePhase = await checkTradePhaseOpen();
  if (!tradePhase.isValid) {
    return (
      <div className="p-6 max-w-4xl mx-auto flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Scambi Chiusi</h1>
        <p className="text-gray-600">{tradePhase.error}</p>
      </div>
    )
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    const team = await prisma.team.findUnique({
      where: { id: decoded.teamId },
      include: {
        members: true
      }
    });

    if (!team) {
      redirect('/login');
    }

    return <TradesManager isGlobal={true} currentTeam={team} />;
  } catch (error) {
    console.error('Auth error:', error);
    redirect('/login');
  }
}
