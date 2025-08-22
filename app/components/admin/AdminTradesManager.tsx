'use client';

import { useState } from 'react';
import { Trade, Team, Player, TradeStatus, TradeLog, TradePhase } from '@prisma/client';
import AdminTradeList from './AdminTradeList';
import AdminTradePhaseManager from './AdminTradePhaseManager';
import AdminTradeStats from './AdminTradeStats';
// import AdminTradeList from './AdminTradeList';
// import AdminTradePhaseManager from './AdminTradePhaseManager';
// import AdminTradeStats from './AdminTradeStats';

interface TradeWithRelations extends Trade {
  fromTeam: Team & { members: any[] };
  toTeam: Team & { members: any[] };
  playerFrom: Player;
  playerTo: Player;
  logs: TradeLog[];
}

interface AdminTradeManagerProps {
  trades: TradeWithRelations[];
  stats: {
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
    approved: number;
    needsApproval: number;
  };
  tradePhase: TradePhase | null;
}

export default function AdminTradeManager({ 
  trades: initialTrades, 
  stats: initialStats, 
  tradePhase 
}: AdminTradeManagerProps) {
  const [trades, setTrades] = useState(initialTrades);
  const [stats, setStats] = useState(initialStats);
  const [activeTab, setActiveTab] = useState<'overview' | 'pending' | 'accepted' | 'all' | 'phases'>('overview');
  const [loading, setLoading] = useState(false);

  const handleTradeAction = async (tradeId: number, action: 'approve' | 'reject', reason?: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/trades/${tradeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason })
      });

      const data = await res.json();

      if (res.ok) {
        // Aggiorna la lista trade
        setTrades(prevTrades => 
          prevTrades.map(t => t.id === tradeId ? data.trade : t)
        );
        
        // Aggiorna statistiche
        const newStats = { ...stats };
        if (action === 'approve') {
          newStats.accepted -= 1;
          newStats.approved += 1;
          newStats.needsApproval -= 1;
        } else {
          newStats.accepted -= 1;
          newStats.rejected += 1;
          newStats.needsApproval -= 1;
        }
        setStats(newStats);

        alert(`Trade ${action === 'approve' ? 'approvato' : 'rifiutato'} con successo!`);
      } else {
        alert(data.error || 'Errore nell\'azione');
      }
    } catch (error) {
      console.error('Trade action error:', error);
      alert('Errore nell\'azione');
    } finally {
      setLoading(false);
    }
  };

  const filteredTrades = () => {
    switch (activeTab) {
      case 'pending':
        return trades.filter(t => t.status === 'PENDING');
      case 'accepted':
        return trades.filter(t => t.status === 'ACCEPTED');
      case 'all':
        return trades;
      default:
        return trades;
    }
  };

  const tabs = [
    { key: 'overview', label: 'Panoramica', count: null },
    { key: 'accepted', label: 'Da Approvare', count: stats.needsApproval },
    { key: 'pending', label: 'In Attesa', count: stats.pending },
    { key: 'all', label: 'Tutti', count: stats.total },
    { key: 'phases', label: 'Gestione Fasi', count: null }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span>{tab.label}</span>
                {tab.count !== null && tab.count > 0 && (
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    activeTab === tab.key 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <AdminTradeStats stats={stats} />
      )}

      {activeTab === 'phases' && (
        <AdminTradePhaseManager currentPhase={tradePhase} />
      )}

      {(activeTab === 'pending' || activeTab === 'accepted' || activeTab === 'all') && (
        <AdminTradeList
          trades={filteredTrades()}
          onTradeAction={handleTradeAction}
          loading={loading}
          showActions={activeTab === 'accepted'}
        />
      )}
    </div>
  );
}