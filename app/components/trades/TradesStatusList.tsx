'use client';

import { Trade, Team, Player, TradeStatus, TradeLog, TradePlayer } from '@prisma/client';
import { useState } from 'react';

interface TradeWithRelations extends Trade {
  fromTeam: Team;
  toTeam: Team;
  tradePlayers: (TradePlayer & { player: Player })[];
  logs: TradeLog[];
}

interface TradeStatusListProps {
  trades: TradeWithRelations[];
  currentTeamId: number;
}

export default function TradeStatusList({ trades, currentTeamId }: TradeStatusListProps) {
  const [expandedTrade, setExpandedTrade] = useState<number | null>(null);

  const getStatusBadge = (status: TradeStatus) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      ACCEPTED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      APPROVED: 'bg-blue-100 text-blue-800'
    };

    const labels = {
      PENDING: 'In Attesa',
      ACCEPTED: 'Accettato - In attesa admin',
      REJECTED: 'Rifiutato',
      APPROVED: 'Completato'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const isIncoming = (trade: TradeWithRelations) => trade.toTeamId === currentTeamId;

  const getTradeType = (trade: TradeWithRelations) => {
    return trade.fromTeam.girone === trade.toTeam.girone ? 'Locale' : 'Globale';
  };

  const getPlayersFromTeam = (trade: TradeWithRelations, direction: 'FROM' | 'TO') => {
    return trade.tradePlayers.filter(tp => tp.direction === direction);
  };

  const getTotalValue = (players: (TradePlayer & { player: Player })[]) => {
    return players.reduce((sum, tp) => sum + tp.player.value, 0);
  };

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
        const playersFrom = getPlayersFromTeam(trade, 'FROM');
        const playersTo = getPlayersFromTeam(trade, 'TO');
        const fromValue = getTotalValue(playersFrom);
        const toValue = getTotalValue(playersTo);
        
        return (
          <div key={trade.id} className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-lg font-semibold">
                      {isIncoming(trade) ? 'Da' : 'A'}: {' '}
                      {isIncoming(trade) ? trade.fromTeam.name : trade.toTeam.name}
                    </h4>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {getTradeType(trade)}
                    </span>
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                      {playersFrom.length}v{playersTo.length}
                    </span>
                  </div>
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
                <div className="flex items-center space-x-2">
                  {getStatusBadge(trade.status)}
                  <button
                    onClick={() => setExpandedTrade(expandedTrade === trade.id ? null : trade.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {expandedTrade === trade.id ? '▼' : '▶'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                {/* Giocatori From */}
                <div className={`text-center p-4 rounded-lg ${
                  isIncoming(trade) ? 'bg-red-50' : 'bg-blue-50'
                }`}>
                  <h5 className="font-medium text-gray-900 mb-2">
                    {isIncoming(trade) ? 'Offerti' : 'Ceduti'}
                  </h5>
                  <div className="space-y-1 mb-2">
                    {playersFrom.map((tp) => (
                      <div key={tp.playerId} className="text-sm">
                        <p className="font-medium">{tp.player.lastname}</p>
                        <p className="text-xs text-gray-600">{tp.player.realteam}</p>
                        <p className="text-xs text-gray-500">Val: {tp.player.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-sm font-bold text-gray-700">Tot: {fromValue}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {trade.fromTeam.name} ({trade.fromTeam.girone})
                  </p>
                </div>

                {/* Freccia e crediti */}
                <div className="text-center">
                  <div className="text-2xl mb-2">
                    {isIncoming(trade) ? '⬅️' : '➡️'}
                  </div>
                  <p className="text-xs text-gray-500 mb-1">
                    {playersFrom.length}v{playersTo.length}
                  </p>
                  {trade.credits > 0 && (
                    <p className="text-sm text-blue-600 font-medium">
                      + {trade.credits} crediti
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Diff: {isIncoming(trade) ? 
                      (toValue - fromValue - trade.credits) : 
                      (fromValue - toValue + trade.credits)
                    }
                  </p>
                </div>

                {/* Giocatori To */}
                <div className={`text-center p-4 rounded-lg ${
                  isIncoming(trade) ? 'bg-blue-50' : 'bg-red-50'
                }`}>
                  <h5 className="font-medium text-gray-900 mb-2">
                    {isIncoming(trade) ? 'Ricevuti' : 'Richiesti'}
                  </h5>
                  <div className="space-y-1 mb-2">
                    {playersTo.map((tp) => (
                      <div key={tp.playerId} className="text-sm">
                        <p className="font-medium">{tp.player.lastname}</p>
                        <p className="text-xs text-gray-600">{tp.player.realteam}</p>
                        <p className="text-xs text-gray-500">Val: {tp.player.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-sm font-bold text-gray-700">Tot: {toValue}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {trade.toTeam.name} ({trade.toTeam.girone})
                  </p>
                </div>
              </div>
            </div>

            {/* Expanded section with logs */}
            {expandedTrade === trade.id && (
              <div className="border-t bg-gray-50 p-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Detailed Player Info */}
                  <div>
                    <h6 className="font-medium text-gray-900 mb-3">Dettagli Giocatori</h6>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-blue-700 mb-2">
                          Da {trade.fromTeam.name}:
                        </p>
                        {playersFrom.map((tp) => (
                          <div key={tp.playerId} className="text-sm mb-2 p-2 bg-blue-50 rounded">
                            <p className="font-medium">{tp.player.lastname}</p>
                            <p className="text-xs text-gray-600">
                              {tp.player.realteam} • {tp.player.role}
                            </p>
                            <p className="text-xs text-gray-600">Valore: {tp.player.value}</p>
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-red-700 mb-2">
                          Da {trade.toTeam.name}:
                        </p>
                        {playersTo.map((tp) => (
                          <div key={tp.playerId} className="text-sm mb-2 p-2 bg-red-50 rounded">
                            <p className="font-medium">{tp.player.lastname}</p>
                            <p className="text-xs text-gray-600">
                              {tp.player.realteam} • {tp.player.role}
                            </p>
                            <p className="text-xs text-gray-600">Valore: {tp.player.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Logs */}
                  <div>
                    <h6 className="font-medium text-gray-900 mb-3">Cronologia</h6>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {trade.logs.map((log) => (
                        <div key={log.id} className="flex items-start space-x-2 text-sm">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                          <div>
                            <p className="text-gray-800">{log.action}</p>
                            <p className="text-gray-500 text-xs">
                              {new Date(log.timestamp).toLocaleDateString('it-IT', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}