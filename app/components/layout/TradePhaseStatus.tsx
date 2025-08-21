'use client';

import { useState, useEffect } from 'react';

interface TradePhase {
  id: number;
  startTime: string | null;
  endTime: string | null;
  status: 'OPEN' | 'CLOSED';
}

interface TradePhaseStatusProps {
  onPhaseChange?: (isOpen: boolean) => void;
}

export default function TradePhaseStatus({ onPhaseChange }: TradePhaseStatusProps) {
  const [phaseStatus, setPhaseStatus] = useState<{
    isOpen: boolean;
    message: string;
    phase: TradePhase | null;
  }>({ isOpen: false, message: 'Caricamento...', phase: null });

  useEffect(() => {
    const fetchPhaseStatus = async () => {
      try {
        const res = await fetch('/api/trades/phase');
        const data = await res.json();
        setPhaseStatus(data);
        onPhaseChange?.(data.isOpen);
      } catch (error) {
        console.error('Errore nel caricamento stato fasi:', error);
        setPhaseStatus({
          isOpen: false,
          message: 'Errore nel caricamento dello stato',
          phase: null
        });
      }
    };

    fetchPhaseStatus();
    
    // Aggiorna ogni minuto
    const interval = setInterval(fetchPhaseStatus, 60000);
    return () => clearInterval(interval);
  }, [onPhaseChange]);

  const getStatusColor = () => {
    if (phaseStatus.isOpen) return 'bg-green-100 text-green-800 border-green-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getStatusIcon = () => {
    if (phaseStatus.isOpen) return '🟢';
    return '🔴';
  };

  return (
    <div className={`p-4 rounded-lg border ${getStatusColor()}`}>
      <div className="flex items-center space-x-2">
        <span className="text-lg">{getStatusIcon()}</span>
        <div>
          <h3 className="font-medium">
            Stato Scambi: {phaseStatus.isOpen ? 'APERTO' : 'CHIUSO'}
          </h3>
          <p className="text-sm">{phaseStatus.message}</p>
          {phaseStatus.phase?.endTime && phaseStatus.isOpen && (
            <p className="text-xs mt-1">
              Chiusura: {new Date(phaseStatus.phase.endTime).toLocaleString('it-IT')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
