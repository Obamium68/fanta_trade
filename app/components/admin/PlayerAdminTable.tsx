"use client"
import { PlayerWithEditing, PlayerResponse, PlayerUpdateRequest, PlayerUpdateResponse, PlayerRole } from '@/app/lib/types/players';
import { Player } from '@prisma/client';
import { useState, useEffect } from 'react';
import { FaEdit, FaSave, FaTimes, FaEye, FaTrash, FaSpinner } from 'react-icons/fa';

export default function PlayerAdminTable() {
    const [players, setPlayers] = useState<PlayerWithEditing[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [savingId, setSavingId] = useState<number | null>(null);

    useEffect(() => { fetchPlayers(); }, []);

    const fetchPlayers = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/players');
            if (!response.ok) throw new Error('Errore nel caricamento dei giocatori');

            const data: PlayerResponse = await response.json();
            setPlayers(data.players.map(p => ({ 
                ...p, 
                isEditing: false, 
                originalData: { ...p } 
            })));
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Errore sconosciuto');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (id: number) => {
        setPlayers(players.map(p => 
            p.id === id 
                ? { ...p, isEditing: true, originalData: { ...p } } 
                : { ...p, isEditing: false }
        ));
    };

    const handleSave = async (id: number) => {
        try {
            setSavingId(id);
            const player = players.find(p => p.id === id);
            if (!player) throw new Error('Giocatore non trovato');

            // Usa PATCH per aggiornare solo il valore
            const updateData: PlayerUpdateRequest = {
                value: player.value
            };
            
            const response = await fetch(`/api/players/${id}`, {
                method: 'PATCH', // Cambiato da PUT a PATCH
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Errore nel salvataggio');
            }

            const result: PlayerUpdateResponse = await response.json();
            
            // Aggiorna il player nella lista mantenendo le proprietà di editing
            setPlayers(players.map(p => 
                p.id === id 
                    ? { 
                        ...result.player, 
                        isEditing: false, 
                        originalData: result.player 
                    } 
                    : p
            ));
            
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Errore sconosciuto');
            // Ripristina i dati originali in caso di errore
            handleCancel(id);
        } finally {
            setSavingId(null);
        }
    };

    const handleCancel = (id: number) => {
        setPlayers(players.map(p => 
            p.id === id 
                ? { 
                    ...p.originalData, 
                    isEditing: false, 
                    originalData: p.originalData 
                } 
                : p
        ));
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Eliminare questo giocatore?')) return;
        
        try {
            const res = await fetch(`/api/players/${id}`, { 
                method: 'DELETE' 
            });
            
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Errore nell\'eliminazione');
            }
            
            // Rimuovi il player dalla lista
            setPlayers(players.filter(p => p.id !== id));
            
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Errore sconosciuto');
        }
    };

    const handleInputChange = (id: number, field: keyof Player, value: string | number) => {
        setPlayers(players.map(p => 
            p.id === id ? { ...p, [field]: value } : p
        ));
    };

    // Mostra messaggio di errore se presente
    const ErrorMessage = () => {
        if (!error) return null;
        
        return (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                <div className="flex justify-between items-center">
                    <span>{error}</span>
                    <button 
                        onClick={() => setError(null)}
                        className="text-red-700 hover:text-red-900"
                    >
                        ×
                    </button>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <FaSpinner className="animate-spin text-4xl text-blue-500" />
                <span className="ml-2 text-xl">Caricamento giocatori...</span>
            </div>
        );
    }

    return (
        <div className="text-gray-900 h-fit bg-gray-50">
            {/* Header */}
            <div className="p-4 flex justify-between items-center bg-white shadow-sm">
                <h1 className="text-3xl font-bold text-gray-800">Gestione Giocatori</h1>
                <div className="flex gap-2">
                    <span className="text-sm text-gray-600 self-center">
                        Totale: {players.length} giocatori
                    </span>
                    <button 
                        onClick={fetchPlayers} 
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                        disabled={loading}
                    >
                        <span>🔄</span> 
                        Aggiorna
                    </button>
                </div>
            </div>

            <div className="p-4">
                <ErrorMessage />

                {/* Table Container */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <div className="max-h-[600px] overflow-y-auto">
                            <table className="w-full text-md">
                                <thead className="sticky top-0 bg-gray-100 z-10">
                                    <tr className="border-b border-gray-200">
                                        <th className="p-3 px-5 text-left font-semibold">ID</th>
                                        <th className="p-3 px-5 text-left font-semibold">Nome</th>
                                        <th className="p-3 px-5 text-left font-semibold">Squadra Reale</th>
                                        <th className="p-3 px-5 text-left font-semibold">Ruolo</th>
                                        <th className="p-3 px-5 text-left font-semibold">Valore</th>
                                        <th className="p-3 px-5 text-left font-semibold">Squadre</th>
                                        <th className="p-3 px-5 text-center font-semibold">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {players.map((p, idx) => (
                                        <tr 
                                            key={p.id} 
                                            className={`
                                                ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                                                ${p.isEditing ? 'bg-blue-50 ring-2 ring-blue-200' : ''}
                                                hover:bg-gray-100 transition-colors
                                            `}
                                        >
                                            <td className="p-3 px-5 font-medium">{p.id}</td>
                                            <td className="p-3 px-5">{p.lastname}</td>
                                            <td className="p-3 px-5">{p.realteam}</td>
                                            <td className="p-3 px-5">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                    p.role === PlayerRole.P ? 'bg-yellow-100 text-yellow-800' :
                                                    p.role === PlayerRole.D ? 'bg-blue-100 text-blue-800' :
                                                    p.role === PlayerRole.C ? 'bg-green-100 text-green-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                    {p.role}
                                                </span>
                                            </td>
                                            <td className="p-3 px-5">
                                                {p.isEditing ? (
                                                    <input 
                                                        type="number" 
                                                        value={p.value} 
                                                        onChange={e => handleInputChange(p.id, 'value', Number(e.target.value))}
                                                        className="w-24 p-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        min="0"
                                                    />
                                                ) : (
                                                    <span className="font-medium">{p.value.toLocaleString()}</span>
                                                )}
                                            </td>
                                            <td className="p-3 px-5">
                                                <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">
                                                    {p.teamsCount}
                                                </span>
                                            </td>
                                            <td className="p-3 px-5">
                                                <div className="flex justify-center space-x-2">
                                                    {p.isEditing ? (
                                                        <>
                                                            <button 
                                                                className='text-sm bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white py-1 px-2 rounded focus:outline-none focus:ring-2 focus:ring-green-300 transition-colors flex items-center space-x-1' 
                                                                onClick={() => handleSave(p.id)}
                                                                disabled={savingId === p.id}
                                                            >
                                                                {savingId === p.id ? <FaSpinner className="animate-spin" /> : <FaSave />}
                                                            </button>
                                                            <button 
                                                                className='text-sm bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white py-1 px-2 rounded focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors' 
                                                                onClick={() => handleCancel(p.id)}
                                                                disabled={savingId === p.id}
                                                            >
                                                                <FaTimes />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button 
                                                                className='text-sm bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors flex items-center space-x-1' 
                                                                onClick={() => handleEdit(p.id)}
                                                                title="Modifica valore"
                                                            >
                                                                <FaEdit />
                                                            </button>
                                                            <button 
                                                                className='text-sm bg-red-500 hover:bg-red-600 text-white py-1 px-2 rounded focus:outline-none focus:ring-2 focus:ring-red-300 transition-colors' 
                                                                onClick={() => handleDelete(p.id)}
                                                                title="Elimina giocatore"
                                                            >
                                                                <FaTrash />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            
                            {players.length === 0 && !loading && (
                                <div className="text-center py-12 text-gray-500">
                                    <FaSpinner className="mx-auto text-4xl mb-4 text-gray-300" />
                                    <p className="text-xl">Nessun giocatore trovato</p>
                                    <button 
                                        onClick={fetchPlayers}
                                        className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
                                    >
                                        Ricarica
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}