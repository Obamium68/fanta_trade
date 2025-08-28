//components/trades/TradeForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { Player, RolePlayer, Team } from '@prisma/client';

interface TradeFormProps {
  isGlobal: boolean;
  currentTeam: Team;
  onSubmit: (trade: MultiTradeData) => void;
  loading: boolean;
}

interface MultiTradeData {
  toTeamId: number;
  playersFrom: number[];
  playersTo: number[];
  credits: number;
}

interface PlayerWithRole extends Player {
  role: RolePlayer;
}

export default function TradeForm({ isGlobal, currentTeam, onSubmit, loading }: TradeFormProps) {
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [myPlayers, setMyPlayers] = useState<PlayerWithRole[]>([]);
  const [targetPlayers, setTargetPlayers] = useState<PlayerWithRole[]>([]);
  
  const [selectedToTeam, setSelectedToTeam] = useState<number>(0);
  const [selectedPlayersFrom, setSelectedPlayersFrom] = useState<number[]>([]);
  const [selectedPlayersTo, setSelectedPlayersTo] = useState<number[]>([]);
  const [credits, setCredits] = useState<number>(0);

  // Carica team disponibili
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const type = isGlobal ? 'global' : 'local';
        const res = await fetch(`/api/trades/available-teams?type=${type}`);
        const data = await res.json();
        if (res.ok) {
          setAvailableTeams(data.teams);
        }
      } catch (error) {
        console.error('Errore nel caricamento team:', error);
      }
    };
    fetchTeams();
  }, [isGlobal]);

  // Carica i miei giocatori
  useEffect(() => {
    const fetchMyPlayers = async () => {
      try {
        const res = await fetch(`/api/trades/available-players?teamId=${currentTeam.id}`);
        const data = await res.json();
        if (res.ok) {
          setMyPlayers(data.players);
        }
      } catch (error) {
        console.error('Errore nel caricamento giocatori:', error);
      }
    };
    fetchMyPlayers();
  }, [currentTeam.id]);

  // Carica giocatori del team target
  useEffect(() => {
    if (selectedToTeam) {
      const fetchTargetPlayers = async () => {
        try {
          const res = await fetch(`/api/trades/available-players?teamId=${selectedToTeam}`);
          const data = await res.json();
          if (res.ok) {
            let filteredPlayers = data.players;
            
            // Per scambi globali, rimuovi gli stessi giocatori se presenti
            if (isGlobal && selectedPlayersFrom.length > 0) {
              const mySelectedPlayers = myPlayers.filter(p => selectedPlayersFrom.includes(p.id));
              const myPlayerIds = mySelectedPlayers.map(p => p.id);
              filteredPlayers = data.players.filter((p: Player) => !myPlayerIds.includes(p.id));
            }
            
            setTargetPlayers(filteredPlayers);
          }
        } catch (error) {
          console.error('Errore nel caricamento giocatori target:', error);
        }
      };
      fetchTargetPlayers();
    } else {
      setTargetPlayers([]);
    }
  }, [selectedToTeam, isGlobal, selectedPlayersFrom, myPlayers]);

  const handlePlayerFromToggle = (playerId: number) => {
    setSelectedPlayersFrom(prev => 
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const handlePlayerToToggle = (playerId: number) => {
    setSelectedPlayersTo(prev => 
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const validateRoleBalance = () => {
    const fromPlayers = myPlayers.filter(p => selectedPlayersFrom.includes(p.id));
    const toPlayers = targetPlayers.filter(p => selectedPlayersTo.includes(p.id));

    if (fromPlayers.length !== toPlayers.length) {
      return 'Il numero di giocatori ceduti deve essere uguale a quello ricevuto';
    }

    // Conta per ruolo
    const fromRoles = fromPlayers.reduce((acc, player) => {
      acc[player.role] = (acc[player.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const toRoles = toPlayers.reduce((acc, player) => {
      acc[player.role] = (acc[player.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Verifica bilanciamento per ruolo
    const allRoles = new Set([...Object.keys(fromRoles), ...Object.keys(toRoles)]);
    
    for (const role of allRoles) {
      if ((fromRoles[role] || 0) !== (toRoles[role] || 0)) {
        return `Devi scambiare lo stesso numero di giocatori per ruolo. Ruolo sbilanciato: ${role}`;
      }
    }

    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedToTeam) {
      alert('Seleziona il team destinazione');
      return;
    }

    if (selectedPlayersFrom.length === 0 || selectedPlayersTo.length === 0) {
      alert('Seleziona almeno un giocatore per ogni squadra');
      return;
    }

    const validationError = validateRoleBalance();
    if (validationError) {
      alert(validationError);
      return;
    }

    if (credits < 0 || credits > currentTeam.credits) {
      alert('Crediti non validi');
      return;
    }

    onSubmit({
      toTeamId: selectedToTeam,
      playersFrom: selectedPlayersFrom,
      playersTo: selectedPlayersTo,
      credits
    });
  };

  const groupPlayersByRole = (players: PlayerWithRole[]) => {
    return players.reduce((acc, player) => {
      if (!acc[player.role]) acc[player.role] = [];
      acc[player.role].push(player);
      return acc;
    }, {} as Record<string, PlayerWithRole[]>);
  };

  const selectedFromPlayers = myPlayers.filter(p => selectedPlayersFrom.includes(p.id));
  const selectedToPlayers = targetPlayers.filter(p => selectedPlayersTo.includes(p.id));

  const roles = [
    { value: 'PORTIERE', label: 'Portiere' },
    { value: 'DIFENSORE', label: 'Difensore' },
    { value: 'CENTROCAMPISTA', label: 'Centrocampista' },
    { value: 'ATTACCANTE', label: 'Attaccante' }
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">
        Proponi Scambio {isGlobal ? 'Globale' : 'Locale'}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Team Destinazione */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Team destinazione
          </label>
          <select
            value={selectedToTeam}
            onChange={(e) => {
              setSelectedToTeam(Number(e.target.value));
              setSelectedPlayersTo([]);
            }}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Seleziona team</option>
            {availableTeams.map(team => (
              <option key={team.id} value={team.id}>
                {team.name} ({team.girone})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* I tuoi giocatori */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">
              I tuoi giocatori ({selectedPlayersFrom.length} selezionati)
            </h4>
            <div className="space-y-3 max-h-64 overflow-y-auto border rounded-md p-3">
              {Object.entries(groupPlayersByRole(myPlayers)).map(([role, players]) => (
                <div key={role}>
                  <h5 className="text-sm font-medium text-gray-700 mb-1">
                    {roles.find(r => r.value === role)?.label} ({players.filter(p => selectedPlayersFrom.includes(p.id)).length})
                  </h5>
                  {players.map(player => (
                    <label key={player.id} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedPlayersFrom.includes(player.id)}
                        onChange={() => handlePlayerFromToggle(player.id)}
                        className="rounded border-gray-300"
                      />
                      <span className={selectedPlayersFrom.includes(player.id) ? 'font-medium' : ''}>
                        {player.lastname} ({player.realteam}) - {player.value}
                      </span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Giocatori del team target */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">
              Giocatori richiesti ({selectedPlayersTo.length} selezionati)
            </h4>
            {!selectedToTeam ? (
              <p className="text-gray-500 text-sm">Seleziona prima un team</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto border rounded-md p-3">
                {Object.entries(groupPlayersByRole(targetPlayers)).map(([role, players]) => (
                  <div key={role}>
                    <h5 className="text-sm font-medium text-gray-700 mb-1">
                      {roles.find(r => r.value === role)?.label} ({players.filter(p => selectedPlayersTo.includes(p.id)).length})
                    </h5>
                    {players.map(player => (
                      <label key={player.id} className="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedPlayersTo.includes(player.id)}
                          onChange={() => handlePlayerToToggle(player.id)}
                          className="rounded border-gray-300"
                        />
                        <span className={selectedPlayersTo.includes(player.id) ? 'font-medium' : ''}>
                          {player.lastname} ({player.realteam}) - {player.value}
                        </span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Riepilogo selezioni */}
        {(selectedFromPlayers.length > 0 || selectedToPlayers.length > 0) && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h5 className="font-medium text-gray-900 mb-2">Riepilogo Scambio</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Cedi ({selectedFromPlayers.length}):</span>
                <ul className="mt-1 space-y-1">
                  {selectedFromPlayers.map(player => (
                    <li key={player.id} className="text-red-700">
                      • {player.lastname} - {player.value}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 font-medium">
                  Valore totale ceduto: {selectedFromPlayers.reduce((sum, p) => sum + p.value, 0)}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Ricevi ({selectedToPlayers.length}):</span>
                <ul className="mt-1 space-y-1">
                  {selectedToPlayers.map(player => (
                    <li key={player.id} className="text-green-700">
                      • {player.lastname} - {player.value}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 font-medium">
                  Valore totale ricevuto: {selectedToPlayers.reduce((sum, p) => sum + p.value, 0)}
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t">
              <span className="text-gray-600">Differenza di valore:</span>
              <span className={`ml-2 font-medium ${
                selectedToPlayers.reduce((sum, p) => sum + p.value, 0) > selectedFromPlayers.reduce((sum, p) => sum + p.value, 0)
                  ? 'text-green-600' : 'text-red-600'
              }`}>
                {selectedToPlayers.reduce((sum, p) => sum + p.value, 0) - selectedFromPlayers.reduce((sum, p) => sum + p.value, 0) > 0 ? '+' : ''}
                {selectedToPlayers.reduce((sum, p) => sum + p.value, 0) - selectedFromPlayers.reduce((sum, p) => sum + p.value, 0)}
              </span>
            </div>
          </div>
        )}

        {/* Crediti */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Crediti aggiuntivi (opzionale)
          </label>
          <input
            type="number"
            value={credits}
            onChange={(e) => setCredits(Number(e.target.value))}
            min="0"
            max={currentTeam.credits}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-sm text-gray-500 mt-1">
            Crediti disponibili: {currentTeam.credits}
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || selectedPlayersFrom.length === 0 || selectedPlayersTo.length === 0}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {loading ? 'Invio in corso...' : 'Proponi Scambio '}
        </button>
      </form>
    </div>
  );
}