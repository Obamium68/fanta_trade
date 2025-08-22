// app/components/admin/AdminTradeList.tsx
'use client';

import { useState } from 'react';
import { Trade, Team, Player, TradeStatus, TradeLog } from '@prisma/client';

interface TradeWithRelations extends Trade {
  fromTeam: Team & { members: any[] };
  toTeam: Team & { members: any[] };
  playerFrom: Player;
  playerTo: Player;
  logs: TradeLog[];
}

interface AdminTradeListProps {
  trades: TradeWithRelations[];
  onTradeAction: (tradeId: number, action: 'approve' | 'reject', reason?: string) => void;
  loading: boolean;
  showActions: boolean;
}

export default function AdminTradeList({ trades, onTradeAction, loading, showActions }: AdminTradeListProps) {
  const [expandedTrade, setExpandedTrade] = useState<number | null>(null);
  const [actionModal, setActionModal] = useState<{
    tradeId: number;
    action: 'approve' | 'reject';
  } | null>(null);
  const [reason, setReason] = useState('');

  const getStatusBadge = (status: TradeStatus) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      ACCEPTED: 'bg-green-100 text-green-800 border border-green-200',
      REJECTED: 'bg-red-100 text-red-800',
      APPROVED: 'bg-blue-100 text-blue-800'
    };

    const labels = {
      PENDING: 'In Attesa',
      ACCEPTED: '✅ DA APPROVARE',
      REJECTED: 'Rifiutato',
      APPROVED: 'Completato'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getTradeType = (trade: TradeWithRelations) => {
    return trade.fromTeam.girone === trade.toTeam.girone ? 'Locale' : 'Globale';
  };

  const getValueDifference = (trade: TradeWithRelations) => {
    const diff = trade.playerFrom.value - trade.playerTo.value + trade.credits;
    return diff;
  };

  const handleAction = (tradeId: number, action: 'approve' | 'reject') => {
    setActionModal({ tradeId, action });
    setReason('');
  };

  const confirmAction = () => {
    if (actionModal) {
      onTradeAction(actionModal.tradeId, actionModal.action, reason.trim() || undefined);
      setActionModal(null);
      setReason('');
    }
  };

  if (trades.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="text-gray-400 text-4xl mb-4">📭</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun trade trovato</h3>
        <p className="text-gray-500">Non ci sono trade che corrispondono ai filtri selezionati.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {trades.map((trade) => (
          <div key={trade.id} className={`bg-white rounded-lg shadow border ${
            trade.status === 'ACCEPTED' ? 'border-green-200 ring-2 ring-green-100' : 'border-gray-200'
          }`}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-lg font-semibold text-gray-900">
                      Trade #{trade.id}
                    </h4>
                    {getStatusBadge(trade.status)}
                    <span className={`text-xs px-2 py-1 rounded ${
                      getTradeType(trade) === 'Locale' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {getTradeType(trade)}
                    </span>
                    {trade.status === 'ACCEPTED' && (
                      <span className="animate-pulse text-red-600 font-medium">
                        🚨 RICHIEDE AZIONE
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    Creato: {new Date(trade.createdAt).toLocaleDateString('it-IT', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })} • Aggiornato: {new Date(trade.updatedAt).toLocaleDateString('it-IT', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <button
                  onClick={() => setExpandedTrade(expandedTrade === trade.id ? null : trade.id)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {expandedTrade === trade.id ? '▼' : '▶'}
                </button>
              </div>

              {/* Trade Overview */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center mb-4">
                {/* From Team */}
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <h5 className="font-medium text-gray-900 mb-1">{trade.fromTeam.name}</h5>
                  <p className="text-xs text-gray-500">Girone {trade.fromTeam.girone}</p>
                  <div className="mt-2">
                    <p className="text-sm font-medium text-red-700">{trade.playerFrom.lastname}</p>
                    <p className="text-xs text-gray-600">{trade.playerFrom.realteam}</p>
                    <p className="text-xs text-gray-600">Valore: {trade.playerFrom.value}</p>
                  </div>
                </div>

                {/* Arrow */}
                <div className="text-center">
                  <div className="text-2xl">→</div>
                </div>

                {/* To Team */}
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <h5 className="font-medium text-gray-900 mb-1">{trade.toTeam.name}</h5>
                  <p className="text-xs text-gray-500">Girone {trade.toTeam.girone}</p>
                  <div className="mt-2">
                    <p className="text-sm font-medium text-green-700">{trade.playerTo.lastname}</p>
                    <p className="text-xs text-gray-600">{trade.playerTo.realteam}</p>
                    <p className="text-xs text-gray-600">Valore: {trade.playerTo.value}</p>
                  </div>
                </div>

                {/* Credits & Analysis */}
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <h6 className="text-sm font-medium text-gray-900 mb-2">Crediti</h6>
                  <p className="text-lg font-bold text-blue-600">
                    {trade.credits > 0 ? `+${trade.credits}` : '0'}
                  </p>
                </div>

                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <h6 className="text-sm font-medium text-gray-900 mb-2">Vantaggio</h6>
                  <p className={`text-lg font-bold ${
                    getValueDifference(trade) > 0 ? 'text-green-600' : 
                    getValueDifference(trade) < 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {getValueDifference(trade) > 0 ? '+' : ''}{getValueDifference(trade)}
                  </p>
                  <p className="text-xs text-gray-500">per {trade.toTeam.name}</p>
                </div>
              </div>

              {/* Actions for ACCEPTED trades */}
              {showActions && trade.status === 'ACCEPTED' && (
                <div className="flex space-x-3 pt-4 border-t">
                  <button
                    onClick={() => handleAction(trade.id, 'approve')}
                    disabled={loading}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 font-medium"
                  >
                    ✅ Approva Scambio
                  </button>
                  <button
                    onClick={() => handleAction(trade.id, 'reject')}
                    disabled={loading}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 font-medium"
                  >
                    ❌ Rifiuta Scambio
                  </button>
                </div>
              )}
            </div>

            {/* Expanded Details */}
            {expandedTrade === trade.id && (
              <div className="border-t bg-gray-50 p-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Team Details */}
                  <div>
                    <h6 className="font-medium text-gray-900 mb-3">Dettagli Team</h6>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">A: {trade.toTeam.name}</span>
                        <span className="text-sm text-gray-900">Crediti: {trade.toTeam.credits}</span>
                      </div>
                      <div className="text-sm">
                        <p className="text-gray-600 mb-1">Membri {trade.fromTeam.name}:</p>
                        <p className="text-gray-900">{trade.fromTeam.members.map(m => m.name).join(', ')}</p>
                      </div>
                      <div className="text-sm">
                        <p className="text-gray-600 mb-1">Membri {trade.toTeam.name}:</p>
                        <p className="text-gray-900">{trade.toTeam.members.map(m => m.name).join(', ')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Logs */}
                  <div>
                    <h6 className="font-medium text-gray-900 mb-3">Cronologia ({trade.logs.length})</h6>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {trade.logs.map((log) => (
                        <div key={log.id} className="flex items-start space-x-2 text-sm">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                          <div className="flex-1">
                            <p className="text-gray-800">{log.action}</p>
                            <p className="text-gray-500 text-xs">
                              {new Date(log.timestamp).toLocaleString('it-IT')}
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
        ))}
      </div>

      {/* Action Confirmation Modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Conferma {actionModal.action === 'approve' ? 'Approvazione' : 'Rifiuto'}
            </h3>
            <p className="text-gray-600 mb-4">
              Sei sicuro di voler {actionModal.action === 'approve' ? 'approvare' : 'rifiutare'} questo scambio?
              {actionModal.action === 'approve' && ' Questa azione completerà definitivamente lo scambio.'}
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo (opzionale)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Aggiungi un motivo per questa decisione..."
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setActionModal(null)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                disabled={loading}
              >
                Annulla
              </button>
              <button
                onClick={confirmAction}
                disabled={loading}
                className={`flex-1 px-4 py-2 text-white rounded-md font-medium ${
                  actionModal.action === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                } disabled:opacity-50`}
              >
                {loading ? 'Elaborazione...' : 'Conferma'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
