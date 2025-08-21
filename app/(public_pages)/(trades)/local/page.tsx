import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import TradesManager from '@/app/components/trades/TradesManager';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

export default async function LocalTradesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) {
    redirect('/login');
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

    return <TradesManager isGlobal={false} currentTeam={team} />;
  } catch (error) {
    console.error('Auth error:', error);
    redirect('/login');
  }
}