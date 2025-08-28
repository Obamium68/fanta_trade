//components/trades/TradesList.tsx
'use client';

import { Trade, Team, Player, TradeStatus } from '@prisma/client';

interface TradePlayer {
  id: number;
  playerId: number;
  direction: 'FROM' | 'TO';
  player: Player;
}

interface TradeWithRelations extends Trade {
  fromTeam: Team;
  toTeam: Team;
  tradePlayers: TradePlayer[];
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

  const getPlayersFromTrade = (trade: TradeWithRelations, direction: 'FROM' | 'TO') => {
    return trade.tradePlayers
      .filter(tp => tp.direction === direction)
      .map(tp => tp.player);
  };

  const groupPlayersByRole = (players: Player[]) => {
    return players.reduce((acc, player) => {
      if (!acc[player.role]) acc[player.role] = [];
      acc[player.role].push(player);
      return acc;
    }, {} as Record<string, Player[]>);
  };

  const roleLabels = {
    PORTIERE: 'P',
    DIFENSORE: 'D', 
    CENTROCAMPISTA: 'C',
    ATTACCANTE: 'A'
  } as const;

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
      {trades.map((trade) => {
        const playersFrom = getPlayersFromTrade(trade, 'FROM');
        const playersTo = getPlayersFromTrade(trade, 'TO');
        const playersFromGrouped = groupPlayersByRole(playersFrom);
        const playersToGrouped = groupPlayersByRole(playersTo);
        
        const totalValueFrom = playersFrom.reduce((sum, p) => sum + p.value, 0);
        const totalValueTo = playersTo.reduce((sum, p) => sum + p.value, 0);
        const valueDifference = isIncoming(trade) 
          ? totalValueFrom - totalValueTo  // Per trade in arrivo: quello che ricevo - quello che cedo
          : totalValueTo - totalValueFrom; // Per trade inviati: quello che ricevo - quello che cedo

        return (
          <div key={trade.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="text-lg font-semibold">
                  {isIncoming(trade) ? 'Ricevuto da' : 'Inviato a'}: {' '}
                  <span className="text-blue-600">
                    {isIncoming(trade) ? trade.fromTeam.name : trade.toTeam.name}
                  </span>
                </h4>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    {trade.fromTeam.girone === trade.toTeam.girone ? 'Locale' : 'Globale'}
                  </span>
                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                    Multi-giocatore: {playersFrom.length} ↔ {playersTo.length}
                  </span>
                  {getStatusBadge(trade.status)}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(trade.createdAt).toLocaleDateString('it-IT', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>

            {/* Vista compatta dei giocatori */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center mb-4">
              {/* Giocatori FROM (quello che il mittente offre / destinatario riceve) */}
              <div className={`text-center p-3 rounded-lg ${
                isIncoming(trade) ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'
              }`}>
                <h5 className="font-medium text-gray-900 mb-2">
                  {isIncoming(trade) ? 'Ricevi' : 'Offri'} ({playersFrom.length})
                </h5>
                <div className="space-y-1">
                  {Object.entries(playersFromGrouped).map(([role, rolePlayers]) => (
                    <div key={role} className="text-xs">
                      <span className="font-medium">{roleLabels[role as keyof typeof roleLabels]}:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {rolePlayers.map(player => (
                          <span key={player.id} className="bg-white px-1 py-0.5 rounded text-xs border">
                            {player.lastname} ({player.value})
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t">
                  <span className="text-xs font-medium">Totale: {totalValueFrom}</span>
                </div>
              </div>

              {/* Freccia e crediti */}
              <div className="text-center">
                <div className="text-2xl mb-2">
                  {isIncoming(trade) ? '⬅️' : '➡️'}
                </div>
                {trade.credits > 0 && (
                  <div className="bg-blue-50 p-2 rounded text-xs">
                    <span className="font-medium text-blue-800">
                      + {trade.credits} crediti
                    </span>
                  </div>
                )}
              </div>

              {/* Giocatori TO (quello che il mittente vuole / destinatario cede) */}
              <div className={`text-center p-3 rounded-lg ${
                isIncoming(trade) ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
              }`}>
                <h5 className="font-medium text-gray-900 mb-2">
                  {isIncoming(trade) ? 'Cedi' : 'Richiedi'} ({playersTo.length})
                </h5>
                <div className="space-y-1">
                  {Object.entries(playersToGrouped).map(([role, rolePlayers]) => (
                    <div key={role} className="text-xs">
                      <span className="font-medium">{roleLabels[role as keyof typeof roleLabels]}:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {rolePlayers.map(player => (
                          <span key={player.id} className="bg-white px-1 py-0.5 rounded text-xs border">
                            {player.lastname} ({player.value})
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t">
                  <span className="text-xs font-medium">Totale: {totalValueTo}</span>
                </div>
              </div>
            </div>

            {/* Analisi rapida */}
            <div className="bg-gray-50 p-3 rounded-lg mb-4">
              <div className="flex justify-between items-center text-sm">
                <div>
                  <span className="text-gray-600">Differenza valore:</span>
                  <span className={`ml-2 font-medium ${
                    valueDifference > 0 ? 'text-green-600' : 
                    valueDifference < 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {valueDifference > 0 ? '+' : ''}{valueDifference}
                  </span>
                </div>
                
                <div>
                  <span className="text-gray-600">Vantaggio totale:</span>
                  <span className={`ml-2 font-medium ${
                    (valueDifference + (isIncoming(trade) ? trade.credits : -trade.credits)) > 0 ? 'text-green-600' : 
                    (valueDifference + (isIncoming(trade) ? trade.credits : -trade.credits)) < 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {(valueDifference + (isIncoming(trade) ? trade.credits : -trade.credits)) > 0 ? '+' : ''}
                    {valueDifference + (isIncoming(trade) ? trade.credits : -trade.credits)}
                  </span>
                </div>

                <div className="text-xs text-gray-500">
                  {trade.fromTeam.name} ({trade.fromTeam.girone}) ↔ {trade.toTeam.name} ({trade.toTeam.girone})
                </div>
              </div>
            </div>

            {/* Azioni per trade in arrivo */}
            {canRespond(trade) && (
              <div className="flex space-x-3 pt-4 border-t">
                <button
                  onClick={() => onTradeAction(trade.id, 'accept')}
                  disabled={loading}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 font-medium"
                >
                  ✅ Accetta
                </button>
                <button
                  onClick={() => onTradeAction(trade.id, 'reject')}
                  disabled={loading}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 font-medium"
                >
                  ❌ Rifiuta
                </button>
              </div>
            )}

            {/* Mostra stato per trade non pending */}
            {trade.status !== 'PENDING' && (
              <div className="pt-4 border-t">
                <div className="flex justify-center">
                  {getStatusBadge(trade.status)}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}