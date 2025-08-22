'use client';

import { useState, useEffect } from 'react';
import { Team } from '@prisma/client';
import TradeForm from './TradeForm';
import TradesList from './TradesList';

interface TradesManagerProps {
  isGlobal: boolean;
  currentTeam: Team;
}

export default function TradesManager({ isGlobal, currentTeam }: TradesManagerProps) {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');

  const fetchTrades = async () => {
    try {
      const res = await fetch('/api/trades');
      const data = await res.json();
      if (res.ok) {
        setTrades(data.trades);
      }
    } catch (error) {
      console.error('Errore nel caricamento trade:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'list') {
      fetchTrades();
    }
  }, [activeTab]);

  const handleCreateTrade = async (tradeData: any) => {
    setLoading(true);
    try {
      const res = await fetch('/api/trades/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tradeData)
      });

      const data = await res.json();
      
      if (res.ok) {
        alert('Scambio proposto con successo!');
        setActiveTab('list');
        fetchTrades();
      } else {
        alert(data.error || 'Errore nella creazione del trade');
      }
    } catch (error) {
      console.error('Errore:', error);
      alert('Errore nella creazione del trade');
    } finally {
      setLoading(false);
    }
  };

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
        fetchTrades();
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

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Scambi {isGlobal ? 'Globali' : 'Locali'}
        </h1>
        <p className="text-gray-600">
          {isGlobal 
            ? 'Scambia giocatori con squadre di tutti i campionati'
            : `Scambia giocatori solo con squadre del campionato ${currentTeam.girone}`
          }
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('create')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'create'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Proponi Scambio
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'list'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            I Miei Scambi
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'create' && (
        <TradeForm
          isGlobal={isGlobal}
          currentTeam={currentTeam}
          onSubmit={handleCreateTrade}
          loading={loading}
        />
      )}

      {activeTab === 'list' && (
        <TradesList
          trades={trades}
          currentTeamId={currentTeam.id}
          onTradeAction={handleTradeAction}
          loading={loading}
        />
      )}
    </div>
  );
}