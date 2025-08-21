import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import MainLayout from '@/app/components/layout/MainLayout';
import Link from 'next/link';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

export default async function DashboardPage() {
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
        members: true,
        players: {
          include: {
            player: true
          }
        }
      }
    });

    if (!team) {
      redirect('/login');
    }

    // Statistiche rapide sui trade
    const tradeStats = await prisma.trade.findMany({
      where: {
        OR: [
          { fromTeamId: team.id },
          { toTeamId: team.id }
        ]
      }
    });

    const pendingIncoming = tradeStats.filter(t => t.toTeamId === team.id && t.status === 'PENDING').length;
    const pendingOutgoing = tradeStats.filter(t => t.fromTeamId === team.id && t.status === 'PENDING').length;

    // Statistiche rosa
    const rosterStats = {
      total: team.players.length,
      portieri: team.players.filter(tp => tp.player.role === 'PORTIERE').length,
      difensori: team.players.filter(tp => tp.player.role === 'DIFENSORE').length,
      centrocampisti: team.players.filter(tp => tp.player.role === 'CENTROCAMPISTA').length,
      attaccanti: team.players.filter(tp => tp.player.role === 'ATTACCANTE').length,
      totalValue: team.players.reduce((sum, tp) => sum + tp.player.value, 0)
    };

    return (
      <MainLayout currentTeam={team}>
        <div className="max-w-6xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Benvenuto, {team.name}!
            </h1>
            <p className="text-gray-600">
              Girone {team.girone} • {team.members.length} membri • {team.credits} crediti disponibili
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Link href="/trades/local" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-3 mb-3">
                <span className="text-2xl">🏠</span>
                <h3 className="font-semibold text-gray-900">Scambi Locali</h3>
              </div>
              <p className="text-gray-600 text-sm">
                Scambia con squadre del girone {team.girone}
              </p>
            </Link>

            <Link href="/trades/global" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-3 mb-3">
                <span className="text-2xl">🌍</span>
                <h3 className="font-semibold text-gray-900">Scambi Globali</h3>
              </div>
              <p className="text-gray-600 text-sm">
                Scambia con squadre di tutti i gironi
              </p>
            </Link>

            <Link href="/incoming" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow relative">
              <div className="flex items-center space-x-3 mb-3">
                <span className="text-2xl">📥</span>
                <h3 className="font-semibold text-gray-900">In Arrivo</h3>
                {pendingIncoming > 0 && (
                  <span className="absolute top-2 right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
                    {pendingIncoming}
                  </span>
                )}
              </div>
              <p className="text-gray-600 text-sm">
                {pendingIncoming > 0 ? `${pendingIncoming} scambi in attesa` : 'Nessun scambio in attesa'}
              </p>
            </Link>

            <Link href="/trades-status" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-3 mb-3">
                <span className="text-2xl">📊</span>
                <h3 className="font-semibold text-gray-900">Stato Scambi</h3>
              </div>
              <p className="text-gray-600 text-sm">
                Visualizza tutti i tuoi scambi
              </p>
            </Link>
          </div>

          {/* Alerts */}
          {pendingIncoming > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <span className="text-blue-500 text-xl mr-3">🔔</span>
                <div>
                  <h3 className="text-blue-800 font-medium">
                    Hai {pendingIncoming} scambi in attesa di risposta
                  </h3>
                  <p className="text-blue-600 text-sm">
                    <Link href="/incoming" className="underline hover:no-underline">
                      Clicca qui per gestirli
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Rosa Stats */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">La Tua Rosa</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Giocatori totali:</span>
                  <span className="font-medium">{rosterStats.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Portieri:</span>
                  <span className="font-medium">{rosterStats.portieri}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Difensori:</span>
                  <span className="font-medium">{rosterStats.difensori}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Centrocampisti:</span>
                  <span className="font-medium">{rosterStats.centrocampisti}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Attaccanti:</span>
                  <span className="font-medium">{rosterStats.attaccanti}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-900 font-medium">Valore totale:</span>
                  <span className="font-bold text-green-600">{rosterStats.totalValue}</span>
                </div>
              </div>
              <div className="mt-4">
                <Link href="/team" className="text-blue-600 hover:text-blue-800 text-sm">
                  Visualizza rosa completa →
                </Link>
              </div>
            </div>

            {/* Trade Stats */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Attività Scambi</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Scambi totali:</span>
                  <span className="font-medium">{tradeStats.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">In attesa (ricevuti):</span>
                  <span className="font-medium text-blue-600">{pendingIncoming}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">In attesa (inviati):</span>
                  <span className="font-medium text-yellow-600">{pendingOutgoing}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Accettati:</span>
                  <span className="font-medium text-green-600">
                    {tradeStats.filter(t => t.status === 'ACCEPTED').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Completati:</span>
                  <span className="font-medium text-blue-600">
                    {tradeStats.filter(t => t.status === 'APPROVED').length}
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <Link href="/trades-status" className="text-blue-600 hover:text-blue-800 text-sm">
                  Visualizza dettagli →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  } catch (error) {
    console.error('Auth error:', error);
    redirect('/login');
  }
}