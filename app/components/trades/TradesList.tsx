'use client';

import { Trade, Team, Player, TradeStatus } from '@prisma/client';

interface TradeWithRelations extends Trade {
  fromTeam: Team;
  toTeam: Team;
  playerFrom: Player;
  playerTo: Player;
}

interface TradesListProps {
  trades: TradeWithRelations[];
  currentTeamId: number;
  onTradeAction: (tradeId: number, action: 'accept' | 'reject') => void;
  loading: boolean;
}

export default function TradesList({ trades, currentTeamId, onTradeAction, loading }: TradesListProps) {
  const getStatusBadge = (status: TradeStatus) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      ACCEPTED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      APPROVED: 'bg-blue-100 text-blue-800'
    };

    const labels = {
      PENDING: 'In Attesa',
      ACCEPTED: 'Accettato',
      REJECTED: 'Rifiutato',
      APPROVED: 'Approvato'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const isIncoming = (trade: TradeWithRelations) => trade.toTeamId === currentTeamId;
  const canRespond = (trade: TradeWithRelations) => 
    isIncoming(trade) && trade.status === 'PENDING';

  if (trades.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">Nessun scambio trovato</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {trades.map((trade) => (
        <div key={trade.id} className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h4 className="text-lg font-semibold">
                {isIncoming(trade) ? 'Ricevuto da' : 'Inviato a'}: {' '}
                {isIncoming(trade) ? trade.fromTeam.name : trade.toTeam.name}
              </h4>
              <p className="text-sm text-gray-500">
                {new Date(trade.createdAt).toLocaleDateString('it-IT', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            {getStatusBadge(trade.status)}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* Giocatore From */}
            <div className="text-center">
              <h5 className="font-medium text-gray-900">{trade.playerFrom.lastname}</h5>
              <p className="text-sm text-gray-500">{trade.playerFrom.realteam}</p>
              <p className="text-sm text-gray-500">Valore: {trade.playerFrom.value}</p>
              <p className="text-xs text-gray-400">{trade.fromTeam.name} ({trade.fromTeam.girone})</p>
            </div>

            {/* Freccia e crediti */}
            <div className="text-center">
              <div className="text-2xl">↔️</div>
              {trade.credits > 0 && (
                <p className="text-sm text-blue-600 font-medium">
                  + {trade.credits} crediti
                </p>
              )}
            </div>

            {/* Giocatore To */}
            <div className="text-center">
              <h5 className="font-medium text-gray-900">{trade.playerTo.lastname}</h5>
              <p className="text-sm text-gray-500">{trade.playerTo.realteam}</p>
              <p className="text-sm text-gray-500">Valore: {trade.playerTo.value}</p>
              <p className="text-xs text-gray-400">{trade.toTeam.name} ({trade.toTeam.girone})</p>
            </div>
          </div>

          {/* Azioni per trade in arrivo */}
          {canRespond(trade) && (
            <div className="flex space-x-3 mt-4 pt-4 border-t">
              <button
                onClick={() => onTradeAction(trade.id, 'accept')}
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                Accetta
              </button>
              <button
                onClick={() => onTradeAction(trade.id, 'reject')}
                disabled={loading}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                Rifiuta
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
