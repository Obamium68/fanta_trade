"use client"
import { useEffect, useState } from 'react';
import { RolePlayer, Player, Team, PlayersResponse } from '@/app/lib/types/teams';

interface AdminRosterPageProps {
  teamId: number;
}

interface RosterStats {
  totalPlayers: number;
  totalValue: number;
  byRole: {
    PORTIERE: number;
    DIFENSORE: number;
    CENTROCAMPISTA: number;
    ATTACCANTE: number;
  };
}

interface RosterData {
  success: boolean;
  team: Team;
  players: Player[];
  stats: RosterStats;
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
  PORTIERE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  DIFENSORE: 'bg-blue-100 text-blue-800 border-blue-200',
  CENTROCAMPISTA: 'bg-green-100 text-green-800 border-green-200',
  ATTACCANTE: 'bg-red-100 text-red-800 border-red-200'
};

export default function AdminRosterPage({ teamId }: AdminRosterPageProps) {
  // States per la rosa
  const [rosterData, setRosterData] = useState<RosterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // States per la ricerca giocatori
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<RolePlayer | ''>('');
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // State per azioni
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    fetchRosterData();
  }, [teamId]);

  useEffect(() => {
  if (!showAddPlayer) return;
  
  // Cerca solo se:
  // - Non c'è searchTerm (mostra tutti)
  // - searchTerm ha almeno 2 caratteri
  // - È cambiato selectedRole
  if (!searchTerm || searchTerm.length >= 2) {
    const timeoutId = setTimeout(() => {
      searchPlayers();
    }, searchTerm ? 500 : 0);

    return () => clearTimeout(timeoutId);
  }
}, [showAddPlayer, searchTerm, selectedRole]);

