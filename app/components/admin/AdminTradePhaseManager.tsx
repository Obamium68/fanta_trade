// app/components/admin/AdminTradePhaseManager.tsx
'use client';

import { useState } from 'react';
import { TradePhase } from '@prisma/client';

interface AdminTradePhaseManagerProps {
  currentPhase: TradePhase | null;
}

export default function AdminTradePhaseManager({ currentPhase }: AdminTradePhaseManagerProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    status: 'CLOSED' as 'OPEN' | 'CLOSED',
    startTime: '',
    endTime: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/admin/trades/phase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: formData.status,
          startTime: formData.startTime || undefined,
          endTime: formData.endTime || undefined
        })
      });

      const data = await res.json();

      if (res.ok) {
        alert('Fase di scambio aggiornata con successo!');
        window.location.reload(); // Ricarica per vedere i cambiamenti
      } else {
        alert(data.error || 'Errore nell\'aggiornamento');
      }
    } catch (error) {
      console.error('Phase update error:', error);
      alert('Errore nell\'aggiornamento');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStatus = () => {
    if (!currentPhase) return 'Nessuna fase configurata';
    
    const now = new Date();
    if (currentPhase.status === 'CLOSED') return 'Chiuso';
    
    if (currentPhase.startTime && now < new Date(currentPhase.startTime)) {
      return `Aprirà il ${new Date(currentPhase.startTime).toLocaleString('it-IT')}`;
    }
    
    if (currentPhase.endTime && now > new Date(currentPhase.endTime)) {
      return 'Scaduto';
    }
    
    return 'Aperto';
  };

  const getStatusColor = () => {
    if (!currentPhase) return 'bg-gray-100 text-gray-800';
    
    const now = new Date();
    if (currentPhase.status === 'CLOSED') return 'bg-red-100 text-red-800';
    
    if (currentPhase.startTime && now < new Date(currentPhase.startTime)) {
      return 'bg-yellow-100 text-yellow-800';
    }
    
    if (currentPhase.endTime && now > new Date(currentPhase.endTime)) {
      return 'bg-red-100 text-red-800';
    }
    
    return 'bg-green-100 text-green-800';
  };

  const quickActions = [
    {
      label: 'Chiudi Immediatamente',
      action: () => setFormData({ status: 'CLOSED', startTime: '', endTime: '' }),
      color: 'bg-red-50 hover:bg-red-100 text-red-700',
      icon: '🔒'
    },
    {
      label: 'Apri Ora',
      action: () => setFormData({ status: 'OPEN', startTime: '', endTime: '' }),
      color: 'bg-green-50 hover:bg-green-100 text-green-700',
      icon: '🔓'
    },
    {
      label: 'Programma Apertura',
      action: () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        setFormData({
          status: 'OPEN',
          startTime: tomorrow.toISOString().slice(0, 16),
          endTime: ''
        });
      },
      color: 'bg-blue-50 hover:bg-blue-100 text-blue-700',
      icon: '⏰'
    }
  ];

  return (
    <div className="max-w-4xl">
      {/* Current Status */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Stato Attuale Fasi Scambio</h3>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
            {getCurrentStatus()}
          </span>
        </div>
        
        {currentPhase ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-lg font-semibold text-gray-900">
                {currentPhase.status === 'OPEN' ? 'Aperto' : 'Chiuso'}
              </div>
              <div className="text-sm text-gray-500">Stato Generale</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-lg font-semibold text-gray-900">
                {currentPhase.startTime 
                  ? new Date(currentPhase.startTime).toLocaleDateString('it-IT', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : 'Non impostato'
                }
              </div>
              <div className="text-sm text-gray-500">Data Inizio</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-lg font-semibold text-gray-900">
                {currentPhase.endTime 
                  ? new Date(currentPhase.endTime).toLocaleDateString('it-IT', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : 'Non impostato'
                }
              </div>
              <div className="text-sm text-gray-500">Data Fine</div>
            </div>
          </div>
        ) : (
          <div className="text-center p-8 bg-gray-50 rounded-lg">
            <div className="text-gray-400 text-4xl mb-4">⚙️</div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">Nessuna Fase Configurata</h4>
            <p className="text-gray-600">Configura una nuova fase di scambio utilizzando il form sottostante.</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Azioni Rapide</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className={`p-4 rounded-lg text-center transition-colors ${action.color}`}
            >
              <div className="text-2xl mb-2">{action.icon}</div>
              <div className="font-medium">{action.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* New Phase Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Configura Nuova Fase Scambio</h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stato Fase
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="CLOSED">🔒 Chiuso - Gli utenti non possono effettuare scambi</option>
              <option value="OPEN">🔓 Aperto - Gli utenti possono effettuare scambi</option>
            </select>
          </div>

          {formData.status === 'OPEN' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data e Ora Inizio (opzionale)
                </label>
                <input
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Se non specificato, la fase inizierà immediatamente
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data e Ora Fine (opzionale)
                </label>
                <input
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  min={formData.startTime}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Se non specificato, la fase rimarrà aperta indefinitamente
                </p>
              </div>
            </>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <span className="text-blue-500 text-lg">ℹ️</span>
              <div>
                <h4 className="text-blue-800 font-medium mb-1">Informazioni Importanti</h4>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• Creare una nuova fase sostituisce automaticamente quella precedente</li>
                  <li>• I trade già in corso non verranno interrotti</li>
                  <li>• Gli utenti vedranno immediatamente il nuovo stato</li>
                  <li>• Puoi sempre creare una nuova fase per modificare le impostazioni</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
          >
            {loading ? 'Configurazione in corso...' : 'Configura Fase Scambio'}
          </button>
        </form>
      </div>
    </div>
  );
}