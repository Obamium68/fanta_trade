import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import MainLayout from '@/app/components/layout/MainLayout';
import TradeStatusList from '@/app/components/trades/TradesStatusList';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

export default async function TradesStatusPage() {
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

    // Prendi tutti i trade del team con la struttura multi-player
    const trades = await prisma.trade.findMany({
      where: {
        OR: [
          { fromTeamId: team.id },
          { toTeamId: team.id }
        ]
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

    // Statistiche rapide con calcoli aggiornati per multi-player
    const stats = {
      total: trades.length,
      pending: trades.filter(t => t.status === 'PENDING').length,
      accepted: trades.filter(t => t.status === 'ACCEPTED').length,
      rejected: trades.filter(t => t.status === 'REJECTED').length,
      approved: trades.filter(t => t.status === 'APPROVED').length,
      incoming: trades.filter(t => t.toTeamId === team.id && t.status === 'PENDING').length
    };

    // Calcola statistiche aggiuntive per multi-player
    const multiPlayerTrades = trades.filter(t => {
      const fromPlayers = t.tradePlayers.filter(tp => tp.direction === 'FROM');
      const toPlayers = t.tradePlayers.filter(tp => tp.direction === 'TO');
      return fromPlayers.length > 1 || toPlayers.length > 1;
    });

    return (
      <MainLayout showTradeNavigation={true} currentTeam={team}>
        <div className="max-w-6xl mx-auto p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Stato Scambi
            </h1>
            <p className="text-gray-600">
              Panoramica di tutti i tuoi scambi, inclusi quelli con più giocatori
            </p>
          </div>

          {/* Statistiche principali */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <div className="bg-white p-4 rounded-lg shadow text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-500">Totali</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-gray-500">In Attesa</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow text-center">
              <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
              <div className="text-sm text-gray-500">Accettati</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow text-center">
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              <div className="text-sm text-gray-500">Rifiutati</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.approved}</div>
              <div className="text-sm text-gray-500">Completati</div>
            </div>
          </div>

          {/* Statistiche multi-player */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-4 rounded-lg shadow text-center">
              <div className="text-2xl font-bold text-purple-800">{multiPlayerTrades.length}</div>
              <div className="text-sm text-purple-600">Scambi</div>
            </div>
            <div className="bg-gradient-to-r from-blue-100 to-cyan-100 p-4 rounded-lg shadow text-center">
              <div className="text-2xl font-bold text-blue-800">
                {trades.reduce((sum, t) => sum + t.tradePlayers.length, 0)}
              </div>
              <div className="text-sm text-blue-600">Giocatori Coinvolti</div>
            </div>
            <div className="bg-gradient-to-r from-green-100 to-emerald-100 p-4 rounded-lg shadow text-center">
              <div className="text-2xl font-bold text-green-800">
                {trades.reduce((sum, t) => sum + t.credits, 0)}
              </div>
              <div className="text-sm text-green-600">Crediti Totali</div>
            </div>
          </div>

          {/* Alert per scambi in arrivo */}
          {stats.incoming > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <span className="text-blue-500 text-xl mr-2">🔔</span>
                <div>
                  <h3 className="text-blue-800 font-medium">
                    Hai {stats.incoming} scambi in attesa di risposta
                  </h3>
                  <p className="text-blue-600 text-sm">
                    <a href="/incoming" className="underline hover:no-underline">
                      Vai alla sezione "In Arrivo" per gestirli
                    </a>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Info multi-player */}
          {multiPlayerTrades.length > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <span className="text-purple-500 text-xl mr-2">⚡</span>
                <div>
                  <h3 className="text-purple-800 font-medium">
                    {multiPlayerTrades.length} trade multi-player attivi
                  </h3>
                  <p className="text-purple-600 text-sm">
                    Scambi che coinvolgono più di un giocatore per squadra
                  </p>
                </div>
              </div>
            </div>
          )}

          <TradeStatusList trades={trades} currentTeamId={team.id} />
        </div>
      </MainLayout>
    );
  } catch (error) {
    console.error('Auth error:', error);
    redirect('/login');
  }
}