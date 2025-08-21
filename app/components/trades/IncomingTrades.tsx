'use client';

import { useState } from 'react';
import { Trade, Team, Player, TradeLog } from '@prisma/client';

interface TradeWithRelations extends Trade {
  fromTeam: Team;
  toTeam: Team;
  playerFrom: Player;
  playerTo: Player;
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

  if (trades.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">Nessun scambio in arrivo</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {trades.map((trade) => (
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center mb-6">
            {/* Giocatore che ricevi */}
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <h5 className="font-medium text-gray-900 mb-2">Ricevi</h5>
              <h6 className="font-semibold text-green-800">{trade.playerFrom.lastname}</h6>
              <p className="text-sm text-gray-600">{trade.playerFrom.realteam}</p>
              <p className="text-sm text-gray-600">Ruolo: {trade.playerFrom.role}</p>
              <p className="text-sm text-green-700 font-medium">Valore: {trade.playerFrom.value}</p>
            </div>

            {/* Freccia e crediti */}
            <div className="text-center">
              <div className="text-3xl mb-2">⇄</div>
              {trade.credits > 0 && (
                <div className="bg-blue-50 p-2 rounded">
                  <p className="text-sm text-blue-800 font-medium">
                    + {trade.credits} crediti
                  </p>
                </div>
              )}
            </div>

            {/* Giocatore che cedi */}
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <h5 className="font-medium text-gray-900 mb-2">Cedi</h5>
              <h6 className="font-semibold text-red-800">{trade.playerTo.lastname}</h6>
              <p className="text-sm text-gray-600">{trade.playerTo.realteam}</p>
              <p className="text-sm text-gray-600">Ruolo: {trade.playerTo.role}</p>
              <p className="text-sm text-red-700 font-medium">Valore: {trade.playerTo.value}</p>
            </div>
          </div>

          {/* Confronto valori */}
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h6 className="font-medium text-gray-900 mb-2">Analisi Scambio</h6>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Differenza di valore:</span>
                <span className={`ml-2 font-medium ${
                  trade.playerFrom.value > trade.playerTo.value ? 'text-green-600' : 
                  trade.playerFrom.value < trade.playerTo.value ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {trade.playerFrom.value > trade.playerTo.value ? '+' : ''}
                  {trade.playerFrom.value - trade.playerTo.value}
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
                  (trade.playerFrom.value - trade.playerTo.value + trade.credits) > 0 ? 'text-green-600' : 
                  (trade.playerFrom.value - trade.playerTo.value + trade.credits) < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {(trade.playerFrom.value - trade.playerTo.value + trade.credits) > 0 ? '+' : ''}
                  {trade.playerFrom.value - trade.playerTo.value + trade.credits}
                </span>
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
      ))}
    </div>
  );
}