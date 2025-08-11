// components/admin/SquadreAdminTable.tsx
import { TeamWithEditing, TeamsResponse, TeamUpdateRequest, TeamUpdateResponse } from '@/app/lib/types/teams';
import { Team, Girone } from '@prisma/client';
import { useState, useEffect } from 'react';
import { FaEdit, FaSave, FaTimes, FaEye, FaTrash, FaSpinner } from 'react-icons/fa';

export default function TeamAdminTable() {
    const [squadre, setSquadre] = useState<TeamWithEditing[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [savingId, setSavingId] = useState<number | null>(null);

    useEffect(() => { fetchSquadre(); }, []);

    const fetchSquadre = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/teams');
            if (!response.ok) throw new Error('Errore nel caricamento delle squadre');

            const data: TeamsResponse = await response.json();
            setSquadre(data.teams.map(s => ({ ...s, isEditing: false, originalData: { ...s } })));
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Errore sconosciuto');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (id: number) => {
        setSquadre(squadre.map(s => s.id === id ? { ...s, isEditing: true, originalData: { ...s } } : { ...s, isEditing: false }));
    };

    const handleSave = async (id: number) => {
        try {
            setSavingId(id);
            const squadra = squadre.find(s => s.id === id);
            if (!squadra) throw new Error('Squadra non trovata');

            const updateData: TeamUpdateRequest = {
                name: squadra.name,
                girone: squadra.girone,
                credits: squadra.credits
            };
            const response = await fetch(`/api/teams/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                throw new Error('Errore nel salvataggio');
            }

            const result: TeamUpdateResponse = await response.json();
            setSquadre(squadre.map(s => s.id === id ? { ...s, ...result.team, isEditing: false, originalData: result.team } : s));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Errore sconosciuto');
            handleCancel(id);
        } finally {
            setSavingId(null);
        }
    };

    const handleCancel = (id: number) => {
        setSquadre(squadre.map(s => s.id === id ? { ...s.originalData, isEditing: false, originalData: s.originalData } : s));
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Eliminare questa squadra?')) return;
        try {
            const res = await fetch(`/api/teams/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                throw new Error('Errore nell\'eliminazione');
            }
            setSquadre(squadre.filter(s => s.id !== id));
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Errore sconosciuto');
        }
    };

    const handleInputChange = (id: number, field: keyof Team, value: string | number | Girone) => {
        setSquadre(squadre.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const handleViewRosa = (id: number) => {
        console.log(`Visualizza rosa per squadra ${id}`);
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen"><FaSpinner className="animate-spin text-4xl" /></div>;
    if (error) return <div className="text-red-500">{error}</div>;

    return (
        <div className="text-gray-900 bg-gray-200 min-h-screen">
            {/* Header */}
            <div className="p-4 flex justify-between items-center">
                <h1 className="text-3xl font-bold">Gestione Squadre</h1>
                <button onClick={fetchSquadre} className="bg-green-500 text-white px-4 py-2 rounded-lg">🔄 Aggiorna</button>
            </div>

            {/* Table */}
            <div className="px-3 py-4 flex justify-center">
                <div className="w-full overflow-x-auto">
                    <div className="max-h-[500px] overflow-y-auto"> {/* Scroll verticale */}
                        <table className="w-full text-md bg-white shadow-md rounded-lg mb-4">
                            <thead className="sticky top-0 bg-gray-50 z-10">
                                <tr className="border-b">
                                    <th className="p-3 px-5">ID</th>
                                    <th className="p-3 px-5">Nome Squadra</th>
                                    <th className="p-3 px-5">Girone</th>
                                    <th className="p-3 px-5">Crediti</th>
                                    <th className="p-3 px-5">Aggiornata il</th>
                                    <th className="p-3 px-5 text-center">Rosa</th>
                                    <th className="p-3 px-5 text-center">Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {squadre.map((s, idx) => (
                                    <tr key={s.id} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                        <td className="p-3 px-5">{s.id}</td>
                                        <td className="p-3 px-5">
                                            {s.isEditing ? (
                                                <input type="text" value={s.name} onChange={e => handleInputChange(s.id, 'name', e.target.value)} />
                                            ) : s.name}
                                        </td>
                                        <td className="p-3 px-5">
                                            {s.isEditing ? (
                                                <select value={s.girone} onChange={e => handleInputChange(s.id, 'girone', e.target.value as Girone)}>
                                                    <option value={Girone.A}>A</option>
                                                    <option value={Girone.B}>B</option>
                                                    <option value={Girone.C}>C</option>
                                                </select>
                                            ) : s.girone}
                                        </td>
                                        <td className="p-3 px-5">
                                            {s.isEditing ? (
                                                <input type="number" value={s.credits} onChange={e => handleInputChange(s.id, 'credits', Number(e.target.value))} />
                                            ) : s.credits}
                                        </td>
                                        <td className="p-3 px-5">{new Date(s.updatedAt).toLocaleDateString('it-IT')}</td>
                                        <td className="p-3 px-5 text-center">
                                            <button className='text-purple-500' onClick={() => handleViewRosa(s.id)}><FaEye /></button>
                                        </td>
                                        <td className="p-3 px-5 flex justify-center space-x-2">
                                            {s.isEditing ? (
                                                <>
                                                    <button className='text-sm bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white py-1 px-2 rounded focus:outline-none focus:ring-2 focus:ring-green-300 transition-colors flex items-center space-x-1' onClick={() => handleSave(s.id)}><FaSave /></button>
                                                    <button className='text-sm bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white py-1 px-2 rounded focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors' onClick={() => handleCancel(s.id)}><FaTimes /></button>
                                                </>
                                            ) : (
                                                <>
                                                    <button className='text-sm bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors flex items-center space-x-1' onClick={() => handleEdit(s.id)}><FaEdit /></button>
                                                    <button className='text-sm bg-red-500 hover:bg-red-600 text-white py-1 px-2 rounded focus:outline-none focus:ring-2 focus:ring-red-300 transition-colors' onClick={() => handleDelete(s.id)}><FaTrash /></button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {squadre.length === 0 && <div className="text-center py-8">Nessuna squadra trovata</div>}
                    </div>
                </div>
            </div>
        </div>
    );
}
