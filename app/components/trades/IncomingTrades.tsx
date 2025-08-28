//components/trades/IncomingTrades.tsx
'use client';

import { useState } from 'react';
import { Trade, Team, Player, TradeLog } from '@prisma/client';

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
  logs: TradeLog[];
}

interface IncomingTradesProps {
  trades: TradeWithRelations[];
  currentTeamId: number;
}

export default function IncomingTrades({ trades: initialTrades, currentTeamId }: IncomingTradesProps) {
  const [trades, setTrades] = useState(initialTrades);
  const [loading, setLoading] = useState(false);

  const handleTradeAction = async (tradeId: number, action: 'accept' | 'reject') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/trades/${tradeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      const data = await res.json();
      
      if (res.ok) {
        alert(`Scambio ${action === 'accept' ? 'accettato' : 'rifiutato'} con successo!`);
        
        // Rimuovi il trade dalla lista se è stato processato
        setTrades(trades.filter(t => t.id !== tradeId));
      } else {
        alert(data.error || 'Errore nell\'azione sul trade');
      }
    } catch (error) {
      console.error('Errore:', error);
      alert('Errore nell\'azione sul trade');
    } finally {
      setLoading(false);
    }
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
    PORTIERE: 'Portiere',
    DIFENSORE: 'Difensore', 
    CENTROCAMPISTA: 'Centrocampista',
    ATTACCANTE: 'Attaccante'
  } as const;

  if (trades.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">Nessun scambio in arrivo</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {trades.map((trade) => {
        const playersFrom = getPlayersFromTrade(trade, 'FROM');
        const playersTo = getPlayersFromTrade(trade, 'TO');
        const playersFromGrouped = groupPlayersByRole(playersFrom);
        const playersToGrouped = groupPlayersByRole(playersTo);
        
        const totalValueFrom = playersFrom.reduce((sum, p) => sum + p.value, 0);
        const totalValueTo = playersTo.reduce((sum, p) => sum + p.value, 0);
        const valueDifference = totalValueTo - totalValueFrom;

        return (
          <div key={trade.id} className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="text-lg font-semibold text-blue-600">
                  Proposta da: {trade.fromTeam.name}
                </h4>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    {trade.fromTeam.girone === trade.toTeam.girone ? 'Scambio Locale' : 'Scambio Globale'}
                  </span>
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                    Richiede risposta
                  </span>
                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                    {playersFrom.length} ↔ {playersTo.length} giocatori
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Ricevuto il {new Date(trade.createdAt).toLocaleDateString('it-IT', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Giocatori che ricevi */}
              <div className="bg-green-50 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-3 text-center">
                  Ricevi ({playersFrom.length} giocatori)
                </h5>
                <div className="space-y-3">
                  {Object.entries(playersFromGrouped).map(([role, rolePlayers]) => (
                    <div key={role}>
                      <h6 className="text-sm font-medium text-gray-700 mb-1">
                        {roleLabels[role as keyof typeof roleLabels]} ({rolePlayers.length})
                      </h6>
                      {rolePlayers.map(player => (
                        <div key={player.id} className="text-sm bg-white rounded p-2 border">
                          <div className="font-semibold text-green-800">{player.lastname}</div>
                          <div className="text-gray-600">{player.realteam}</div>
                          <div className="text-green-700 font-medium">Valore: {player.value}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-green-200">
                  <div className="text-center font-semibold text-green-800">
                    Valore totale: {totalValueFrom}
                  </div>
                </div>
              </div>

              {/* Freccia e crediti */}
              <div className="text-center flex flex-col justify-center">
                <div className="text-4xl mb-3">⇄</div>
                {trade.credits > 0 && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-800 font-medium">
                      + {trade.credits} crediti
                    </p>
                  </div>
                )}
              </div>

              {/* Giocatori che cedi */}
              <div className="bg-red-50 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-3 text-center">
                  Cedi ({playersTo.length} giocatori)
                </h5>
                <div className="space-y-3">
                  {Object.entries(playersToGrouped).map(([role, rolePlayers]) => (
                    <div key={role}>
                      <h6 className="text-sm font-medium text-gray-700 mb-1">
                        {roleLabels[role as keyof typeof roleLabels]} ({rolePlayers.length})
                      </h6>
                      {rolePlayers.map(player => (
                        <div key={player.id} className="text-sm bg-white rounded p-2 border">
                          <div className="font-semibold text-red-800">{player.lastname}</div>
                          <div className="text-gray-600">{player.realteam}</div>
                          <div className="text-red-700 font-medium">Valore: {player.value}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-red-200">
                  <div className="text-center font-semibold text-red-800">
                    Valore totale: {totalValueTo}
                  </div>
                </div>
              </div>
            </div>

            {/* Analisi Scambio */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h6 className="font-medium text-gray-900 mb-3">Analisi Scambio</h6>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Giocatori:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {playersFrom.length} ↔ {playersTo.length}
                  </span>
                </div>
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
                  <span className="text-gray-600">Crediti inclusi:</span>
                  <span className="ml-2 font-medium text-blue-600">
                    {trade.credits > 0 ? `+${trade.credits}` : '0'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Vantaggio totale:</span>
                  <span className={`ml-2 font-medium ${
                    (valueDifference + trade.credits) > 0 ? 'text-green-600' : 
                    (valueDifference + trade.credits) < 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {(valueDifference + trade.credits) > 0 ? '+' : ''}
                    {valueDifference + trade.credits}
                  </span>
                </div>
              </div>

              {/* Bilanciamento per ruolo */}
              <div className="mt-3 pt-3 border-t">
                <span className="text-gray-600 text-sm">Bilanciamento per ruolo:</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {Object.keys({...playersFromGrouped, ...playersToGrouped}).map(role => (
                    <span key={role} className="text-xs bg-white px-2 py-1 rounded border">
                      {roleLabels[role as keyof typeof roleLabels]}: {(playersFromGrouped[role] || []).length} ↔ {(playersToGrouped[role] || []).length}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Azioni */}
            <div className="flex space-x-3">
              <button
                onClick={() => handleTradeAction(trade.id, 'accept')}
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
              >
                ✅ Accetta Scambio
              </button>
              <button
                onClick={() => handleTradeAction(trade.id, 'reject')}
                disabled={loading}
                className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
              >
                ❌ Rifiuta Scambio
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}