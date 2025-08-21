// app/admin/manage/trades/page.tsx
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import AdminTradeManager from '@/app/components/admin/AdminTradesManager';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

export default async function AdminTradesPage() {
  try {

    // Carica tutti i trade con le relazioni complete
    const trades = await prisma.trade.findMany({
      include: {
        fromTeam: {
          include: {
            members: true
          }
        },
        toTeam: {
          include: {
            members: true
          }
        },
        playerFrom: true,
        playerTo: true,
        logs: {
          orderBy: { timestamp: 'desc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Statistiche per dashboard admin
    const stats = {
      total: trades.length,
      pending: trades.filter(t => t.status === 'PENDING').length,
      accepted: trades.filter(t => t.status === 'ACCEPTED').length,
      rejected: trades.filter(t => t.status === 'REJECTED').length,
      approved: trades.filter(t => t.status === 'APPROVED').length,
      needsApproval: trades.filter(t => t.status === 'ACCEPTED').length
    };

    // Trade fasi
    const tradePhase = await prisma.tradePhase.findFirst({
      orderBy: { id: 'desc' }
    });

    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">
                Gestione Trade - Admin Panel
              </h1>
              <div className="flex items-center space-x-4">
                <a href="/admin/manage" className="text-gray-600 hover:text-gray-900">
                  ← Torna al pannello
                </a>
                <a href="/admin/logout" className="text-red-600 hover:text-red-800">
                  Logout
                </a>
              </div>
            </div>
          </div>
        </header>

        <AdminTradeManager 
          trades={trades} 
          stats={stats} 
          tradePhase={tradePhase}
        />
      </div>
    );
  } catch (error) {
    console.error('Admin auth error:', error);
    redirect('/admin/login');
  }
}