// Aggiungi feedback visivo nell'input
<input
  type="text"
  placeholder="Cerca per cognome (min 2 caratteri)..."
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
    searchTerm && searchTerm.length < 2 
      ? 'border-yellow-300 bg-yellow-50' 
      : 'border-gray-300'
  }`}
/>
{searchTerm && searchTerm.length < 2 && (
  <p className="text-sm text-yellow-600 mt-1">
    Inserisci almeno 2 caratteri per cercare
  </p>
)}

  const fetchRosterData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/admin/teams/${teamId}/roster`);
      
      if (response.ok) {
        const data = await response.json();
        setRosterData(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Errore nel caricamento della rosa');
      }
    } catch (error) {
      console.error('Error fetching roster:', error);
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  const searchPlayers = async () => {
    try {
      setSearchLoading(true);
      
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (selectedRole) params.set('role', selectedRole);
      params.set('limit', '20');
      
      const response = await fetch(`/api/players?${params}`);
      
      if (response.ok) {
        const data: PlayersResponse = await response.json();
        // Filtra i giocatori già nella rosa
        const currentPlayerIds = rosterData?.players.map(p => p.id) || [];
        const filteredPlayers = data.players.filter((p: { id: any; }) => !currentPlayerIds.includes(p.id));
        setAvailablePlayers(filteredPlayers);
      }
    } catch (error) {
      console.error('Error searching players:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const addPlayerToRoster = async (playerId: number) => {
    try {
      setActionLoading(playerId);
      
      const response = await fetch(`/api/admin/teams/${teamId}/roster`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playerId }),
      });

      if (response.ok) {
        await fetchRosterData(); // Ricarica la rosa
        setAvailablePlayers(prev => prev.filter(p => p.id !== playerId));
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Errore nell\'aggiunta del giocatore');
      }
    } catch (error) {
      console.error('Error adding player:', error);
      alert('Errore di connessione');
    } finally {
      setActionLoading(null);
    }
  };

  const removePlayerFromRoster = async (playerId: number) => {
    if (!confirm('Sei sicuro di voler rimuovere questo giocatore dalla rosa?')) {
      return;
    }

    try {
      setActionLoading(playerId);
      
      const response = await fetch(`/api/admin/teams/${teamId}/roster?playerId=${playerId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchRosterData(); // Ricarica la rosa
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Errore nella rimozione del giocatore');
      }
    } catch (error) {
      console.error('Error removing player:', error);
      alert('Errore di connessione');
    } finally {
      setActionLoading(null);
    }
  };

  const getPlayersByRole = (role: RolePlayer): Player[] => {
    if (!rosterData) return [];
    return rosterData.players.filter(player => player.role === role);
  };

  if (loading) {
    return (
      <div className="bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-xl">Caricamento rosa...</span>
        </div>
      </div>
    );
  }

  if (error || !rosterData) {
    return (
      <div className="bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ {error}</div>
          <button
            onClick={fetchRosterData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Riprova
          </button>
        </div>
      </div>
    );
  }

  const { team, players, stats } = rosterData;

  return (
    <div className="bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Gestione Rosa - {team.name}
              </h1>
              <p className="text-gray-600 mt-1">
                Campionato {team.girone} • {stats.totalPlayers}/25 giocatori • {stats.totalValue} valore totale
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowAddPlayer(!showAddPlayer)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  showAddPlayer 
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {showAddPlayer ? 'Chiudi Ricerca' : '+ Aggiungi Giocatore'}
              </button>
              <button
                onClick={fetchRosterData}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                🔄 Ricarica
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Pannello Aggiungi Giocatore */}
        {showAddPlayer && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">🔍 Cerca Giocatori</h3>
            
            <div className="flex space-x-4 mb-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Cerca per cognome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as RolePlayer | '')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Tutti i ruoli</option>
                  {Object.entries(roleNames).map(([role, name]) => (
                    <option key={role} value={role}>{name}</option>
                  ))}
                </select>
              </div>
            </div>

            {searchLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {availablePlayers.map((player) => (
                  <div key={player.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900">{player.lastname}</h4>
                      <span className={`text-xs px-2 py-1 rounded border ${roleColors[player.role]}`}>
                        {player.role}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mb-3">
                      <div>🏟️ {player.realteam}</div>
                      <div className="flex justify-between items-center">
                        <span>💰 {player.value}</span>
                        <span>#{player.id}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => addPlayerToRoster(player.id)}
                      disabled={actionLoading === player.id}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2 px-3 rounded text-sm font-medium transition-colors"
                    >
                      {actionLoading === player.id ? '⏳ Aggiungendo...' : '+ Aggiungi'}
                    </button>
                  </div>
                ))}
                {availablePlayers.length === 0 && !searchLoading && (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    Nessun giocatore trovato
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Statistiche Rosa */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Object.entries(roleNames).map(([role, name]) => (
            <div key={role} className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-600">{name}</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {stats.byRole[role as RolePlayer]}
                  </div>
                </div>
                <div className="text-3xl">{roleIcons[role as RolePlayer]}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Rosa per Ruoli */}
        {players.length > 0 ? (
          <div className="space-y-6">
            {Object.values(RolePlayer).map(role => {
              const rolePlayers = getPlayersByRole(role);
              if (rolePlayers.length === 0) return null;

              return (
                <div key={role} className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <span className="text-2xl mr-3">{roleIcons[role]}</span>
                    {roleNames[role]} ({rolePlayers.length})
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rolePlayers.map((player) => (
                      <div key={player.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-medium text-gray-900">{player.lastname}</h4>
                          <div className="flex flex-col items-end space-y-1">
                            <span className={`text-xs px-2 py-1 rounded border ${roleColors[player.role]}`}>
                              #{player.id}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-4 space-y-1">
                          <div className="flex justify-between">
                            <span>🏟️ {player.realteam}</span>
                            <span className="font-semibold text-green-600">{player.value}</span>
                          </div>
                          {player.teamsCount > 1 && (
                            <div className="text-xs text-orange-600">
                              Posseduto da {player.teamsCount} squadre
                            </div>
                          )}
                        </div>
                        
                        <button
                          onClick={() => removePlayerFromRoster(player.id)}
                          disabled={actionLoading === player.id}
                          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white py-2 px-3 rounded text-sm font-medium transition-colors"
                        >
                          {actionLoading === player.id ? '⏳ Rimuovendo...' : '🗑️ Rimuovi'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">⚽</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Rosa Vuota</h3>
            <p className="text-gray-600 mb-6">Questa squadra non ha ancora giocatori nella rosa</p>
            <button
              onClick={() => setShowAddPlayer(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              + Aggiungi Primo Giocatore
            </button>
          </div>
        )}
      </div>
    </div>
  );
}