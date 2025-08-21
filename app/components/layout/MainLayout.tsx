// app/components/layout/MainLayout.tsx - Layout principale per le pagine autenticate
'use client';

import { useState, useEffect } from 'react';
import { Team } from '@prisma/client';
import TradeNavigation from './TradeNavigation';
import TradePhaseStatus from './TradePhaseStatus';
import TradeNotifications from './TradeNotifications';
import Link from 'next/link';

interface MainLayoutProps {
  children: React.ReactNode;
  showTradeNavigation?: boolean;
  currentTeam?: Team;
}

export default function MainLayout({ 
  children, 
  showTradeNavigation = false,
  currentTeam 
}: MainLayoutProps) {
  const [tradePhaseOpen, setTradePhaseOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Gestione Fantacalcio
              </h1>
              {currentTeam && (
                <p className="text-sm text-gray-600">
                  {currentTeam.name} - Girone {currentTeam.girone} - Crediti: {currentTeam.credits}
                </p>
              )}
            </div>
            
            {/* Quick actions */}
            <div className="flex items-center space-x-4">
              <Link href="/team" className="text-gray-600 hover:text-gray-900">
                La Mia Squadra
              </Link>
              <Link href="/logout" className="text-red-600 hover:text-red-800">
                Logout
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Trade Phase Status */}
      {showTradeNavigation && (
        <div className="max-w-6xl mx-auto px-4 py-4">
          <TradePhaseStatus onPhaseChange={setTradePhaseOpen} />
        </div>
      )}

      {/* Trade Navigation */}
      {showTradeNavigation && <TradeNavigation />}

      {/* Content */}
      <main className={`${!tradePhaseOpen && showTradeNavigation ? 'opacity-50 pointer-events-none' : ''}`}>
        {children}
      </main>

      {/* Notifications */}
      <TradeNotifications />

      {/* Phase closed overlay */}
      {!tradePhaseOpen && showTradeNavigation && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-40 pointer-events-none">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Scambi Temporaneamente Chiusi
            </h3>
            <p className="text-gray-600">
              Le funzioni di scambio sono attualmente disabilitate. 
              Controlla lo stato sopra per maggiori informazioni.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
