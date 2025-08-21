'use client';

import { useState, useEffect } from 'react';
import { Player, Team } from '@prisma/client';

interface TradeFormProps {
  isGlobal: boolean;
  currentTeam: Team;
  onSubmit: (trade: TradeData) => void;
  loading: boolean;
}

interface TradeData {
  toTeamId: number;
  playerFromId: number;
  playerToId: number;
  credits: number;
}

export default function TradeForm({ isGlobal, currentTeam, onSubmit, loading }: TradeFormProps) {
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [myPlayers, setMyPlayers] = useState<Player[]>([]);
  const [targetPlayers, setTargetPlayers] = useState<Player[]>([]);
  
  const [selectedToTeam, setSelectedToTeam] = useState<number>(0);
  const [selectedPlayerFrom, setSelectedPlayerFrom] = useState<number>(0);
  const [selectedPlayerTo, setSelectedPlayerTo] = useState<number>(0);
  const [credits, setCredits] = useState<number>(0);
  const [selectedRole, setSelectedRole] = useState<string>('');

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

  // Carica i miei giocatori quando cambia il ruolo
  useEffect(() => {
    const fetchMyPlayers = async () => {
      try {
        const roleParam = selectedRole ? `&role=${selectedRole}` : '';
        const res = await fetch(`/api/trades/available-players?teamId=${currentTeam.id}${roleParam}`);
        const data = await res.json();
        if (res.ok) {
          setMyPlayers(data.players);
        }
      } catch (error) {
        console.error('Errore nel caricamento giocatori:', error);
      }
    };
    fetchMyPlayers();
  }, [currentTeam.id, selectedRole]);

  // Carica giocatori del team target
  useEffect(() => {
    if (selectedToTeam && selectedRole) {
      const fetchTargetPlayers = async () => {
        try {
          const res = await fetch(`/api/trades/available-players?teamId=${selectedToTeam}&role=${selectedRole}`);
          const data = await res.json();
          if (res.ok) {
            let filteredPlayers = data.players;
            
            // Per scambi globali, rimuovi lo stesso giocatore se presente
            if (isGlobal && selectedPlayerFrom) {
              const myPlayer = myPlayers.find(p => p.id === selectedPlayerFrom);
              if (myPlayer) {
                filteredPlayers = data.players.filter((p: Player) => p.id !== myPlayer.id);
              }
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
  }, [selectedToTeam, selectedRole, isGlobal, selectedPlayerFrom, myPlayers]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedToTeam || !selectedPlayerFrom || !selectedPlayerTo) {
      alert('Seleziona tutti i campi obbligatori');
      return;
    }

    if (credits < 0 || credits > currentTeam.credits) {
      alert('Crediti non validi');
      return;
    }

    onSubmit({
      toTeamId: selectedToTeam,
      playerFromId: selectedPlayerFrom,
      playerToId: selectedPlayerTo,
      credits
    });
  };

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
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Selezione Ruolo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ruolo
          </label>
          <select
            value={selectedRole}
            onChange={(e) => {
              setSelectedRole(e.target.value);
              setSelectedPlayerFrom(0);
              setSelectedPlayerTo(0);
            }}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Seleziona ruolo</option>
            {roles.map(role => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </div>

        {/* Team Destinazione */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Team destinazione
          </label>
          <select
            value={selectedToTeam}
            onChange={(e) => {
              setSelectedToTeam(Number(e.target.value));
              setSelectedPlayerTo(0);
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

        {/* Mio Giocatore */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Il tuo giocatore
          </label>
          <select
            value={selectedPlayerFrom}
            onChange={(e) => setSelectedPlayerFrom(Number(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            required
            disabled={!selectedRole}
          >
            <option value="">Seleziona giocatore</option>
            {myPlayers.map(player => (
              <option key={player.id} value={player.id}>
                {player.lastname} ({player.realteam}) - Valore: {player.value}
              </option>
            ))}
          </select>
        </div>

        {/* Giocatore Target */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Giocatore richiesto
          </label>
          <select
            value={selectedPlayerTo}
            onChange={(e) => setSelectedPlayerTo(Number(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            required
            disabled={!selectedToTeam || !selectedRole}
          >
            <option value="">Seleziona giocatore</option>
            {targetPlayers.map(player => (
              <option key={player.id} value={player.id}>
                {player.lastname} ({player.realteam}) - Valore: {player.value}
              </option>
            ))}
          </select>
        </div>

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
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Invio in corso...' : 'Proponi Scambio'}
        </button>
      </form>
    </div>
  );
}