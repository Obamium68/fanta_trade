'use client';

import { useState, useEffect } from 'react';

export default function TradeNotifications() {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetchPendingTrades = async () => {
      try {
        const res = await fetch('/api/trades');
        if (res.ok) {
          const data = await res.json();
          const pending = data.trades.filter((trade: any) => 
            trade.status === 'PENDING' && trade.toTeamId === data.currentTeamId
          ).length;
          setPendingCount(pending);
        }
      } catch (error) {
        console.error('Errore nel caricamento trade pending:', error);
      }
    };

    fetchPendingTrades();
    
    // Aggiorna ogni 30 secondi
    const interval = setInterval(fetchPendingTrades, 30000);
    return () => clearInterval(interval);
  }, []);

  if (pendingCount === 0) return null;

  return (
    <div className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
      <div className="flex items-center space-x-2">
        <span className="animate-pulse">🔔</span>
        <span className="font-medium">
          {pendingCount} scambi in attesa di risposta
        </span>
      </div>
    </div>
  );
}