import { useEffect, useState } from 'react';
import { RolePlayer, Player, RosterResponse } from '@/app/lib/types/teams';

interface TeamRosterProps {
  teamId?: number;
}

const roleIcons = {
  PORTIERE: '🥅',
  DIFENSORE: '🛡️', 
  CENTROCAMPISTA: '⚽',
  ATTACCANTE: '🎯'
};

const roleNames = {
  PORTIERE: 'Portieri',
  DIFENSORE: 'Difensori',
  CENTROCAMPISTA: 'Centrocampisti', 
  ATTACCANTE: 'Attaccanti'
};

const roleColors = {
  PORTIERE: 'bg-yellow-100 text-yellow-800',
  DIFENSORE: 'bg-blue-100 text-blue-800',
  CENTROCAMPISTA: 'bg-green-100 text-green-800',
  ATTACCANTE: 'bg-red-100 text-red-800'
};

const roleOrder = [RolePlayer.PORTIERE, RolePlayer.DIFENSORE, RolePlayer.CENTROCAMPISTA, RolePlayer.ATTACCANTE];

export default function TeamRoster({ teamId }: TeamRosterProps) {
  const [rosterData, setRosterData] = useState<RosterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRosterData();
  }, [teamId]);

  const fetchRosterData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const endpoint ='/api/auth/my-roster';
      
      const response = await fetch(endpoint);
      
      if (response.ok) {
        const data: RosterResponse = await response.json();
        setRosterData(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Errore nel caricamento della rosa');
      }
    } catch (error) {
      console.error('Error fetching roster data:', error);
      setError('Errore di connessione al server');
    } finally {
      setLoading(false);
    }
  };

  const getPlayersByRole = (role: RolePlayer): Player[] => {
    if (!rosterData) return [];
    return rosterData.players.filter(player => player.role === role);
  };

  if (loading) {
    return (
      <div className="mt-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-center h-32">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-gray-500">Caricamento rosa...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <div className="text-red-600 mb-2">⚠️ {error}</div>
                <button
                  onClick={fetchRosterData}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Riprova
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!rosterData) {
    return null;
  }

  const { players, stats } = rosterData;

  return (
    <div className="mt-8">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Rosa della Squadra
            </h3>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Valore: €{stats.totalValue}</span>
              <span className="ml-4">Giocatori: {stats.totalPlayers}/25</span>
            </div>
          </div>

          {/* Formation Summary */}
          <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {roleOrder.map(role => (
              <div key={role} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-1">{roleIcons[role]}</div>
                <div className="text-sm font-medium text-gray-900">
                  {roleNames[role]}
                </div>
                <div className="text-lg font-bold text-blue-600">
                  {stats.byRole[role]}
                </div>
              </div>
            ))}
          </div>

          {/* Players by Role */}
          {players.length > 0 ? (
            <div className="space-y-8">
              {roleOrder.map(role => {
                const rolePlayers = getPlayersByRole(role);
                
                if (rolePlayers.length === 0) return null;

                return (
                  <div key={role}>
                    <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                      <span className="text-xl mr-2">{roleIcons[role]}</span>
                      {roleNames[role]} ({rolePlayers.length})
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {rolePlayers.map((player) => (
                        <div 
                          key={player.id} 
                          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <h5 className="font-medium text-gray-900 text-sm">
                              {player.lastname}
                            </h5>
                            <div className="flex flex-col items-end space-y-1">
                              <span className={`text-xs px-2 py-1 rounded ${roleColors[player.role]}`}>
                                {player.role}
                              </span>
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                #{player.id}
                              </span>
                            </div>
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">🏟️ {player.realteam}</span>
                              <span className="font-semibold text-green-600">€{player.value}</span>
                            </div>
                            
                            {player.teamsCount > 1 && (
                              <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                                Posseduto da {player.teamsCount} squadre
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">⚽</div>
              <div className="text-gray-500 text-lg mb-2">Nessun giocatore nella rosa</div>
              <div className="text-gray-400 text-sm">
                La squadra non ha ancora acquisito giocatori
              </div>
            </div>
          )}

          {/* Footer con statistiche aggiuntive */}
          {players.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-blue-50 p-3 rounded">
                  <div className="text-sm text-gray-600">Valore Medio</div>
                  <div className="text-lg font-semibold text-blue-600">
                    €{Math.round(stats.totalValue / stats.totalPlayers)}
                  </div>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <div className="text-sm text-gray-600">Più Costoso</div>
                  <div className="text-lg font-semibold text-green-600">
                    €{Math.max(...players.map(p => p.value))}
                  </div>
                </div>
                <div className="bg-purple-50 p-3 rounded">
                  <div className="text-sm text-gray-600">Più Economico</div>
                  <div className="text-lg font-semibold text-purple-600">
                    €{Math.min(...players.map(p => p.value))}
                  </div>
                </div>
                <div className="bg-orange-50 p-3 rounded">
                  <div className="text-sm text-gray-600">Posti Liberi</div>
                  <div className="text-lg font-semibold text-orange-600">
                    {25 - stats.totalPlayers}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}