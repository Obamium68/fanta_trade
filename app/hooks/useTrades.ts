'use client';

import { useState, useEffect, useCallback } from 'react';

interface Trade {
  id: number;
  status: string;
  fromTeamId: number;
  toTeamId: number;
  playerFrom: any;
  playerTo: any;
  fromTeam: any;
  toTeam: any;
  credits: number;
  createdAt: string;
  logs?: any[];
}

interface UseTradesReturn {
  trades: Trade[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  createTrade: (tradeData: any) => Promise<boolean>;
  updateTrade: (tradeId: number, action: 'accept' | 'reject') => Promise<boolean>;
}

export function useTrades(currentTeamId?: number): UseTradesReturn {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrades = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/trades');
      
      if (res.ok) {
        const data = await res.json();
        setTrades(data.trades);
        setError(null);
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Errore nel caricamento trade');
      }
    } catch (err) {
      setError('Errore di rete');
      console.error('Fetch trades error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  const createTrade = async (tradeData: any): Promise<boolean> => {
    try {
      const res = await fetch('/api/trades/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tradeData)
      });

      if (res.ok) {
        await fetchTrades(); // Refresh della lista
        return true;
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Errore nella creazione del trade');
        return false;
      }
    } catch (err) {
      setError('Errore di rete');
      console.error('Create trade error:', err);
      return false;
    }
  };

  const updateTrade = async (tradeId: number, action: 'accept' | 'reject'): Promise<boolean> => {
    try {
      const res = await fetch(`/api/trades/${tradeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (res.ok) {
        await fetchTrades(); // Refresh della lista
        return true;
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Errore nell\'aggiornamento del trade');
        return false;
      }
    } catch (err) {
      setError('Errore di rete');
      console.error('Update trade error:', err);
      return false;
    }
  };

  return {
    trades,
    loading,
    error,
    refetch: fetchTrades,
    createTrade,
    updateTrade
  };
}